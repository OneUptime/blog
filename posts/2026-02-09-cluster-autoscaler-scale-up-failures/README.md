# How to Handle Cluster Autoscaler Scale-Up Failures and Unschedulable Pods

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Cluster Autoscaler, Troubleshooting

Description: Diagnose and resolve Cluster Autoscaler scale-up failures that leave pods unschedulable, including cloud quota limits, IAM permissions, and node group configuration issues.

---

When Cluster Autoscaler cannot add nodes to handle unschedulable pods, workloads remain pending and services degrade. Scale-up failures happen for many reasons including cloud provider quota limits, insufficient IAM permissions, misconfigured node groups, or resource constraints. Understanding how to diagnose and fix these issues is critical for maintaining reliable autoscaling.

Unschedulable pods signal that Cluster Autoscaler should add capacity, but various failure modes can prevent successful scale-up. Proper monitoring, logging, and configuration help you quickly identify and resolve these problems before they impact users.

## Understanding Scale-Up Failures

Scale-up failures occur when Cluster Autoscaler identifies unschedulable pods, determines that additional nodes would help schedule them, but fails to actually add nodes. The failure can happen at different stages including node group selection, cloud API calls, or node registration.

Common symptoms include pods stuck in Pending state, Cluster Autoscaler logs showing scale-up attempts, and node counts remaining unchanged despite resource needs. Each failure type has specific causes and solutions.

## Monitoring Scale-Up Health

Check for unschedulable pods and scale-up attempts.

```bash
# Find unschedulable pods
kubectl get pods --all-namespaces --field-selector=status.phase=Pending

# Describe pending pod to see why it cannot schedule
kubectl describe pod <pod-name> -n <namespace>

# Check Cluster Autoscaler logs
kubectl logs -n kube-system deployment/cluster-autoscaler | \
  grep -i "scale up"

# Look for scale-up failures
kubectl logs -n kube-system deployment/cluster-autoscaler | \
  grep -i -E "fail|error|unable"

# Check autoscaler events
kubectl get events -n kube-system --field-selector involvedObject.name=cluster-autoscaler
```

These commands reveal whether scale-up is being attempted and where failures occur.

## Cloud Provider Quota Limits

Scale-up fails when cloud quotas are exhausted.

```bash
# Check AWS service quotas
aws service-quotas get-service-quota \
  --service-code ec2 \
  --quota-code L-1216C47A  # Running On-Demand instances

# Check current instance count
aws ec2 describe-instances \
  --filters "Name=instance-state-name,Values=running" \
  --query 'Reservations[].Instances[].[InstanceType]' | \
  sort | uniq -c

# Request quota increase if needed
aws service-quotas request-service-quota-increase \
  --service-code ec2 \
  --quota-code L-1216C47A \
  --desired-value 200
```

Cluster Autoscaler logs show quota-related errors like "Instance limit exceeded" or "Quota exceeded."

## IAM Permission Issues

Missing permissions prevent Cluster Autoscaler from creating nodes.

```bash
# Check Cluster Autoscaler IAM policy
aws iam get-role-policy \
  --role-name ClusterAutoscalerRole \
  --policy-name ClusterAutoscalerPolicy

# Verify required permissions exist
cat <<EOF > required-permissions.json
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
      "Resource": ["*"]
    }
  ]
}
EOF

# Update IAM policy if needed
aws iam put-role-policy \
  --role-name ClusterAutoscalerRole \
  --policy-name ClusterAutoscalerPolicy \
  --policy-document file://required-permissions.json
```

Logs show "AccessDenied" or "UnauthorizedOperation" errors when permissions are missing.

## Node Group Capacity Limits

Scale-up fails when node groups reach their maximum size.

```bash
# Check current and max size of ASGs
aws autoscaling describe-auto-scaling-groups \
  --query 'AutoScalingGroups[].[AutoScalingGroupName,DesiredCapacity,MaxSize]' \
  --output table

# Increase max size if needed
aws autoscaling update-auto-scaling-group \
  --auto-scaling-group-name my-node-group \
  --max-size 100

# Verify Cluster Autoscaler respects new limit
kubectl logs -n kube-system deployment/cluster-autoscaler | \
  grep -A5 "my-node-group"
```

Logs indicate "max nodes reached" or "node group at maximum size" when this occurs.

## Insufficient Subnet Capacity

Scale-up fails when subnets have no available IP addresses.

```bash
# Check subnet available IPs
aws ec2 describe-subnets \
  --subnet-ids subnet-12345 \
  --query 'Subnets[].AvailableIpAddressCount'

# Add new subnet to node group if current subnet is exhausted
aws autoscaling update-auto-scaling-group \
  --auto-scaling-group-name my-node-group \
  --vpc-zone-identifier "subnet-12345,subnet-67890"
```

Look for "insufficient IP addresses" or "no available IPs" in cloud provider errors.

## Instance Type Availability

Scale-up fails when requested instance types are unavailable in the zone.

```yaml
# Configure fallback instance types in node group
apiVersion: v1
kind: ConfigMap
metadata:
  name: cluster-autoscaler-priority-expander
  namespace: kube-system
data:
  priorities: |
    10:
      - .*-m5\.2xlarge.*
    5:
      - .*-m5\.xlarge.*
    1:
      - .*-m4\.2xlarge.*
```

Logs show "insufficient capacity" or "instance type not available" when this happens.

## Node Registration Timeouts

Nodes launch but fail to join the cluster.

```bash
# Check if nodes exist in cloud but not in Kubernetes
aws ec2 describe-instances \
  --filters "Name=tag:kubernetes.io/cluster/my-cluster,Values=owned" \
  --query 'Reservations[].Instances[].[InstanceId,State.Name]'

kubectl get nodes

# Check node bootstrap logs (connect to instance)
ssh ec2-user@<instance-ip>
sudo journalctl -u kubelet -n 100

# Common issues:
# - Incorrect cluster name in kubelet config
# - Network connectivity to API server
# - Missing IAM instance profile
```

Configure longer timeouts in Cluster Autoscaler if nodes are slow to join.

```yaml
command:
- ./cluster-autoscaler
- --max-node-provision-time=15m  # Wait up to 15 min for nodes
```

## Pod Anti-Affinity Conflicts

Scale-up triggered but new nodes still cannot schedule pods.

```yaml
# Example problematic anti-affinity
apiVersion: apps/v1
kind: Deployment
metadata:
  name: web-app
spec:
  replicas: 10
  template:
    spec:
      affinity:
        podAntiAffinity:
          requiredDuringSchedulingIgnoredDuringExecution:
          - labelSelector:
              matchLabels:
                app: web-app
            topologyKey: kubernetes.io/hostname  # Requires 10 different nodes

      # But only 5 nodes exist in total
```

This requires 10 nodes but cluster max is 5. Check for such conflicts.

```bash
# Find pods with anti-affinity
kubectl get pods --all-namespaces -o json | \
  jq '.items[] | select(.spec.affinity.podAntiAffinity != null) |
      {pod: .metadata.name, namespace: .metadata.namespace}'
```

## Resource Request Mismatches

Pods request more resources than any node type provides.

```bash
# Find pods with large resource requests
kubectl get pods --all-namespaces -o json | \
  jq '.items[] |
      select(.status.phase == "Pending") |
      {
        pod: .metadata.name,
        namespace: .metadata.namespace,
        cpu: .spec.containers[].resources.requests.cpu,
        memory: .spec.containers[].resources.requests.memory
      }'

# Compare to node capacity
kubectl get nodes -o json | \
  jq '.items[] | {
    node: .metadata.name,
    cpu: .status.allocatable.cpu,
    memory: .status.allocatable.memory
  }'
```

If pod requests exceed any node type's allocatable resources, scale-up cannot help.

## Debugging Complete Scale-Up Flow

Comprehensive debugging script.

```bash
#!/bin/bash
# debug-scale-up.sh

echo "=== Pending Pods ==="
kubectl get pods --all-namespaces --field-selector=status.phase=Pending

echo -e "\n=== Cluster Autoscaler Logs ==="
kubectl logs -n kube-system deployment/cluster-autoscaler --tail=50 | \
  grep -i -E "scale|fail|error"

echo -e "\n=== Node Groups ==="
aws autoscaling describe-auto-scaling-groups \
  --query 'AutoScalingGroups[].[AutoScalingGroupName,DesiredCapacity,MinSize,MaxSize]' \
  --output table

echo -e "\n=== Recent Scaling Activities ==="
aws autoscaling describe-scaling-activities \
  --max-records 10 \
  --query 'Activities[].[ActivityId,StatusCode,Description,StartTime]' \
  --output table

echo -e "\n=== Node Status ==="
kubectl get nodes

echo -e "\n=== Cloud Provider Errors ==="
kubectl logs -n kube-system deployment/cluster-autoscaler | \
  grep -i -A3 "cloud provider"
```

Run this script to get a complete picture of scale-up status.

## Configuring Retry Behavior

Tune how Cluster Autoscaler retries after failures.

```yaml
command:
- ./cluster-autoscaler
- --max-node-provision-time=15m
- --max-total-unready-percentage=45
- --ok-total-unready-count=3
- --scale-up-from-zero-enabled=true
```

These settings control how long to wait for nodes and what counts as acceptable failure rates.

## Alerting on Scale-Up Failures

Set up monitoring alerts for persistent issues.

```yaml
# Prometheus alert example
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: cluster-autoscaler-alerts
  namespace: monitoring
spec:
  groups:
  - name: cluster-autoscaler
    interval: 30s
    rules:
    - alert: ClusterAutoscalerScaleUpFailed
      expr: |
        rate(cluster_autoscaler_failed_scale_ups_total[5m]) > 0
      for: 10m
      labels:
        severity: warning
      annotations:
        summary: "Cluster Autoscaler is failing to scale up"
        description: "Scale-up failures detected for {{ $value }} attempts in last 5 minutes"

    - alert: PodsPendingTooLong
      expr: |
        sum(kube_pod_status_phase{phase="Pending"}) > 5
      for: 15m
      labels:
        severity: warning
      annotations:
        summary: "Pods stuck in pending state"
```

## Preventing Common Failures

Best practices to avoid scale-up issues.

```yaml
# Set reasonable resource requests
apiVersion: apps/v1
kind: Deployment
metadata:
  name: web-app
spec:
  template:
    spec:
      containers:
      - name: app
        resources:
          requests:
            cpu: 500m  # Not 50000m
            memory: 1Gi  # Not 100Gi
---
# Configure multiple node groups for redundancy
command:
- ./cluster-autoscaler
- --balance-similar-node-groups=true

# Ensure adequate cloud quotas
# Request quota increases before hitting limits

# Use pod priority classes
apiVersion: scheduling.k8s.io/v1
kind: PriorityClass
metadata:
  name: high-priority
value: 10000
```

## Conclusion

Scale-up failures leave pods unschedulable and degrade service quality. By understanding common failure modes and how to diagnose them, you can quickly resolve issues and restore autoscaling functionality. Monitor Cluster Autoscaler logs, cloud provider quotas, and IAM permissions regularly to catch problems early.

Proper configuration including reasonable resource requests, adequate cloud quotas, correct IAM permissions, and appropriate node group limits prevents most scale-up failures. Combined with monitoring and alerting, you can maintain reliable cluster autoscaling that ensures capacity is available when workloads need it.
