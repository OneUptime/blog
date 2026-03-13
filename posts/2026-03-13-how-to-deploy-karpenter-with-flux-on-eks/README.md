# How to Deploy Karpenter with Flux on EKS

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux, Kubernetes, GitOps, AWS, EKS, Karpenter, Autoscaling, Helm

Description: Learn how to deploy and configure Karpenter for intelligent node autoscaling on Amazon EKS using Flux GitOps workflows.

---

Karpenter is an open-source node provisioning project built for Kubernetes. Unlike the Cluster Autoscaler, Karpenter directly provisions EC2 instances based on pending pod requirements, resulting in faster scaling and more efficient instance selection. Deploying Karpenter with Flux on EKS gives you a fully declarative, Git-driven approach to managing your cluster autoscaling. This guide walks through the complete setup.

## Prerequisites

- An existing EKS cluster (version 1.25 or later)
- Flux CLI installed and bootstrapped on your cluster
- AWS CLI configured with appropriate permissions
- kubectl and eksctl installed
- Helm CLI (for initial setup verification)

## Step 1: Set Environment Variables

Define the variables used throughout the setup process.

```bash
export CLUSTER_NAME="my-cluster"
export AWS_REGION="us-west-2"
export AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
export KARPENTER_NAMESPACE="kube-system"
export KARPENTER_VERSION="0.37.0"
```

## Step 2: Create the Karpenter IAM Resources

Karpenter requires two IAM roles: one for the controller pod (via IRSA) and one for the EC2 instances it launches.

Create the node IAM role:

```bash
cat <<EOF > karpenter-node-trust-policy.json
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
  --assume-role-policy-document file://karpenter-node-trust-policy.json

aws iam attach-role-policy \
  --role-name "KarpenterNodeRole-${CLUSTER_NAME}" \
  --policy-arn arn:aws:iam::aws:policy/AmazonEKSWorkerNodePolicy

aws iam attach-role-policy \
  --role-name "KarpenterNodeRole-${CLUSTER_NAME}" \
  --policy-arn arn:aws:iam::aws:policy/AmazonEKS_CNI_Policy

aws iam attach-role-policy \
  --role-name "KarpenterNodeRole-${CLUSTER_NAME}" \
  --policy-arn arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore

aws iam attach-role-policy \
  --role-name "KarpenterNodeRole-${CLUSTER_NAME}" \
  --policy-arn arn:aws:iam::aws:policy/AmazonEC2ContainerRegistryReadOnly
```

Create an instance profile for the node role:

```bash
aws iam create-instance-profile \
  --instance-profile-name "KarpenterNodeInstanceProfile-${CLUSTER_NAME}"

aws iam add-role-to-instance-profile \
  --instance-profile-name "KarpenterNodeInstanceProfile-${CLUSTER_NAME}" \
  --role-name "KarpenterNodeRole-${CLUSTER_NAME}"
```

Create the controller IAM role with IRSA:

```bash
eksctl create iamserviceaccount \
  --cluster="${CLUSTER_NAME}" \
  --name=karpenter \
  --namespace="${KARPENTER_NAMESPACE}" \
  --role-name="KarpenterControllerRole-${CLUSTER_NAME}" \
  --attach-policy-arn="arn:aws:iam::aws:policy/AmazonSSMReadOnlyAccess" \
  --override-existing-serviceaccounts \
  --approve
```

Attach a custom policy for EC2, pricing, and SQS permissions:

```bash
cat <<EOF > karpenter-controller-policy.json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "Karpenter",
      "Effect": "Allow",
      "Action": [
        "ec2:CreateLaunchTemplate",
        "ec2:CreateFleet",
        "ec2:RunInstances",
        "ec2:CreateTags",
        "ec2:TerminateInstances",
        "ec2:DescribeInstances",
        "ec2:DescribeSecurityGroups",
        "ec2:DescribeSubnets",
        "ec2:DescribeInstanceTypes",
        "ec2:DescribeInstanceTypeOfferings",
        "ec2:DescribeAvailabilityZones",
        "ec2:DescribeLaunchTemplates",
        "ec2:DescribeImages",
        "ec2:DescribeSpotPriceHistory",
        "pricing:GetProducts",
        "ssm:GetParameter",
        "iam:PassRole",
        "sqs:*"
      ],
      "Resource": "*"
    }
  ]
}
EOF

aws iam put-role-policy \
  --role-name "KarpenterControllerRole-${CLUSTER_NAME}" \
  --policy-name "KarpenterControllerPolicy" \
  --policy-document file://karpenter-controller-policy.json
```

## Step 3: Tag Subnets and Security Groups

Karpenter uses tags to discover which subnets and security groups to use for launched instances.

```bash
# Tag the subnets
for SUBNET_ID in $(aws ec2 describe-subnets \
  --filters "Name=tag:kubernetes.io/cluster/${CLUSTER_NAME},Values=*" \
  --query "Subnets[].SubnetId" --output text); do
  aws ec2 create-tags \
    --resources "${SUBNET_ID}" \
    --tags "Key=karpenter.sh/discovery,Value=${CLUSTER_NAME}"
done

# Tag the security groups
SECURITY_GROUP_ID=$(aws ec2 describe-security-groups \
  --filters "Name=tag:kubernetes.io/cluster/${CLUSTER_NAME},Values=owned" \
  --query "SecurityGroups[0].GroupId" --output text)

aws ec2 create-tags \
  --resources "${SECURITY_GROUP_ID}" \
  --tags "Key=karpenter.sh/discovery,Value=${CLUSTER_NAME}"
```

## Step 4: Update aws-auth ConfigMap

Allow the Karpenter node role to join the cluster:

```bash
eksctl create iamidentitymapping \
  --cluster "${CLUSTER_NAME}" \
  --arn "arn:aws:iam::${AWS_ACCOUNT_ID}:role/KarpenterNodeRole-${CLUSTER_NAME}" \
  --username system:node:{{EC2PrivateDNSName}} \
  --group system:bootstrappers \
  --group system:nodes
```

## Step 5: Add the Karpenter Helm Repository in Flux

Create the Flux source for the Karpenter Helm chart.

```yaml
# clusters/my-cluster/karpenter/helmrepository.yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: HelmRepository
metadata:
  name: karpenter
  namespace: flux-system
spec:
  type: oci
  interval: 24h
  url: oci://public.ecr.aws/karpenter
```

## Step 6: Create the HelmRelease for Karpenter

Define the `HelmRelease` with your cluster-specific configuration.

```yaml
# clusters/my-cluster/karpenter/helmrelease.yaml
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: karpenter
  namespace: kube-system
spec:
  interval: 1h
  chart:
    spec:
      chart: karpenter
      version: "0.37.*"
      sourceRef:
        kind: HelmRepository
        name: karpenter
        namespace: flux-system
      interval: 24h
  values:
    serviceAccount:
      create: false
      name: karpenter
    settings:
      clusterName: my-cluster
      clusterEndpoint: https://ABCDEF1234567890.gr7.us-west-2.eks.amazonaws.com
      interruptionQueue: my-cluster-karpenter
    replicas: 2
    resources:
      requests:
        cpu: 200m
        memory: 256Mi
      limits:
        cpu: 1
        memory: 1Gi
    topologySpreadConstraints:
      - maxSkew: 1
        topologyKey: topology.kubernetes.io/zone
        whenUnsatisfiable: ScheduleAnyway
```

## Step 7: Create a NodePool and EC2NodeClass

Define the Karpenter provisioning configuration that determines what kinds of instances to launch.

```yaml
# clusters/my-cluster/karpenter/nodepool.yaml
apiVersion: karpenter.sh/v1
kind: NodePool
metadata:
  name: default
spec:
  template:
    spec:
      nodeClassRef:
        group: karpenter.k8s.aws
        kind: EC2NodeClass
        name: default
      requirements:
        - key: "karpenter.k8s.aws/instance-category"
          operator: In
          values: ["c", "m", "r"]
        - key: "karpenter.k8s.aws/instance-generation"
          operator: Gt
          values: ["5"]
        - key: "kubernetes.io/arch"
          operator: In
          values: ["amd64"]
        - key: "karpenter.sh/capacity-type"
          operator: In
          values: ["on-demand", "spot"]
  limits:
    cpu: "100"
    memory: 400Gi
  disruption:
    consolidationPolicy: WhenEmptyOrUnderutilized
    consolidateAfter: 1m
---
apiVersion: karpenter.k8s.aws/v1
kind: EC2NodeClass
metadata:
  name: default
spec:
  role: "KarpenterNodeRole-my-cluster"
  amiSelectorTerms:
    - alias: al2023@latest
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

## Step 8: Commit and Push to Git

Push all the manifests to your Git repository:

```bash
git add -A
git commit -m "Deploy Karpenter with Flux"
git push origin main
```

## Step 9: Verify the Deployment

Check that Karpenter is running and the NodePool is ready:

```bash
flux get helmreleases -n kube-system

kubectl get pods -n kube-system -l app.kubernetes.io/name=karpenter

kubectl get nodepools

kubectl get ec2nodeclasses
```

## Testing Karpenter Autoscaling

Deploy a test workload to trigger Karpenter to provision new nodes:

```bash
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
              memory: 1Gi
EOF
```

Watch Karpenter provision nodes:

```bash
kubectl logs -n kube-system -l app.kubernetes.io/name=karpenter -f
```

Clean up the test:

```bash
kubectl delete deployment inflate
```

## Troubleshooting

If Karpenter is not provisioning nodes, check the controller logs:

```bash
kubectl logs -n kube-system -l app.kubernetes.io/name=karpenter --tail=100

kubectl get events --field-selector reason=FailedScheduling
```

Common issues include missing subnet or security group tags, insufficient IAM permissions, or instance type availability in the selected zones.

## Conclusion

Deploying Karpenter with Flux on EKS gives you a powerful combination of intelligent autoscaling and GitOps-driven configuration management. All provisioning rules, instance constraints, and disruption policies live in Git, making them auditable and reproducible. Karpenter provides faster scaling and better instance selection compared to the traditional Cluster Autoscaler, and Flux ensures your autoscaling configuration stays consistent across environments.
