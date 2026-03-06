# How to Set Up Flux CD on Amazon EKS with Karpenter

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, Amazon eks, Karpenter, Autoscaling, Node Provisioning, Kubernetes, GitOps

Description: Deploy and manage Karpenter on Amazon EKS using Flux CD for GitOps-driven node autoscaling with NodePool and EC2NodeClass configuration.

---

## Introduction

Karpenter is a high-performance Kubernetes node autoscaler that provisions the right compute resources in response to pending pods. Unlike the Cluster Autoscaler, Karpenter works directly with the AWS EC2 fleet API for faster node provisioning and better cost optimization. Managing Karpenter through Flux CD ensures your autoscaling configuration is version-controlled and consistently applied.

This guide covers deploying Karpenter via Flux CD, configuring NodePools and EC2NodeClasses, and setting up efficient node provisioning strategies.

## Prerequisites

Before starting, ensure you have:

- An Amazon EKS cluster running Kubernetes 1.27 or later
- Flux CD installed and bootstrapped
- AWS CLI configured with appropriate permissions
- An OIDC provider associated with your EKS cluster
- At least one managed node group for initial Flux controller scheduling

## Step 1: Create IAM Resources for Karpenter

Karpenter requires two IAM roles: one for the controller and one for the nodes it provisions.

### Node IAM Role

```bash
# Create the IAM role for Karpenter-provisioned nodes
cat > karpenter-node-trust-policy.json <<EOF
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
  --role-name KarpenterNodeRole-my-cluster \
  --assume-role-policy-document file://karpenter-node-trust-policy.json

# Attach required policies for EKS worker nodes
aws iam attach-role-policy \
  --role-name KarpenterNodeRole-my-cluster \
  --policy-arn arn:aws:iam::aws:policy/AmazonEKSWorkerNodePolicy

aws iam attach-role-policy \
  --role-name KarpenterNodeRole-my-cluster \
  --policy-arn arn:aws:iam::aws:policy/AmazonEKS_CNI_Policy

aws iam attach-role-policy \
  --role-name KarpenterNodeRole-my-cluster \
  --policy-arn arn:aws:iam::aws:policy/AmazonEC2ContainerRegistryReadOnly

aws iam attach-role-policy \
  --role-name KarpenterNodeRole-my-cluster \
  --policy-arn arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore

# Create an instance profile for the node role
aws iam create-instance-profile \
  --instance-profile-name KarpenterNodeInstanceProfile-my-cluster

aws iam add-role-to-instance-profile \
  --instance-profile-name KarpenterNodeInstanceProfile-my-cluster \
  --role-name KarpenterNodeRole-my-cluster
```

### Controller IAM Role (IRSA)

```bash
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
OIDC_PROVIDER=$(aws eks describe-cluster \
  --name my-cluster \
  --query "cluster.identity.oidc.issuer" \
  --output text | sed 's|https://||')

# Create trust policy for Karpenter controller
cat > karpenter-controller-trust-policy.json <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Federated": "arn:aws:iam::${ACCOUNT_ID}:oidc-provider/${OIDC_PROVIDER}"
      },
      "Action": "sts:AssumeRoleWithWebIdentity",
      "Condition": {
        "StringEquals": {
          "${OIDC_PROVIDER}:sub": "system:serviceaccount:kube-system:karpenter",
          "${OIDC_PROVIDER}:aud": "sts.amazonaws.com"
        }
      }
    }
  ]
}
EOF

aws iam create-role \
  --role-name KarpenterControllerRole-my-cluster \
  --assume-role-policy-document file://karpenter-controller-trust-policy.json
```

### Controller IAM Policy

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "KarpenterEC2",
      "Effect": "Allow",
      "Action": [
        "ec2:CreateLaunchTemplate",
        "ec2:CreateFleet",
        "ec2:CreateTags",
        "ec2:DescribeLaunchTemplates",
        "ec2:DescribeInstances",
        "ec2:DescribeSecurityGroups",
        "ec2:DescribeSubnets",
        "ec2:DescribeInstanceTypes",
        "ec2:DescribeInstanceTypeOfferings",
        "ec2:DescribeAvailabilityZones",
        "ec2:DescribeImages",
        "ec2:DescribeSpotPriceHistory",
        "ec2:RunInstances",
        "ec2:TerminateInstances",
        "ec2:DeleteLaunchTemplate"
      ],
      "Resource": "*"
    },
    {
      "Sid": "KarpenterPassRole",
      "Effect": "Allow",
      "Action": "iam:PassRole",
      "Resource": "arn:aws:iam::*:role/KarpenterNodeRole-*"
    },
    {
      "Sid": "KarpenterSSM",
      "Effect": "Allow",
      "Action": "ssm:GetParameter",
      "Resource": "arn:aws:ssm:*:*:parameter/aws/service/*"
    },
    {
      "Sid": "KarpenterPricing",
      "Effect": "Allow",
      "Action": [
        "pricing:GetProducts"
      ],
      "Resource": "*"
    },
    {
      "Sid": "KarpenterSQS",
      "Effect": "Allow",
      "Action": [
        "sqs:DeleteMessage",
        "sqs:GetQueueUrl",
        "sqs:ReceiveMessage"
      ],
      "Resource": "arn:aws:sqs:*:*:karpenter-*"
    },
    {
      "Sid": "KarpenterEKS",
      "Effect": "Allow",
      "Action": [
        "eks:DescribeCluster"
      ],
      "Resource": "arn:aws:eks:*:*:cluster/*"
    }
  ]
}
```

```bash
# Create and attach the controller policy
aws iam create-policy \
  --policy-name KarpenterControllerPolicy-my-cluster \
  --policy-document file://karpenter-controller-policy.json

aws iam attach-role-policy \
  --role-name KarpenterControllerRole-my-cluster \
  --policy-arn arn:aws:iam::${ACCOUNT_ID}:policy/KarpenterControllerPolicy-my-cluster
```

## Step 2: Tag Subnets and Security Groups

Karpenter uses tags to discover subnets and security groups.

```bash
# Tag private subnets for Karpenter
aws ec2 create-tags \
  --resources subnet-0abcdef1234567890 subnet-0abcdef1234567891 \
  --tags Key=karpenter.sh/discovery,Value=my-cluster

# Tag the cluster security group
CLUSTER_SG=$(aws eks describe-cluster \
  --name my-cluster \
  --query "cluster.resourcesVpcConfig.clusterSecurityGroupId" \
  --output text)

aws ec2 create-tags \
  --resources "$CLUSTER_SG" \
  --tags Key=karpenter.sh/discovery,Value=my-cluster
```

## Step 3: Create an SQS Queue for Interruption Handling

```bash
# Create SQS queue for spot interruption and instance state change events
aws sqs create-queue \
  --queue-name karpenter-my-cluster \
  --attributes '{"MessageRetentionPeriod":"300","SqsManagedSseEnabled":"true"}'
```

## Step 4: Deploy Karpenter via Flux HelmRelease

```yaml
# infrastructure/karpenter/helm-repo.yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: HelmRepository
metadata:
  name: karpenter
  namespace: flux-system
spec:
  interval: 1h
  type: oci
  url: oci://public.ecr.aws/karpenter
```

```yaml
# infrastructure/karpenter/karpenter.yaml
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: karpenter
  namespace: kube-system
spec:
  interval: 15m
  chart:
    spec:
      chart: karpenter
      version: "1.0.x"
      sourceRef:
        kind: HelmRepository
        name: karpenter
        namespace: flux-system
  install:
    remediation:
      retries: 3
  upgrade:
    remediation:
      retries: 3
  values:
    # Cluster configuration
    settings:
      clusterName: my-cluster
      clusterEndpoint: https://ABCDEF1234567890.gr7.us-east-1.eks.amazonaws.com
      # SQS queue for interruption handling
      interruptionQueue: karpenter-my-cluster
    # Service account with IRSA
    serviceAccount:
      annotations:
        eks.amazonaws.com/role-arn: arn:aws:iam::123456789012:role/KarpenterControllerRole-my-cluster
    # Run on managed node group, not on Karpenter-provisioned nodes
    affinity:
      nodeAffinity:
        requiredDuringSchedulingIgnoredDuringExecution:
          nodeSelectorTerms:
            - matchExpressions:
                - key: karpenter.sh/nodepool
                  operator: DoesNotExist
    # High availability with two replicas
    replicas: 2
    # Resource allocation
    resources:
      requests:
        cpu: 200m
        memory: 256Mi
      limits:
        cpu: 500m
        memory: 512Mi
    # Topology spread for HA
    topologySpreadConstraints:
      - maxSkew: 1
        topologyKey: topology.kubernetes.io/zone
        whenUnsatisfiable: ScheduleAnyway
```

## Step 5: Create an EC2NodeClass

Define the EC2NodeClass that specifies how nodes should be configured.

```yaml
# infrastructure/karpenter/ec2nodeclass-default.yaml
apiVersion: karpenter.k8s.aws/v1
kind: EC2NodeClass
metadata:
  name: default
spec:
  # IAM role for provisioned nodes
  role: KarpenterNodeRole-my-cluster
  # AMI selector - use the latest EKS-optimized AMI
  amiSelectorTerms:
    - alias: al2023@latest
  # Subnet selector - use tagged subnets
  subnetSelectorTerms:
    - tags:
        karpenter.sh/discovery: my-cluster
  # Security group selector
  securityGroupSelectorTerms:
    - tags:
        karpenter.sh/discovery: my-cluster
  # Block device mappings
  blockDeviceMappings:
    - deviceName: /dev/xvda
      ebs:
        volumeSize: 100Gi
        volumeType: gp3
        iops: 3000
        throughput: 125
        encrypted: true
        deleteOnTermination: true
  # User data for node bootstrapping
  userData: |
    #!/bin/bash
    # Custom node initialization
    echo "Node provisioned by Karpenter" > /tmp/karpenter-init
  # Tags applied to provisioned instances
  tags:
    Environment: production
    ManagedBy: karpenter
    Team: platform
  # Metadata options for security
  metadataOptions:
    httpEndpoint: enabled
    httpProtocolIPv6: disabled
    httpPutResponseHopLimit: 1
    httpTokens: required
```

## Step 6: Create NodePools

Define NodePools for different workload types.

```yaml
# infrastructure/karpenter/nodepool-general.yaml
# General-purpose NodePool for most workloads
apiVersion: karpenter.sh/v1
kind: NodePool
metadata:
  name: general
spec:
  template:
    metadata:
      labels:
        workload-type: general
    spec:
      # Reference the EC2NodeClass
      nodeClassRef:
        group: karpenter.k8s.aws
        kind: EC2NodeClass
        name: default
      # Instance type requirements
      requirements:
        # Use multiple instance families for availability
        - key: karpenter.k8s.aws/instance-family
          operator: In
          values: ["m6i", "m6a", "m7i", "m7a"]
        # Instance sizes
        - key: karpenter.k8s.aws/instance-size
          operator: In
          values: ["large", "xlarge", "2xlarge"]
        # Use on-demand and spot instances
        - key: karpenter.sh/capacity-type
          operator: In
          values: ["on-demand", "spot"]
        # Availability zones
        - key: topology.kubernetes.io/zone
          operator: In
          values: ["us-east-1a", "us-east-1b", "us-east-1c"]
        # Architecture
        - key: kubernetes.io/arch
          operator: In
          values: ["amd64"]
      # Expire nodes after 7 days for security patching
      expireAfter: 168h
  # Resource limits for this NodePool
  limits:
    cpu: "200"
    memory: 800Gi
  # Disruption configuration
  disruption:
    # Consolidation policy to save costs
    consolidationPolicy: WhenEmptyOrUnderutilized
    # Wait 30 seconds before consolidating
    consolidateAfter: 30s
  # Weight for scheduling priority (higher = preferred)
  weight: 50
```

```yaml
# infrastructure/karpenter/nodepool-spot.yaml
# Spot-optimized NodePool for fault-tolerant workloads
apiVersion: karpenter.sh/v1
kind: NodePool
metadata:
  name: spot-workers
spec:
  template:
    metadata:
      labels:
        workload-type: spot
      annotations:
        # Mark nodes for spot-tolerant workloads
        karpenter.sh/do-not-disrupt: "false"
    spec:
      nodeClassRef:
        group: karpenter.k8s.aws
        kind: EC2NodeClass
        name: default
      requirements:
        # Wide range of instance families for spot availability
        - key: karpenter.k8s.aws/instance-family
          operator: In
          values: ["m6i", "m6a", "m7i", "m7a", "c6i", "c6a", "c7i", "r6i", "r6a"]
        - key: karpenter.k8s.aws/instance-size
          operator: In
          values: ["large", "xlarge", "2xlarge", "4xlarge"]
        # Spot only
        - key: karpenter.sh/capacity-type
          operator: In
          values: ["spot"]
        - key: topology.kubernetes.io/zone
          operator: In
          values: ["us-east-1a", "us-east-1b", "us-east-1c"]
      # Taints to ensure only spot-tolerant workloads schedule here
      taints:
        - key: karpenter.sh/capacity-type
          value: spot
          effect: NoSchedule
      expireAfter: 72h
  limits:
    cpu: "100"
    memory: 400Gi
  disruption:
    consolidationPolicy: WhenEmptyOrUnderutilized
    consolidateAfter: 30s
  weight: 10
```

## Step 7: Create the Flux Kustomization

```yaml
# infrastructure/karpenter/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - helm-repo.yaml
  - karpenter.yaml
  - ec2nodeclass-default.yaml
  - nodepool-general.yaml
  - nodepool-spot.yaml
```

```yaml
# clusters/my-cluster/karpenter.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: karpenter
  namespace: flux-system
spec:
  interval: 10m
  sourceRef:
    kind: GitRepository
    name: fleet-infra
  path: ./infrastructure/karpenter
  prune: true
  wait: true
  timeout: 10m
```

## Step 8: Deploy a Workload to Test Karpenter

```yaml
# test/inflate-deployment.yaml
# Deploy a workload that triggers Karpenter to provision nodes
apiVersion: apps/v1
kind: Deployment
metadata:
  name: inflate
  namespace: default
spec:
  replicas: 5
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
              # Each pod requests 1 CPU - this will trigger node provisioning
              cpu: "1"
              memory: 256Mi
      # Tolerate spot nodes
      tolerations:
        - key: karpenter.sh/capacity-type
          value: spot
          effect: NoSchedule
```

## Step 9: Verify Karpenter Deployment

```bash
# Check Karpenter controller is running
kubectl get pods -n kube-system -l app.kubernetes.io/name=karpenter

# Check NodePools
kubectl get nodepools

# Check EC2NodeClasses
kubectl get ec2nodeclasses

# Watch Karpenter provision nodes
kubectl logs -n kube-system -l app.kubernetes.io/name=karpenter -f --tail=50

# Check provisioned nodes
kubectl get nodes -l karpenter.sh/nodepool=general

# Check node details
kubectl describe node <karpenter-node-name> | grep -A5 "Labels"
```

## Step 10: Monitor Karpenter

```bash
# Check Karpenter metrics
kubectl port-forward -n kube-system svc/karpenter 8080:8080
# Visit http://localhost:8080/metrics

# Key metrics to monitor:
# karpenter_nodes_created - total nodes provisioned
# karpenter_nodes_terminated - total nodes removed
# karpenter_pods_startup_duration_seconds - time from pending to running
# karpenter_nodeclaims_disrupted - disruption events
```

## Troubleshooting

```bash
# Issue: Pods stuck in Pending state
# Check Karpenter controller logs for provisioning errors
kubectl logs -n kube-system -l app.kubernetes.io/name=karpenter --tail=100 | grep -i error

# Issue: Nodes not joining the cluster
# Verify the node IAM role is in the aws-auth ConfigMap
kubectl get configmap aws-auth -n kube-system -o yaml

# Issue: Karpenter not selecting expected instance types
# Check NodePool requirements and available capacity
kubectl describe nodepool general

# Issue: Spot interruptions causing issues
# Verify the SQS queue is configured correctly
aws sqs get-queue-attributes \
  --queue-url https://sqs.us-east-1.amazonaws.com/123456789012/karpenter-my-cluster \
  --attribute-names All

# Issue: Consolidation too aggressive
# Adjust consolidateAfter or switch to WhenEmpty policy
```

## Conclusion

Deploying Karpenter through Flux CD provides a GitOps-driven approach to Kubernetes node autoscaling on EKS. By defining NodePools and EC2NodeClasses as Kubernetes resources stored in Git, you get version-controlled, reviewable changes to your autoscaling configuration. Karpenter responds quickly to pending pods by provisioning right-sized nodes directly through the EC2 fleet API, and the consolidation policies ensure you are not paying for unused capacity. Combined with Flux CD's reconciliation, any configuration drift is automatically corrected.
