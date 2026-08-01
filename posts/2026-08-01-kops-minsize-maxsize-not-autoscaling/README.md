# Why Setting `minSize` and `maxSize` Does Not Automatically Scale a kOps Node Group

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: kOps, Kubernetes, Cluster Autoscaler, AWS Auto Scaling, InstanceGroup, Capacity Planning

Description: Understand why kOps size fields are only capacity bounds and enable Cluster Autoscaler when pending Pods should change node count.

---

Setting an ASG-backed InstanceGroup to `minSize: 2` and `maxSize: 10` does not tell kOps or AWS when to add a third node. Those values define the permitted range for the backing node group. A separate controller must change its desired capacity.

On AWS, a kOps InstanceGroup using the default `CloudGroup` manager maps to an EC2 Auto Scaling group with minimum, maximum, and desired capacity. Without a scaling policy or Kubernetes node autoscaler, the ASG maintains its current desired capacity and replaces unhealthy instances, but it does not interpret Kubernetes Pod demand.

## Bounds Are Not a Scaling Policy

Consider this worker group:

```yaml
apiVersion: kops.k8s.io/v1alpha2
kind: InstanceGroup
metadata:
  name: workers
spec:
  machineType: m7i.large
  minSize: 2
  maxSize: 10
  role: Node
  subnets:
    - eu-west-2a
    - eu-west-2b
```

The fields mean:

- `minSize: 2`: the group must not operate below two capacity units;
- `maxSize: 10`: the group must not operate above ten capacity units;
- neither field defines a metric, threshold, schedule, or Kubernetes scheduling trigger.

If desired capacity is two, widening the maximum from two to ten normally leaves two instances running. Raising the minimum above desired capacity forces AWS to bring desired capacity up to the new minimum; lowering the maximum below desired capacity forces it down. Those boundary corrections are not automatic demand-based scaling.

## What Cluster Autoscaler Actually Watches

Kubernetes Cluster Autoscaler changes desired capacity for preconfigured node groups. Its primary scale-up signal is Pods that the scheduler cannot place. It simulates whether adding a node from an eligible group would make those Pods schedulable.

That means it considers inputs such as:

- container CPU and memory **requests**, not current utilization alone;
- node selectors and node affinity;
- taints and tolerations;
- topology and volume constraints;
- per-node allocatable resources;
- the group's configured minimum and maximum.

A Pod consuming high CPU does not directly make Cluster Autoscaler add a node. Horizontal Pod Autoscaler might create more replicas from utilization metrics; if those replicas become unschedulable, Cluster Autoscaler can then provision nodes for them.

For scale-down, Cluster Autoscaler looks for nodes whose movable workloads can fit elsewhere. Disruption budgets, local storage, system Pods, controller ownership, affinity, and other safety rules can prevent removal.

## Enable the kOps-Managed Addon

Edit the cluster:

```bash
export KOPS_STATE_STORE=s3://example-kops-state
export CLUSTER_NAME=prod.example.com

kops edit cluster "$CLUSTER_NAME"
```

Add a managed Cluster Autoscaler configuration:

```yaml
spec:
  clusterAutoscaler:
    enabled: true
    expander: least-waste
    balanceSimilarNodeGroups: true
    emitPerNodegroupMetrics: true
    scaleDownUtilizationThreshold: 0.5
    scaleDownDelayAfterAdd: 10m
    scaleDownUnneededTime: 10m
```

Use the defaults unless you have a measured reason to tune them. Aggressive scale-down can increase churn, trigger repeated image pulls, and amplify application startup latency.

Worker InstanceGroups are eligible by default when the managed addon is enabled. You can state that explicitly:

```yaml
spec:
  autoscale: true
  minSize: 2
  maxSize: 10
```

Exclude a special-purpose group from Cluster Autoscaler with:

```yaml
spec:
  autoscale: false
```

Preview and apply the cluster change:

```bash
kops update cluster "$CLUSTER_NAME"
kops update cluster "$CLUSTER_NAME" --yes
```

Review the preview before applying it. Enabling the addon may add IAM permissions and Kubernetes resources.

## Verify the Controller, Not Just the Bounds

Check that the Deployment exists and is available:

```bash
kubectl -n kube-system get deployment cluster-autoscaler
kubectl -n kube-system get pods -l app=cluster-autoscaler
kubectl -n kube-system logs deployment/cluster-autoscaler --tail=200
```

Depending on the generated manifest version, labels may differ. If the label query returns nothing, inspect the Deployment directly rather than assuming the addon is absent.

On AWS, first resolve the exact backing Auto Scaling group name from the
InstanceGroup, `kops get instances`, or the AWS console. Then confirm its limits
and desired capacity directly:

```bash
aws autoscaling describe-auto-scaling-groups \
  --auto-scaling-group-names ASG_NAME \
  --query 'AutoScalingGroups[0].{Name:AutoScalingGroupName,Min:MinSize,Desired:DesiredCapacity,Max:MaxSize}'
```

AWS tags vary across kOps versions and configurations, so an exact ASG name is
safer than a tag query copied from another cluster.

The critical observation is that `Min`, `Desired`, and `Max` are separate values. Cluster Autoscaler changes `Desired` while respecting `Min` and `Max`.

## Test with a Schedulable Workload

Use a controlled test namespace and a workload whose resource requests cannot fit on current free capacity but can fit on the configured node type. Watch the pending Pod, autoscaler log, ASG desired capacity, and node registration together.

Do not test with an impossible Pod. A Pod requesting more CPU than any node provides, selecting a nonexistent label, requiring an unavailable zone, or lacking a required toleration remains Pending no matter how high `maxSize` is. Cluster Autoscaler should report that adding a node would not help.

## Why Autoscaling Often Appears Broken

### Requests are missing or unrealistic

Cluster Autoscaler reasons about scheduler requests. Workloads with no meaningful requests can overload nodes without becoming unschedulable. Requests larger than a node's allocatable capacity can never be satisfied by that group.

### The group has reached `maxSize`

The maximum is a hard ceiling for the autoscaler's normal operation. Increase it only after checking quota, subnet IP space, budget, and downstream capacity.

### The group is excluded

An InstanceGroup with `spec.autoscale: false` is deliberately not managed by the kOps-installed Cluster Autoscaler.

### Scheduling constraints do not match

Check the Pending Pod's events:

```bash
kubectl describe pod -n application example-pod
```

Messages about affinity, taints, volume node affinity, ports, or oversized requests explain why another copy of the current node template would not help.

### Scale-down safety blocks removal

PodDisruptionBudgets, unmanaged Pods, local storage, and critical `kube-system` workloads can keep a node in place. Read the autoscaler log before weakening safeguards.

### Another controller also writes desired capacity

Do not combine Cluster Autoscaler with an EC2 target-tracking policy, scheduled action, or custom script on the same ASG unless the interaction is explicitly designed. Competing writers can repeatedly undo each other's desired-capacity changes.

## Karpenter Is a Different Model

Current kOps releases can also manage AWS workers through Karpenter. Karpenter-managed InstanceGroups use NodePool semantics rather than an ASG controlled by Cluster Autoscaler; in kOps 1.36 and later, omitting `minSize` creates a dynamic NodePool, while a positive `minSize` creates a static one and becomes `NodePool.spec.replicas`. When set, `maxSize` maps to `NodePool.spec.limits.nodes`.

Do not apply ASG troubleshooting steps to a group whose `spec.manager` is `Karpenter`. First identify which node manager owns provisioning.

For ASG-backed InstanceGroups, `minSize` and `maxSize` answer “what range is allowed?” They do not answer “when should capacity change?” Enable exactly one node-provisioning controller and give it schedulable node templates, realistic resource requests, and safe bounds.

## Official Documentation

- [kOps: Managed addons and Cluster Autoscaler](https://kops.sigs.k8s.io/addons/#cluster-autoscaler)
- [kOps: InstanceGroup resource](https://kops.sigs.k8s.io/instance_groups/)
- [kOps: Working with InstanceGroups](https://kops.sigs.k8s.io/tutorial/working-with-instancegroups/)
- [Kubernetes: Node autoscaling](https://kubernetes.io/docs/concepts/cluster-administration/node-autoscaling/)
- [Kubernetes Autoscaler: AWS provider](https://github.com/kubernetes/autoscaler/blob/master/cluster-autoscaler/cloudprovider/aws/README.md)
- [AWS: Choose an EC2 Auto Scaling scaling method](https://docs.aws.amazon.com/autoscaling/ec2/userguide/scaling-overview.html)
- [kOps: Karpenter](https://kops.sigs.k8s.io/operations/karpenter/)
