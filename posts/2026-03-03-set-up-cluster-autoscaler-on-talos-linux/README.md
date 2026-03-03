# How to Set Up Cluster Autoscaler on Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Kubernetes, Cluster Autoscaler, Scaling, Cloud Native, Infrastructure

Description: Step-by-step guide to deploying and configuring the Kubernetes Cluster Autoscaler on Talos Linux for automatic node scaling based on workload demand.

---

The Cluster Autoscaler is a Kubernetes component that automatically adjusts the number of nodes in your cluster based on resource demand. When pods cannot be scheduled because there are not enough resources, the Cluster Autoscaler adds nodes. When nodes are underutilized, it removes them. On Talos Linux, setting up the Cluster Autoscaler requires some specific considerations because of how Talos handles node provisioning and its API-driven configuration model.

This guide walks through deploying the Cluster Autoscaler on a Talos Linux cluster running on a cloud provider.

## How the Cluster Autoscaler Works

The Cluster Autoscaler runs as a Deployment in your cluster and monitors for two conditions:

1. **Scale up**: Pods are in a Pending state because there are not enough resources (CPU, memory) on existing nodes to schedule them.
2. **Scale down**: Nodes have been underutilized for a configurable period (default 10 minutes) and their pods can be moved to other nodes.

The autoscaler communicates with your cloud provider's API to add or remove virtual machines from the node pool.

## Prerequisites

- A Talos Linux cluster running on a supported cloud provider (AWS, GCP, Azure, or similar)
- Cloud provider credentials with permissions to manage instances
- `kubectl` and `talosctl` configured
- Nodes organized in managed instance groups or auto-scaling groups

```bash
# Verify your cluster is healthy
kubectl get nodes
kubectl cluster-info
```

## Setting Up on AWS

For AWS, the Cluster Autoscaler integrates with Auto Scaling Groups (ASGs). First, ensure your Talos worker nodes are part of an ASG.

### IAM Policy

Create an IAM policy for the Cluster Autoscaler:

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
        "autoscaling:DescribeTags",
        "autoscaling:SetDesiredCapacity",
        "autoscaling:TerminateInstanceInAutoScalingGroup",
        "ec2:DescribeLaunchTemplateVersions",
        "ec2:DescribeInstanceTypes",
        "ec2:DescribeImages",
        "ec2:GetInstanceTypesFromInstanceRequirements",
        "eks:DescribeNodegroup"
      ],
      "Resource": "*"
    }
  ]
}
```

### Tag Your ASG

Tag your Auto Scaling Group so the Cluster Autoscaler can discover it:

```bash
# Tag your ASG for auto-discovery
aws autoscaling create-or-update-tags --tags \
  "ResourceId=talos-workers-asg,ResourceType=auto-scaling-group,Key=k8s.io/cluster-autoscaler/enabled,Value=true,PropagateAtLaunch=true" \
  "ResourceId=talos-workers-asg,ResourceType=auto-scaling-group,Key=k8s.io/cluster-autoscaler/my-cluster,Value=owned,PropagateAtLaunch=true"
```

### Deploy the Cluster Autoscaler

```yaml
# cluster-autoscaler.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: cluster-autoscaler
  namespace: kube-system
  labels:
    app: cluster-autoscaler
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
      priorityClassName: system-cluster-critical
      containers:
      - name: cluster-autoscaler
        image: registry.k8s.io/autoscaling/cluster-autoscaler:v1.29.0
        command:
        - ./cluster-autoscaler
        - --v=4
        - --stderrthreshold=info
        - --cloud-provider=aws
        - --skip-nodes-with-local-storage=false
        - --expander=least-waste
        - --node-group-auto-discovery=asg:tag=k8s.io/cluster-autoscaler/enabled=true,k8s.io/cluster-autoscaler/my-cluster=owned
        - --balance-similar-node-groups
        - --skip-nodes-with-system-pods=false
        - --scale-down-delay-after-add=5m
        - --scale-down-unneeded-time=5m
        resources:
          limits:
            cpu: 100m
            memory: 600Mi
          requests:
            cpu: 100m
            memory: 600Mi
      tolerations:
      - key: node-role.kubernetes.io/control-plane
        effect: NoSchedule
```

### RBAC Configuration

```yaml
# cluster-autoscaler-rbac.yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: cluster-autoscaler
  namespace: kube-system
  annotations:
    # If using IRSA (IAM Roles for Service Accounts)
    eks.amazonaws.com/role-arn: arn:aws:iam::123456789012:role/cluster-autoscaler-role
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
- apiGroups: ["extensions"]
  resources: ["replicasets", "daemonsets"]
  verbs: ["watch", "list", "get"]
- apiGroups: ["policy"]
  resources: ["poddisruptionbudgets"]
  verbs: ["watch", "list"]
- apiGroups: ["apps"]
  resources: ["statefulsets", "replicasets", "daemonsets"]
  verbs: ["watch", "list", "get"]
- apiGroups: ["storage.k8s.io"]
  resources: ["storageclasses", "csinodes", "csidrivers", "csistoragecapacities"]
  verbs: ["watch", "list", "get"]
- apiGroups: ["coordination.k8s.io"]
  resources: ["leases"]
  verbs: ["create"]
- apiGroups: ["coordination.k8s.io"]
  resources: ["leases"]
  resourceNames: ["cluster-autoscaler"]
  verbs: ["get", "update"]
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
```

```bash
# Apply the RBAC and deployment
kubectl apply -f cluster-autoscaler-rbac.yaml
kubectl apply -f cluster-autoscaler.yaml
```

## Talos-Specific Considerations

When the Cluster Autoscaler adds a new node, that node needs to be a properly configured Talos Linux instance. Here is what you need to handle:

### Machine Configuration

New Talos nodes need a machine configuration to join the cluster. When using cloud providers, this is typically handled through:

1. **Launch templates** with Talos machine configuration in user data
2. **Talos machine configuration servers** that serve configurations to new nodes
3. **Cloud-init compatible** bootstrap mechanisms

```bash
# Generate a worker machine configuration
talosctl gen config my-cluster https://controlplane.example.com:6443

# The worker.yaml can be embedded in your launch template's user data
```

### Node Registration

Talos nodes automatically register with the Kubernetes API server when they boot with the correct machine configuration. The Cluster Autoscaler just needs to ensure new instances get the right configuration.

## Configuring Scale-Up Behavior

Fine-tune how the autoscaler scales up:

```yaml
# Key flags for scale-up behavior
command:
- ./cluster-autoscaler
# How long to wait after a scale-up before considering another
- --scale-down-delay-after-add=10m
# Maximum number of nodes the autoscaler can add at once
- --max-nodes-total=100
# How many seconds to wait for a node to become ready
- --max-node-provision-time=15m
# Expand the node group that wastes the least resources
- --expander=least-waste
```

## Configuring Scale-Down Behavior

Configure when and how nodes get removed:

```yaml
command:
- ./cluster-autoscaler
# How long a node must be underutilized before removal
- --scale-down-unneeded-time=10m
# Utilization threshold below which a node is considered underutilized
- --scale-down-utilization-threshold=0.5
# Delay scale-down after a node deletion
- --scale-down-delay-after-delete=1m
# Maximum number of nodes that can be removed simultaneously
- --max-graceful-termination-sec=600
```

## Monitoring the Cluster Autoscaler

```bash
# Check autoscaler logs
kubectl logs -n kube-system -l app=cluster-autoscaler --tail=100

# View autoscaler status
kubectl get configmap cluster-autoscaler-status -n kube-system -o yaml

# Check for pending pods (triggers scale-up)
kubectl get pods --all-namespaces --field-selector=status.phase=Pending

# View autoscaler events
kubectl get events -n kube-system --field-selector source=cluster-autoscaler
```

## Testing the Autoscaler

Deploy a workload that exceeds current cluster capacity:

```yaml
# scale-test.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: scale-test
spec:
  replicas: 50
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
            cpu: "500m"
            memory: "512Mi"
```

```bash
# Deploy the test workload
kubectl apply -f scale-test.yaml

# Watch for pending pods and new nodes
kubectl get pods -l app=scale-test -w
kubectl get nodes -w
```

You should see pending pods trigger the autoscaler to add nodes. Once the nodes are ready and pods are scheduled, scale the deployment back down and watch nodes get removed after the scale-down delay.

## Wrapping Up

The Cluster Autoscaler on Talos Linux handles the same scaling logic as on any other Kubernetes distribution, but the key difference is making sure new nodes boot with the correct Talos machine configuration. Use launch templates or machine configuration servers to automate this. Configure scale-up and scale-down parameters based on your workload patterns, monitor the autoscaler logs for issues, and test the scaling behavior before relying on it in production.
