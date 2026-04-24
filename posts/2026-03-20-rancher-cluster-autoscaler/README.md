# How to Configure Cluster Autoscaler in Rancher - A Practical Guide

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher, Kubernetes, Cluster Autoscaler, Scaling, Cost Optimization

Description: Configure the Kubernetes Cluster Autoscaler in Rancher to automatically scale worker nodes based on workload demand, optimizing both performance and cost.

## Introduction

The Kubernetes Cluster Autoscaler automatically adjusts the number of worker nodes in your cluster based on pod scheduling demands. When pods can't be scheduled due to insufficient resources, it adds nodes. When nodes are underutilized, it removes them to save costs. This guide covers configuring the Cluster Autoscaler for an AWS (EKS/EC2) cluster managed by Rancher.

## Prerequisites

- Rancher-managed cluster on a cloud provider
- IAM/RBAC permissions to manage node groups
- Helm 3.x installed

## Step 1: Configure AWS (EC2/EKS) Autoscaling

### Set Up IAM Permissions

```bash
# Create IAM policy for Cluster Autoscaler

cat > cluster-autoscaler-policy.json << 'EOF'
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
        "ec2:DescribeImages",
        "ec2:DescribeInstanceTypes",
        "ec2:DescribeLaunchTemplateVersions",
        "ec2:GetInstanceTypesFromInstanceRequirements",
        "eks:DescribeNodegroup"
      ],
      "Resource": ["*"]
    },
    {
      "Effect": "Allow",
      "Action": [
        "autoscaling:SetDesiredCapacity",
        "autoscaling:TerminateInstanceInAutoScalingGroup"
      ],
      "Resource": ["*"],
      "Condition": {
        "StringEquals": {
          "autoscaling:ResourceTag/kubernetes.io/cluster/my-cluster": "owned"
        }
      }
    }
  ]
}
EOF

aws iam create-policy \
  --policy-name ClusterAutoscalerPolicy \
  --policy-document file://cluster-autoscaler-policy.json
```

### Tag Auto Scaling Groups

```bash
# Tag ASGs for cluster autoscaler discovery
aws autoscaling create-or-update-tags \
  --tags \
    "ResourceId=my-worker-asg,ResourceType=auto-scaling-group,Key=kubernetes.io/cluster/my-cluster,Value=owned,PropagateAtLaunch=true" \
    "ResourceId=my-worker-asg,ResourceType=auto-scaling-group,Key=k8s.io/cluster-autoscaler/enabled,Value=true,PropagateAtLaunch=true" \
    "ResourceId=my-worker-asg,ResourceType=auto-scaling-group,Key=k8s.io/cluster-autoscaler/my-cluster,Value=owned,PropagateAtLaunch=true"

# Set min/max for the ASG
aws autoscaling update-auto-scaling-group \
  --auto-scaling-group-name my-worker-asg \
  --min-size 2 \
  --max-size 20 \
  --desired-capacity 5
```

## Step 2: Deploy Cluster Autoscaler

```yaml
# cluster-autoscaler-values.yaml - Cluster Autoscaler configuration
autoDiscovery:
  clusterName: my-cluster

# AWS provider configuration
cloudProvider: aws
awsRegion: us-east-1

# Cluster Autoscaler flags
extraArgs:
  # Scale down settings
  # Delay before removing an unneeded node
  scale-down-delay-after-add: 10m
  # Delay between scale-down operations
  scale-down-delay-after-delete: 0s
  # Delay after failed scale-down
  scale-down-delay-after-failure: 3m
  # Node utilization threshold (below this = unneeded)
  scale-down-utilization-threshold: "0.5"
  # Node must be unneeded for this long before removal
  scale-down-unneeded-time: 10m
  # Cluster Autoscaler respects PodDisruptionBudgets during scale-down

  # Scale up settings
  balance-similar-node-groups: true
  skip-nodes-with-local-storage: false
  skip-nodes-with-system-pods: true

  # Expander: how to choose which node group to expand
  expander: least-waste  # Options: random, most-pods, least-waste, least-nodes, priority

# Resource limits
resources:
  requests:
    cpu: 100m
    memory: 300Mi
  limits:
    cpu: 100m
    memory: 300Mi

# Service account annotation for IRSA
rbac:
  serviceAccount:
    annotations:
      eks.amazonaws.com/role-arn: "arn:aws:iam::123456789012:role/ClusterAutoscalerRole"

# Enable metrics
serviceMonitor:
  enabled: true
  namespace: cattle-monitoring-system
  selector:
    release: rancher-monitoring
```

```bash
# Add cluster-autoscaler Helm repository
helm repo add autoscaler https://kubernetes.github.io/autoscaler
helm repo update

# Install Cluster Autoscaler
helm install cluster-autoscaler autoscaler/cluster-autoscaler \
  --namespace kube-system \
  --values cluster-autoscaler-values.yaml \
  --wait

# Verify installation
kubectl get pods -n kube-system -l app.kubernetes.io/name=aws-cluster-autoscaler
```

## Step 3: Configure Multiple Node Groups

```yaml
# cluster-autoscaler-multi-ng.yaml - Multiple node groups for different workload types
autoDiscovery:
  clusterName: my-cluster

extraArgs:
  expander: priority,least-waste
  balance-similar-node-groups: true

expanderPriorities:
  20:
    # Prefer spot instances
    - .*spot.*
  10:
    # Then on-demand
    - .*on-demand.*
```

## Step 4: Configure Workloads for Autoscaling

```yaml
# workload-autoscaling.yaml - Configure workloads to work with autoscaler
apiVersion: apps/v1
kind: Deployment
metadata:
  name: scalable-app
  namespace: production
spec:
  replicas: 3
  selector:
    matchLabels:
      app: scalable-app
  template:
    metadata:
      labels:
        app: scalable-app
    spec:
      containers:
        - name: app
          image: registry.example.com/app:v1.0
          resources:
            # Always set resource requests for autoscaler to work correctly
            requests:
              cpu: 500m
              memory: 256Mi
            limits:
              cpu: 2000m
              memory: 1Gi
  # Configure rolling updates
  strategy:
    rollingUpdate:
      maxUnavailable: 1
---
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: scalable-app-pdb
  namespace: production
spec:
  minAvailable: 2
  selector:
    matchLabels:
      app: scalable-app
```

## Step 5: Node Selector for Workload Placement

```yaml
# node-group-workloads.yaml - Assign workloads to specific node groups
apiVersion: apps/v1
kind: Deployment
metadata:
  name: memory-intensive-app
  namespace: production
spec:
  selector:
    matchLabels:
      app: memory-intensive-app
  template:
    metadata:
      labels:
        app: memory-intensive-app
    spec:
      # Ensure pods go to memory-optimized nodes
      nodeSelector:
        node.kubernetes.io/instance-type: r5.xlarge
      # Tolerate memory-optimized node taint
      tolerations:
        - key: workload-type
          operator: Equal
          value: memory-intensive
          effect: NoSchedule
      containers:
        - name: app
          image: registry.example.com/app:v1.0
          resources:
            requests:
              memory: 4Gi
              cpu: 1000m
```

## Step 6: Monitor Autoscaler Activity

```bash
# Watch autoscaler logs
kubectl logs -n kube-system -l app.kubernetes.io/name=aws-cluster-autoscaler \
  -f | grep -i "scale\|node"

# Check autoscaler status
kubectl get configmap cluster-autoscaler-status \
  -n kube-system \
  -o yaml

# View recent scale events
kubectl describe configmap cluster-autoscaler-status \
  -n kube-system | grep -A 5 "ScaleUp\|ScaleDown"
```

```yaml
# autoscaler-alerts.yaml - Alerts for autoscaler issues
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: cluster-autoscaler-alerts
  namespace: cattle-monitoring-system
  labels:
    release: rancher-monitoring
spec:
  groups:
    - name: cluster-autoscaler
      rules:
        - alert: ClusterAutoscalerScaleUpFailed
          expr: increase(cluster_autoscaler_failed_scale_ups_total[5m]) > 0
          labels:
            severity: warning
          annotations:
            summary: "Cluster Autoscaler failed to scale up in the last 5 minutes"

        - alert: ClusterAutoscalerUnschedulablePods
          expr: sum(cluster_autoscaler_unschedulable_pods_count{type="unschedulable"}) > 0
          for: 15m
          labels:
            severity: warning
          annotations:
            summary: "{{ $value }} pods are unschedulable for 15+ minutes"
```

## Conclusion

The Kubernetes Cluster Autoscaler dynamically matches cluster capacity to workload demand, reducing costs during off-peak periods while ensuring performance during traffic spikes. For best results, always set meaningful resource requests on your pods, configure Pod Disruption Budgets to ensure graceful scale-down, and use node selectors to guide autoscaler decisions. Monitor autoscaler activity to understand your scaling patterns and fine-tune the scale-down thresholds and delays for your specific workloads.
