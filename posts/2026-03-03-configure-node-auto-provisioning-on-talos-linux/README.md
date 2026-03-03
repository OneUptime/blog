# How to Configure Node Auto-Provisioning on Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Kubernetes, Node Auto-Provisioning, Karpenter, Scaling, Infrastructure

Description: Learn how to configure automatic node provisioning on Talos Linux using Karpenter to dynamically create the right node types for your workloads.

---

Node auto-provisioning goes beyond traditional cluster autoscaling. Instead of scaling pre-defined node groups, it dynamically provisions nodes with the right instance types, sizes, and configurations based on what your pending workloads actually need. On Talos Linux, this is typically achieved using Karpenter, which works directly with cloud provider APIs to provision nodes that precisely match pod requirements.

This guide covers setting up node auto-provisioning on Talos Linux running in AWS, though the concepts apply to other cloud providers as well.

## Cluster Autoscaler vs Node Auto-Provisioning

The traditional Cluster Autoscaler works with pre-configured Auto Scaling Groups (ASGs). You define node groups with specific instance types, and the autoscaler adds or removes nodes within those groups. This has some limitations:

- You need to pre-select instance types
- All nodes in a group are the same size
- Adding new instance types requires updating ASG configurations
- You might over-provision because the available instance type does not match what pods need

Node auto-provisioning (via Karpenter) takes a different approach:

- It selects instance types dynamically based on pending pod requirements
- It can mix different instance types in the same pool
- It consolidates workloads onto fewer, better-sized nodes
- It can use spot instances and on-demand instances intelligently

## Prerequisites

- A Talos Linux cluster running on AWS (or another supported cloud provider)
- AWS CLI configured with appropriate permissions
- Helm installed
- The cluster must have a way to provision new Talos nodes with the correct machine configuration

## Installing Karpenter

First, set up the required IAM roles and infrastructure:

```bash
# Set your cluster name and region
export CLUSTER_NAME=my-talos-cluster
export AWS_REGION=us-east-1
export AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
export KARPENTER_VERSION=v0.33.0

# Create the Karpenter IAM role
cat > karpenter-trust-policy.json << EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Federated": "arn:aws:iam::${AWS_ACCOUNT_ID}:oidc-provider/oidc.eks.${AWS_REGION}.amazonaws.com/id/YOUR_OIDC_ID"
      },
      "Action": "sts:AssumeRoleWithWebIdentity",
      "Condition": {
        "StringEquals": {
          "oidc.eks.${AWS_REGION}.amazonaws.com/id/YOUR_OIDC_ID:sub": "system:serviceaccount:karpenter:karpenter"
        }
      }
    }
  ]
}
EOF
```

Install Karpenter with Helm:

```bash
# Add the Karpenter Helm repo
helm repo add karpenter https://charts.karpenter.sh
helm repo update

# Install Karpenter
helm install karpenter karpenter/karpenter \
  --namespace karpenter \
  --create-namespace \
  --set serviceAccount.annotations."eks\.amazonaws\.com/role-arn"="arn:aws:iam::${AWS_ACCOUNT_ID}:role/KarpenterControllerRole" \
  --set settings.clusterName=${CLUSTER_NAME} \
  --set settings.clusterEndpoint="https://your-cluster-endpoint.example.com" \
  --set settings.interruptionQueue=${CLUSTER_NAME} \
  --wait
```

Verify Karpenter is running:

```bash
# Check Karpenter pods
kubectl get pods -n karpenter

# Check Karpenter logs
kubectl logs -n karpenter -l app.kubernetes.io/name=karpenter --tail=20
```

## Configuring a NodePool

NodePools define the constraints and requirements for automatically provisioned nodes:

```yaml
# nodepool.yaml
apiVersion: karpenter.sh/v1beta1
kind: NodePool
metadata:
  name: default
spec:
  template:
    metadata:
      labels:
        managed-by: karpenter
        os: talos
    spec:
      requirements:
      # Allow multiple instance categories
      - key: karpenter.sh/capacity-type
        operator: In
        values: ["on-demand", "spot"]
      # Specify allowed instance families
      - key: node.kubernetes.io/instance-type
        operator: In
        values:
        - m5.large
        - m5.xlarge
        - m5.2xlarge
        - m6i.large
        - m6i.xlarge
        - m6i.2xlarge
        - c5.large
        - c5.xlarge
        - r5.large
        - r5.xlarge
      # Architecture
      - key: kubernetes.io/arch
        operator: In
        values: ["amd64"]
      # Availability zones
      - key: topology.kubernetes.io/zone
        operator: In
        values:
        - us-east-1a
        - us-east-1b
        - us-east-1c
      nodeClassRef:
        name: default
  limits:
    # Maximum total resources Karpenter can provision
    cpu: "100"
    memory: 400Gi
  disruption:
    consolidationPolicy: WhenUnderutilized
    expireAfter: 720h  # 30 days
```

## Configuring the EC2NodeClass for Talos

The EC2NodeClass defines how AWS instances should be configured. For Talos Linux, you need to specify a Talos AMI and include the machine configuration in user data:

```yaml
# ec2nodeclass.yaml
apiVersion: karpenter.k8s.aws/v1beta1
kind: EC2NodeClass
metadata:
  name: default
spec:
  # Use the Talos Linux AMI
  amiFamily: Custom
  amiSelectorTerms:
  - tags:
      Name: "talos-v1.6.0-amd64"

  # Subnet selection
  subnetSelectorTerms:
  - tags:
      karpenter.sh/discovery: ${CLUSTER_NAME}

  # Security group selection
  securityGroupSelectorTerms:
  - tags:
      karpenter.sh/discovery: ${CLUSTER_NAME}

  # Instance profile for the nodes
  instanceProfile: "KarpenterNodeInstanceProfile"

  # Block device mappings
  blockDeviceMappings:
  - deviceName: /dev/xvda
    ebs:
      volumeSize: 50Gi
      volumeType: gp3
      encrypted: true

  # Tags for provisioned instances
  tags:
    Environment: production
    ManagedBy: karpenter
    OS: talos-linux

  # User data with Talos machine configuration
  userData: |
    version: v1alpha1
    machine:
      type: worker
      token: your-machine-token
      ca:
        crt: your-ca-certificate
      certSANs: []
      kubelet:
        extraArgs:
          cloud-provider: external
      network: {}
      install:
        disk: /dev/xvda
        image: ghcr.io/siderolabs/installer:v1.6.0
    cluster:
      controlPlane:
        endpoint: https://controlplane.example.com:6443
      network:
        cni:
          name: custom
      token: your-cluster-token
      ca:
        crt: your-cluster-ca
```

```bash
kubectl apply -f nodepool.yaml
kubectl apply -f ec2nodeclass.yaml
```

## Talos Machine Configuration for Karpenter Nodes

The critical part for Talos Linux is ensuring new nodes boot with the correct machine configuration. You have several approaches:

### Using Talos Machine Configuration Server

Deploy a machine configuration server that new nodes contact during boot:

```bash
# Generate worker configuration
talosctl gen config ${CLUSTER_NAME} https://controlplane.example.com:6443 \
  --output-types worker \
  --output worker.yaml

# Store the configuration in a Kubernetes Secret
kubectl create secret generic talos-worker-config \
  --from-file=worker.yaml=worker.yaml \
  --namespace karpenter
```

### Using Launch Templates

Create an AWS Launch Template with Talos configuration embedded:

```bash
# Encode the Talos machine config as base64 for user data
TALOS_CONFIG_B64=$(base64 -w0 worker.yaml)

# Create a launch template
aws ec2 create-launch-template \
  --launch-template-name talos-karpenter-workers \
  --launch-template-data "{
    \"UserData\": \"${TALOS_CONFIG_B64}\",
    \"TagSpecifications\": [{
      \"ResourceType\": \"instance\",
      \"Tags\": [{\"Key\": \"OS\", \"Value\": \"talos-linux\"}]
    }]
  }"
```

## Testing Node Auto-Provisioning

Deploy a workload that requires more resources than currently available:

```yaml
# scale-test.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: scale-test
spec:
  replicas: 20
  selector:
    matchLabels:
      app: scale-test
  template:
    metadata:
      labels:
        app: scale-test
    spec:
      containers:
      - name: test
        image: nginx:1.25
        resources:
          requests:
            cpu: "1"
            memory: "1Gi"
      # Optional: prefer spot instances
      topologySpreadConstraints:
      - maxSkew: 1
        topologyKey: topology.kubernetes.io/zone
        whenUnsatisfiable: DoNotSchedule
        labelSelector:
          matchLabels:
            app: scale-test
```

```bash
# Deploy the test workload
kubectl apply -f scale-test.yaml

# Watch Karpenter provision nodes
kubectl logs -n karpenter -l app.kubernetes.io/name=karpenter -f

# Watch new nodes appear
kubectl get nodes -w

# Check pending pods getting scheduled
kubectl get pods -l app=scale-test -w
```

## Node Consolidation

Karpenter can consolidate workloads onto fewer nodes to reduce costs:

```yaml
spec:
  disruption:
    # Consolidate when nodes are underutilized
    consolidationPolicy: WhenUnderutilized

    # Or consolidate after a specific time
    # consolidationPolicy: WhenEmpty
    # consolidateAfter: 30s
```

When consolidation is enabled, Karpenter will:

1. Identify nodes that are underutilized
2. Find a more efficient combination of instance types
3. Gracefully drain and terminate the old nodes
4. Schedule pods on the new, better-sized nodes

## Monitoring Karpenter

```bash
# View provisioned nodes managed by Karpenter
kubectl get nodes -l managed-by=karpenter

# Check NodePool status
kubectl describe nodepool default

# View Karpenter metrics (if Prometheus is installed)
kubectl port-forward -n karpenter svc/karpenter 8080:8080 &
curl http://localhost:8080/metrics | grep karpenter

# Check for provisioning errors
kubectl get events -n karpenter --sort-by='.lastTimestamp'
```

## Spot Instance Handling

Karpenter handles spot instance interruptions gracefully on Talos Linux:

```yaml
spec:
  template:
    spec:
      requirements:
      - key: karpenter.sh/capacity-type
        operator: In
        values: ["spot", "on-demand"]
  disruption:
    consolidationPolicy: WhenUnderutilized
    # Karpenter will proactively move workloads off spot instances
    # when interruption notices are received
```

## Wrapping Up

Node auto-provisioning with Karpenter on Talos Linux gives you intelligent, workload-aware node scaling. The key challenge is ensuring new nodes get the correct Talos machine configuration, which you can solve with launch templates, machine configuration servers, or user data embedding. Once configured, Karpenter selects optimal instance types, manages spot instances, and consolidates workloads automatically, reducing both cost and operational overhead.
