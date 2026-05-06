# How to Configure Cluster Autoscaler in Rancher

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher, Cluster Autoscaler, Kubernetes, Auto Scaling, AWS, Cost Optimization

Description: Configure the Kubernetes Cluster Autoscaler in Rancher to automatically add and remove worker nodes based on pending pod requests and underutilization.

## Introduction

The Cluster Autoscaler (CA) automatically adjusts the number of nodes in a cluster based on pod scheduling needs. When pods are pending due to insufficient resources, CA adds nodes. When nodes are underutilized, CA removes them. This reduces cloud costs while ensuring applications always have capacity.

## Prerequisites

- Rancher custom cluster running on AWS
- Worker nodes managed by an EC2 Auto Scaling Group
- IAM permissions for the autoscaler to manage Auto Scaling Groups

## Step 1: Configure AWS IAM Policy

The Cluster Autoscaler needs permissions to describe and modify Auto Scaling Groups:

```json
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
        "autoscaling:SetDesiredCapacity",
        "autoscaling:TerminateInstanceInAutoScalingGroup",
        "ec2:DescribeInstanceTypes",
        "ec2:DescribeLaunchTemplateVersions"
      ],
      "Resource": "*"
    }
  ]
}
```

## Step 2: Tag Your Auto Scaling Groups

```bash
# Tag the ASG so the Cluster Autoscaler can discover it

aws autoscaling create-or-update-tags \
  --tags \
    "ResourceId=my-worker-asg,ResourceType=auto-scaling-group,Key=k8s.io/cluster-autoscaler/enabled,Value=true,PropagateAtLaunch=false" \
    "ResourceId=my-worker-asg,ResourceType=auto-scaling-group,Key=k8s.io/cluster-autoscaler/<cluster-name>,Value=true,PropagateAtLaunch=false"
```

## Step 3: Deploy the Cluster Autoscaler

Use the latest Cluster Autoscaler release that matches your Kubernetes minor version.

```yaml
# cluster-autoscaler-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: cluster-autoscaler
  namespace: kube-system
spec:
  replicas: 1
  selector:
    matchLabels:
      app: cluster-autoscaler
  template:
    metadata:
      labels:
        app: cluster-autoscaler
    spec:
      serviceAccountName: cluster-autoscaler
      containers:
        - image: registry.k8s.io/autoscaling/cluster-autoscaler:<your-ca-version>
          name: cluster-autoscaler
          command:
            - ./cluster-autoscaler
            - --v=4
            - --stderrthreshold=info
            - --cloud-provider=aws
            - --skip-nodes-with-local-storage=false
            - --expander=least-waste       # Pick the node group that wastes the least resources
            - --node-group-auto-discovery=asg:tag=k8s.io/cluster-autoscaler/enabled,k8s.io/cluster-autoscaler/<cluster-name>
            - --balance-similar-node-groups  # Keep node groups balanced
            - --scale-down-delay-after-add=10m
            - --scale-down-unneeded-time=10m
          resources:
            requests:
              cpu: 100m
              memory: 300Mi
```

## Step 4: Configure RBAC

```yaml
# cluster-autoscaler-rbac.yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: cluster-autoscaler
  namespace: kube-system
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: cluster-autoscaler
rules:
  - apiGroups: [""]
    resources: ["events", "endpoints"]
    verbs: ["create", "patch"]
  - apiGroups: [""]
    resources: ["pods/eviction"]
    verbs: ["create"]
  - apiGroups: [""]
    resources: ["pods/status"]
    verbs: ["update"]
  - apiGroups: [""]
    resources: ["endpoints"]
    resourceNames: ["cluster-autoscaler"]
    verbs: ["get", "update"]
  - apiGroups: [""]
    resources: ["nodes"]
    verbs: ["watch", "list", "get", "update"]
  - apiGroups: [""]
    resources: ["namespaces", "pods", "services", "replicationcontrollers", "persistentvolumeclaims", "persistentvolumes"]
    verbs: ["watch", "list", "get"]
  - apiGroups: ["apps"]
    resources: ["daemonsets", "replicasets", "statefulsets"]
    verbs: ["watch", "list", "get"]
  - apiGroups: ["extensions"]
    resources: ["daemonsets", "replicasets"]
    verbs: ["watch", "list", "get"]
  - apiGroups: ["policy"]
    resources: ["poddisruptionbudgets"]
    verbs: ["watch", "list"]
  - apiGroups: ["storage.k8s.io"]
    resources: ["csidrivers", "csinodes", "csistoragecapacities", "storageclasses", "volumeattachments"]
    verbs: ["watch", "list", "get"]
  - apiGroups: ["resource.k8s.io"]
    resources: ["deviceclasses", "resourceclaims", "resourceslices"]
    verbs: ["watch", "list", "get"]
  - apiGroups: ["batch", "extensions"]
    resources: ["jobs"]
    verbs: ["get", "list", "watch", "patch"]
  - apiGroups: ["coordination.k8s.io"]
    resources: ["leases"]
    verbs: ["create"]
  - apiGroups: ["coordination.k8s.io"]
    resourceNames: ["cluster-autoscaler"]
    resources: ["leases"]
    verbs: ["get", "update"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: cluster-autoscaler
  namespace: kube-system
rules:
  - apiGroups: [""]
    resources: ["configmaps"]
    verbs: ["create", "list", "watch"]
  - apiGroups: [""]
    resources: ["configmaps"]
    resourceNames: ["cluster-autoscaler-status", "cluster-autoscaler-priority-expander"]
    verbs: ["delete", "get", "update", "watch"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: cluster-autoscaler
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: cluster-autoscaler
subjects:
  - kind: ServiceAccount
    name: cluster-autoscaler
    namespace: kube-system
---
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: cluster-autoscaler
  namespace: kube-system
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: Role
  name: cluster-autoscaler
subjects:
  - kind: ServiceAccount
    name: cluster-autoscaler
    namespace: kube-system
```

## Step 5: Verify Autoscaler Activity

```bash
# Watch autoscaler logs
kubectl logs -n kube-system deployment/cluster-autoscaler -f

# Check scale-up events
kubectl get events -A \
  --field-selector reason=TriggeredScaleUp

# View current cluster nodes
kubectl get nodes
```

## Conclusion

The Cluster Autoscaler on Rancher enables cost-effective elastic infrastructure. Combine it with KEDA for application-level scaling and Pod Disruption Budgets to ensure graceful scale-down during node termination. Set appropriate `--scale-down-delay-after-add`, `--scale-down-delay-after-delete`, and `--scale-down-delay-after-failure` values to prevent thrashing during variable load periods.
