# How to Use Karpenter for EKS Node Provisioning

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, EKS, Kubernetes, Karpenter, Autoscaling

Description: Learn how to install and configure Karpenter on Amazon EKS for fast, flexible, and cost-efficient automatic node provisioning.

---

Karpenter is AWS's answer to the limitations of the traditional Cluster Autoscaler. Instead of relying on pre-configured Auto Scaling Groups, Karpenter provisions nodes directly through the EC2 Fleet API. It picks the right instance type, the right availability zone, and the right purchase option (on-demand or spot) for each workload. The result is faster scaling, better bin-packing, and lower costs.

If you've been running the Cluster Autoscaler and found it slow or inflexible, Karpenter is worth a serious look.

## How Karpenter Differs from Cluster Autoscaler

The key difference is architecture. The [Cluster Autoscaler](https://oneuptime.com/blog/post/2026-02-12-configure-eks-cluster-autoscaler/view) works with Auto Scaling Groups - you define node groups ahead of time, and the autoscaler adjusts their size. Karpenter skips ASGs entirely. It watches for unschedulable pods, determines what instance type would best fit the workload, and launches EC2 instances directly.

This means:
- Faster provisioning (typically under 60 seconds vs. several minutes)
- Automatic instance type selection from a wide pool
- Better spot instance handling with automatic fallback
- No need to pre-define node groups for different workload shapes

## Prerequisites

Before installing Karpenter, you'll need:

- An EKS cluster running Kubernetes 1.25 or later
- kubectl configured for your cluster
- Helm 3 installed
- AWS CLI configured with appropriate permissions

## Step 1: Set Up Environment Variables

Start by defining some variables we'll use throughout the setup:

```bash
# Set environment variables for Karpenter installation
export KARPENTER_NAMESPACE="kube-system"
export KARPENTER_VERSION="0.35.0"
export CLUSTER_NAME="my-cluster"
export AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
export AWS_REGION="us-west-2"
export TEMPOUT=$(mktemp)
```

## Step 2: Create the IAM Roles

Karpenter needs two IAM roles - one for the Karpenter controller pod and one for the nodes it provisions.

First, create the node role. Nodes launched by Karpenter need to join the cluster and pull container images:

```bash
# Create the IAM role for Karpenter-provisioned nodes
cat <<EOF > node-trust-policy.json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Service": "ec2.amazonaws.com"
      },
      "Action": "sts:AssumeRole"
    }
  ]
}
EOF

aws iam create-role \
  --role-name "KarpenterNodeRole-${CLUSTER_NAME}" \
  --assume-role-policy-document file://node-trust-policy.json

# Attach required policies to the node role
aws iam attach-role-policy --role-name "KarpenterNodeRole-${CLUSTER_NAME}" \
  --policy-arn arn:aws:iam::aws:policy/AmazonEKSWorkerNodePolicy
aws iam attach-role-policy --role-name "KarpenterNodeRole-${CLUSTER_NAME}" \
  --policy-arn arn:aws:iam::aws:policy/AmazonEKS_CNI_Policy
aws iam attach-role-policy --role-name "KarpenterNodeRole-${CLUSTER_NAME}" \
  --policy-arn arn:aws:iam::aws:policy/AmazonEC2ContainerRegistryReadOnly
aws iam attach-role-policy --role-name "KarpenterNodeRole-${CLUSTER_NAME}" \
  --policy-arn arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore
```

Create an instance profile for the node role:

```bash
# Create instance profile for Karpenter nodes
aws iam create-instance-profile --instance-profile-name "KarpenterNodeInstanceProfile-${CLUSTER_NAME}"
aws iam add-role-to-instance-profile --instance-profile-name "KarpenterNodeInstanceProfile-${CLUSTER_NAME}" \
  --role-name "KarpenterNodeRole-${CLUSTER_NAME}"
```

Now create the controller role using IRSA:

```bash
# Create the IRSA role for the Karpenter controller
eksctl create iamserviceaccount \
  --cluster="${CLUSTER_NAME}" \
  --name="karpenter" \
  --namespace="${KARPENTER_NAMESPACE}" \
  --attach-policy-arn="arn:aws:iam::${AWS_ACCOUNT_ID}:policy/KarpenterControllerPolicy-${CLUSTER_NAME}" \
  --approve
```

## Step 3: Update the aws-auth ConfigMap

Karpenter-launched nodes need to be able to join the cluster. Add the node role to the aws-auth ConfigMap:

```bash
# Add Karpenter node role to aws-auth ConfigMap
eksctl create iamidentitymapping \
  --cluster "${CLUSTER_NAME}" \
  --arn "arn:aws:iam::${AWS_ACCOUNT_ID}:role/KarpenterNodeRole-${CLUSTER_NAME}" \
  --username "system:node:{{EC2PrivateDNSName}}" \
  --group "system:bootstrappers" \
  --group "system:nodes"
```

## Step 4: Install Karpenter with Helm

Add the Karpenter Helm repository and install:

```bash
# Install Karpenter using Helm
helm registry logout public.ecr.aws || true

helm upgrade --install karpenter oci://public.ecr.aws/karpenter/karpenter \
  --version "${KARPENTER_VERSION}" \
  --namespace "${KARPENTER_NAMESPACE}" \
  --set "settings.clusterName=${CLUSTER_NAME}" \
  --set "settings.interruptionQueue=${CLUSTER_NAME}" \
  --set controller.resources.requests.cpu=1 \
  --set controller.resources.requests.memory=1Gi \
  --set controller.resources.limits.cpu=1 \
  --set controller.resources.limits.memory=1Gi \
  --wait
```

Verify Karpenter is running:

```bash
# Check that the Karpenter controller is running
kubectl get pods -n kube-system -l app.kubernetes.io/name=karpenter
```

## Step 5: Create a NodePool

NodePools replace the old Provisioner resource (which was deprecated in v0.33). They define what kind of nodes Karpenter can provision.

```yaml
# nodepool.yaml - Define what nodes Karpenter can create
apiVersion: karpenter.sh/v1beta1
kind: NodePool
metadata:
  name: default
spec:
  template:
    spec:
      requirements:
        - key: kubernetes.io/arch
          operator: In
          values: ["amd64"]
        - key: karpenter.sh/capacity-type
          operator: In
          values: ["on-demand", "spot"]
        - key: karpenter.k8s.aws/instance-category
          operator: In
          values: ["c", "m", "r"]
        - key: karpenter.k8s.aws/instance-generation
          operator: Gt
          values: ["4"]
      nodeClassRef:
        apiVersion: karpenter.k8s.aws/v1beta1
        kind: EC2NodeClass
        name: default
  limits:
    cpu: "1000"
    memory: 1000Gi
  disruption:
    consolidationPolicy: WhenUnderutilized
    expireAfter: 720h  # Nodes are recycled after 30 days
```

## Step 6: Create an EC2NodeClass

The EC2NodeClass defines AWS-specific settings for nodes:

```yaml
# ec2nodeclass.yaml - AWS-specific node configuration
apiVersion: karpenter.k8s.aws/v1beta1
kind: EC2NodeClass
metadata:
  name: default
spec:
  amiFamily: AL2
  role: "KarpenterNodeRole-my-cluster"
  subnetSelectorTerms:
    - tags:
        karpenter.sh/discovery: my-cluster
  securityGroupSelectorTerms:
    - tags:
        karpenter.sh/discovery: my-cluster
  blockDeviceMappings:
    - deviceName: /dev/xvda
      ebs:
        volumeSize: 100Gi
        volumeType: gp3
        encrypted: true
```

Apply both resources:

```bash
# Create the NodePool and EC2NodeClass
kubectl apply -f nodepool.yaml
kubectl apply -f ec2nodeclass.yaml
```

## Step 7: Tag Your Subnets and Security Groups

Karpenter needs to discover which subnets and security groups to use. Tag them appropriately:

```bash
# Tag subnets for Karpenter discovery
aws ec2 create-tags --resources subnet-0abc123 subnet-0def456 \
  --tags Key=karpenter.sh/discovery,Value=my-cluster

# Tag security groups for Karpenter discovery
aws ec2 create-tags --resources sg-0abc123 \
  --tags Key=karpenter.sh/discovery,Value=my-cluster
```

## Testing Karpenter

Deploy a workload and watch Karpenter provision nodes:

```bash
# Deploy a test workload to trigger Karpenter scaling
kubectl apply -f - <<EOF
apiVersion: apps/v1
kind: Deployment
metadata:
  name: inflate
spec:
  replicas: 10
  selector:
    matchLabels:
      app: inflate
  template:
    metadata:
      labels:
        app: inflate
    spec:
      containers:
        - name: inflate
          image: public.ecr.aws/eks-distro/kubernetes/pause:3.7
          resources:
            requests:
              cpu: "1"
              memory: "1.5Gi"
EOF

# Watch Karpenter's logs to see it provisioning
kubectl logs -n kube-system -l app.kubernetes.io/name=karpenter -f
```

You should see Karpenter detect the pending pods, select an appropriate instance type, and launch a node - all within about a minute.

## Consolidation

One of Karpenter's best features is automatic consolidation. When workloads scale down, Karpenter doesn't just remove empty nodes - it actively replaces underutilized nodes with smaller ones. The `WhenUnderutilized` consolidation policy handles this automatically.

You can also use `WhenEmpty` if you only want nodes removed when they have no workloads:

```yaml
# Conservative consolidation - only remove empty nodes
disruption:
  consolidationPolicy: WhenEmpty
  consolidateAfter: 30s
```

## Spot Instance Handling

Karpenter handles spot interruptions gracefully. When AWS sends a spot interruption notice, Karpenter cordons and drains the node, then provisions a replacement. To enable this, make sure you've set up an SQS queue for interruption events.

The combination of spot instances and Karpenter's fast provisioning makes it one of the most cost-effective ways to run Kubernetes on AWS. For more on optimizing costs, see our guide on [monitoring EKS costs](https://oneuptime.com/blog/post/2026-02-12-monitor-eks-costs-and-optimize-spending/view).

Karpenter has become the preferred node provisioning solution for EKS, and once you see how quickly it responds to scaling demands, it's easy to understand why.
