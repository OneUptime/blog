# How to Deploy Cluster Autoscaler with Flux on EKS

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux, Kubernetes, GitOps, AWS, EKS, Cluster Autoscaler, Autoscaling, Helm

Description: Learn how to deploy and configure the Kubernetes Cluster Autoscaler on Amazon EKS using Flux for GitOps-managed node autoscaling.

---

The Kubernetes Cluster Autoscaler automatically adjusts the size of your EKS node groups based on pending pod demands and node utilization. By managing it through Flux, you get a declarative, version-controlled approach to your autoscaling configuration. This guide covers deploying the Cluster Autoscaler on EKS using Flux GitOps workflows.

## Prerequisites

- An existing EKS cluster (version 1.25 or later) with managed node groups
- Flux CLI installed and bootstrapped on your cluster
- AWS CLI configured with appropriate permissions
- kubectl configured to access your EKS cluster

## Step 1: Create an IAM Policy for Cluster Autoscaler

The Cluster Autoscaler needs permissions to inspect and modify Auto Scaling Groups.

```bash
cat <<EOF > cluster-autoscaler-policy.json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "autoscaling:DescribeAutoScalingGroups",
        "autoscaling:DescribeAutoScalingInstances",
        "autoscaling:DescribeLaunchConfigurations",
        "autoscaling:DescribeScalingActivities",
        "autoscaling:DescribeTags",
        "autoscaling:SetDesiredCapacity",
        "autoscaling:TerminateInstanceInAutoScalingGroup",
        "ec2:DescribeImages",
        "ec2:DescribeInstanceTypes",
        "ec2:DescribeLaunchTemplateVersions",
        "ec2:GetInstanceTypesFromInstanceRequirements",
        "eks:DescribeNodegroup"
      ],
      "Resource": "*"
    }
  ]
}
EOF

aws iam create-policy \
  --policy-name ClusterAutoscalerPolicy \
  --policy-document file://cluster-autoscaler-policy.json
```

## Step 2: Create an IAM Service Account

Associate the IAM policy with a Kubernetes service account using IRSA.

```bash
export AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)

eksctl create iamserviceaccount \
  --cluster=my-cluster \
  --namespace=kube-system \
  --name=cluster-autoscaler \
  --attach-policy-arn="arn:aws:iam::${AWS_ACCOUNT_ID}:policy/ClusterAutoscalerPolicy" \
  --override-existing-serviceaccounts \
  --approve
```

## Step 3: Tag Your Auto Scaling Groups

The Cluster Autoscaler discovers node groups using tags. Ensure your Auto Scaling Groups have the correct tags.

```bash
aws autoscaling create-or-update-tags \
  --tags \
    "ResourceId=my-cluster-node-group,ResourceType=auto-scaling-group,Key=k8s.io/cluster-autoscaler/enabled,Value=true,PropagateAtLaunch=true" \
    "ResourceId=my-cluster-node-group,ResourceType=auto-scaling-group,Key=k8s.io/cluster-autoscaler/my-cluster,Value=owned,PropagateAtLaunch=true"
```

## Step 4: Add the Helm Repository Source

Create a Flux `HelmRepository` for the Cluster Autoscaler chart.

```yaml
# clusters/my-cluster/cluster-autoscaler/helmrepository.yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: HelmRepository
metadata:
  name: autoscaler
  namespace: flux-system
spec:
  interval: 24h
  url: https://kubernetes.github.io/autoscaler
```

## Step 5: Create the HelmRelease

Define the `HelmRelease` resource with your cluster-specific configuration.

```yaml
# clusters/my-cluster/cluster-autoscaler/helmrelease.yaml
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: cluster-autoscaler
  namespace: kube-system
spec:
  interval: 1h
  chart:
    spec:
      chart: cluster-autoscaler
      version: "9.37.*"
      sourceRef:
        kind: HelmRepository
        name: autoscaler
        namespace: flux-system
      interval: 24h
  values:
    autoDiscovery:
      clusterName: my-cluster
    awsRegion: us-west-2
    rbac:
      serviceAccount:
        create: false
        name: cluster-autoscaler
    extraArgs:
      balance-similar-node-groups: true
      skip-nodes-with-system-pods: false
      expander: least-waste
      scale-down-delay-after-add: 5m
      scale-down-unneeded-time: 5m
      scale-down-utilization-threshold: "0.5"
      max-node-provision-time: 15m
    resources:
      requests:
        cpu: 100m
        memory: 300Mi
      limits:
        cpu: 500m
        memory: 600Mi
    priorityClassName: system-cluster-critical
    tolerations:
      - key: node-role.kubernetes.io/control-plane
        operator: Exists
        effect: NoSchedule
```

## Step 6: Configure Multiple Node Groups (Optional)

If you have multiple node groups with different instance types, configure the autoscaler to handle them properly with priority-based expansion.

```yaml
# clusters/my-cluster/cluster-autoscaler/priority-expander.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: cluster-autoscaler-priority-expander
  namespace: kube-system
data:
  priorities: |
    50:
      - .*spot.*
    30:
      - .*on-demand.*
    10:
      - .*
```

Update the HelmRelease to use the priority expander:

```yaml
    extraArgs:
      expander: priority
```

## Step 7: Commit and Push to Git

Push all manifests to your Git repository:

```bash
git add -A
git commit -m "Deploy Cluster Autoscaler with Flux"
git push origin main
```

## Step 8: Verify the Deployment

Check that the Cluster Autoscaler is running and discovering your node groups:

```bash
flux get helmreleases -n kube-system

kubectl get pods -n kube-system -l app.kubernetes.io/name=aws-cluster-autoscaler

kubectl logs -n kube-system -l app.kubernetes.io/name=aws-cluster-autoscaler --tail=20
```

You should see log entries showing the autoscaler discovering your Auto Scaling Groups.

## Step 9: Test Autoscaling

Deploy a workload that exceeds your current node capacity:

```bash
kubectl apply -f - <<EOF
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
        - name: pause
          image: registry.k8s.io/pause:3.9
          resources:
            requests:
              cpu: 500m
              memory: 512Mi
EOF
```

Watch the autoscaler add nodes:

```bash
kubectl get nodes -w
```

Clean up:

```bash
kubectl delete deployment scale-test
```

## Tuning Scale-Down Behavior

Adjust scale-down parameters in the HelmRelease to match your workload patterns:

```yaml
    extraArgs:
      scale-down-delay-after-add: 10m
      scale-down-delay-after-delete: 0s
      scale-down-delay-after-failure: 3m
      scale-down-unneeded-time: 10m
      scale-down-utilization-threshold: "0.5"
      max-graceful-termination-sec: "600"
```

These settings control how aggressively the autoscaler removes underutilized nodes. Longer delays provide more stability, while shorter delays save costs.

## Monitoring the Cluster Autoscaler

The Cluster Autoscaler exposes Prometheus metrics. You can view its status through the configmap:

```bash
kubectl get configmap cluster-autoscaler-status -n kube-system -o yaml
```

## Troubleshooting

If the autoscaler is not scaling up, check the following:

```bash
# View autoscaler logs
kubectl logs -n kube-system -l app.kubernetes.io/name=aws-cluster-autoscaler --tail=100

# Check for pending pods
kubectl get pods --field-selector=status.phase=Pending

# Verify ASG tags
aws autoscaling describe-auto-scaling-groups \
  --query "AutoScalingGroups[?contains(Tags[?Key=='k8s.io/cluster-autoscaler/enabled'].Value, 'true')].AutoScalingGroupName"
```

Common issues include missing ASG tags, insufficient IAM permissions, or the ASG maximum size being already reached.

## Conclusion

Deploying the Cluster Autoscaler with Flux on EKS provides a GitOps-driven approach to managing your cluster scaling behavior. All autoscaling configuration, including expander policies, scale-down thresholds, and node group priorities, lives in Git and is automatically reconciled by Flux. This makes your autoscaling setup reproducible, auditable, and consistent across environments.
