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

- An EKS cluster running a Kubernetes version supported by your Karpenter release (Karpenter 1.12 supports Kubernetes 1.29 and later)
- kubectl configured for your cluster
- Helm 3 installed
- eksctl installed
- curl and envsubst available
- AWS CLI configured with appropriate permissions

## Step 1: Set Up Environment Variables

Start by defining some variables we'll use throughout the setup:

```bash
# Set environment variables for Karpenter installation

export KARPENTER_NAMESPACE="kube-system"
export KARPENTER_VERSION="1.12.1"
export K8S_VERSION="1.35"
export CLUSTER_NAME="my-cluster"
export AWS_PARTITION="aws"
export AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
export AWS_DEFAULT_REGION="us-west-2"
export TEMPOUT=$(mktemp)
export ALIAS_VERSION="$(aws ssm get-parameter --name "/aws/service/eks/optimized-ami/${K8S_VERSION}/amazon-linux-2023/x86_64/standard/recommended/image_id" --query Parameter.Value | xargs aws ec2 describe-images --query 'Images[0].Name' --image-ids | sed -r 's/^.*(v[[:digit:]]+).*$/\1/')"
```

## Step 2: Create the IAM Roles

Karpenter needs two IAM roles - one for the Karpenter controller pod and one for the nodes it provisions.

Use Karpenter's CloudFormation template to create the node role, SQS interruption queue, and controller IAM policies:

```bash
# Create Karpenter IAM resources
curl -fsSL "https://raw.githubusercontent.com/aws/karpenter-provider-aws/v${KARPENTER_VERSION}/website/content/en/preview/getting-started/getting-started-with-karpenter/cloudformation.yaml" > "${TEMPOUT}" \
  && aws cloudformation deploy \
    --stack-name "Karpenter-${CLUSTER_NAME}" \
    --template-file "${TEMPOUT}" \
    --capabilities CAPABILITY_NAMED_IAM \
    --parameter-overrides "ClusterName=${CLUSTER_NAME}"
```

Now create the controller role using IRSA:

```bash
# Create the IRSA role for the Karpenter controller
eksctl create iamserviceaccount \
  --cluster="${CLUSTER_NAME}" \
  --name="karpenter" \
  --namespace="${KARPENTER_NAMESPACE}" \
  --role-name="${CLUSTER_NAME}-karpenter" \
  --attach-policy-arn="arn:${AWS_PARTITION}:iam::${AWS_ACCOUNT_ID}:policy/KarpenterControllerNodeLifecyclePolicy-${CLUSTER_NAME}" \
  --attach-policy-arn="arn:${AWS_PARTITION}:iam::${AWS_ACCOUNT_ID}:policy/KarpenterControllerIAMIntegrationPolicy-${CLUSTER_NAME}" \
  --attach-policy-arn="arn:${AWS_PARTITION}:iam::${AWS_ACCOUNT_ID}:policy/KarpenterControllerEKSIntegrationPolicy-${CLUSTER_NAME}" \
  --attach-policy-arn="arn:${AWS_PARTITION}:iam::${AWS_ACCOUNT_ID}:policy/KarpenterControllerInterruptionPolicy-${CLUSTER_NAME}" \
  --attach-policy-arn="arn:${AWS_PARTITION}:iam::${AWS_ACCOUNT_ID}:policy/KarpenterControllerResourceDiscoveryPolicy-${CLUSTER_NAME}" \
  --role-only \
  --approve

# Create the EC2 Spot service-linked role if your account has not used Spot before
aws iam create-service-linked-role --aws-service-name spot.amazonaws.com || true
```

## Step 3: Update the aws-auth ConfigMap

Karpenter-launched nodes need to be able to join the cluster. Add the node role to the aws-auth ConfigMap:

```bash
# Add Karpenter node role to aws-auth ConfigMap
eksctl create iamidentitymapping \
  --cluster "${CLUSTER_NAME}" \
  --arn "arn:${AWS_PARTITION}:iam::${AWS_ACCOUNT_ID}:role/KarpenterNodeRole-${CLUSTER_NAME}" \
  --username "system:node:{{EC2PrivateDNSName}}" \
  --group "system:bootstrappers" \
  --group "system:nodes"
```

## Step 4: Install Karpenter with Helm

Install Karpenter from the OCI Helm chart:

```bash
# Install Karpenter using Helm
helm registry logout public.ecr.aws || true

helm upgrade --install karpenter oci://public.ecr.aws/karpenter/karpenter \
  --version "${KARPENTER_VERSION}" \
  --namespace "${KARPENTER_NAMESPACE}" \
  --create-namespace \
  --set "settings.clusterName=${CLUSTER_NAME}" \
  --set "settings.interruptionQueue=${CLUSTER_NAME}" \
  --set controller.resources.requests.cpu=1 \
  --set controller.resources.requests.memory=1Gi \
  --set controller.resources.limits.cpu=1 \
  --set controller.resources.limits.memory=1Gi \
  --set serviceAccount.annotations."eks\.amazonaws\.com/role-arn"="arn:${AWS_PARTITION}:iam::${AWS_ACCOUNT_ID}:role/${CLUSTER_NAME}-karpenter" \
  --wait
```

Verify Karpenter is running:

```bash
# Check that the Karpenter controller is running
kubectl get pods -n kube-system -l app.kubernetes.io/name=karpenter
```

## Step 5: Create a NodePool

NodePools replace the old Provisioner resource. They define what kind of nodes Karpenter can provision.

```yaml
# nodepool.yaml - Define what nodes Karpenter can create
apiVersion: karpenter.sh/v1
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
        - key: kubernetes.io/os
          operator: In
          values: ["linux"]
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
        group: karpenter.k8s.aws
        kind: EC2NodeClass
        name: default
      expireAfter: 720h  # Nodes are recycled after 30 days
  limits:
    cpu: "1000"
    memory: 1000Gi
  disruption:
    consolidationPolicy: WhenEmptyOrUnderutilized
    consolidateAfter: 1m
```

## Step 6: Create an EC2NodeClass

The EC2NodeClass defines AWS-specific settings for nodes:

```yaml
# ec2nodeclass.yaml - AWS-specific node configuration
apiVersion: karpenter.k8s.aws/v1
kind: EC2NodeClass
metadata:
  name: default
spec:
  role: "KarpenterNodeRole-${CLUSTER_NAME}"
  amiSelectorTerms:
    - alias: "al2023@${ALIAS_VERSION}"
  subnetSelectorTerms:
    - tags:
        karpenter.sh/discovery: "${CLUSTER_NAME}"
  securityGroupSelectorTerms:
    - tags:
        karpenter.sh/discovery: "${CLUSTER_NAME}"
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
envsubst < ec2nodeclass.yaml | kubectl apply -f -
```

## Step 7: Tag Your Subnets and Security Groups

Karpenter needs to discover which subnets and security groups to use. Tag them appropriately:

```bash
# Tag subnets for Karpenter discovery
aws ec2 create-tags --resources subnet-0abc123 subnet-0def456 \
  --tags Key=karpenter.sh/discovery,Value="${CLUSTER_NAME}"

# Tag security groups for Karpenter discovery
aws ec2 create-tags --resources sg-0abc123 \
  --tags Key=karpenter.sh/discovery,Value="${CLUSTER_NAME}"
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

One of Karpenter's best features is automatic consolidation. When workloads scale down, Karpenter doesn't just remove empty nodes - it actively replaces underutilized nodes with smaller ones. The `WhenEmptyOrUnderutilized` consolidation policy handles this automatically.

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
