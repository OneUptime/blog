# Building kOps Spot Node Groups with `MixedInstancesPolicy` and On-Demand Fallback

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: kOps, Kubernetes, AWS Spot, MixedInstancesPolicy, EC2 Auto Scaling, Cluster Autoscaler

Description: Build a diversified kOps worker group with a protected On-Demand baseline, interruption-aware Spot allocation, and truthful autoscaler capacity.

---

A kOps AWS InstanceGroup can use an EC2 Auto Scaling Mixed Instances Policy to combine several instance types and purchase options. A sound policy keeps a deliberate On-Demand baseline, spreads Spot requests across equivalent capacity pools, and treats interruption as a normal event.

There is one terminology trap: the On-Demand percentage is a **planned capacity mix**, not a promise that AWS will convert every unavailable Spot request into On-Demand capacity. Design the group so its On-Demand portion alone protects the baseline you truly require.

## Start with the Availability Requirement

Decide three values before writing YAML:

1. the minimum number of nodes the service needs even during poor Spot availability;
2. the percentage of capacity above that baseline that should remain On-Demand;
3. a set of interchangeable instance types across the enabled Availability Zones.

For example, a group with desired capacity ten, `onDemandBase: 2`, and `onDemandAboveBase: 20` asks for:

- the first two capacity units as On-Demand;
- 20% of the eight units above the base as On-Demand;
- the remainder as Spot, subject to the rounding and allocation behavior defined by EC2 Auto Scaling.

This creates a durable base and a mixed expansion tier. It does not mean AWS will always replace an unfulfilled Spot unit with an On-Demand unit beyond the configured distribution.

If a workload must always have a schedulable On-Demand pool, a separate On-Demand InstanceGroup is clearer. Nodes in one mixed ASG share the same kOps node template, and critical Pods should not assume they will land on the On-Demand instances inside it.

## Select Equivalent Instance Types

Use several current-generation families that provide approximately the same CPU and memory. For example:

```text
m6i.xlarge   4 vCPU, 16 GiB
m6a.xlarge   4 vCPU, 16 GiB
m7i.xlarge   4 vCPU, 16 GiB
m7a.xlarge   4 vCPU, 16 GiB
```

Verify the actual offerings in every selected Region and Availability Zone. Also compare architecture, ENI limits, EBS bandwidth, local disks, and workload-specific CPU features.

kOps can help produce an InstanceGroup using EC2 instance selector:

```bash
kops toolbox instance-selector spot-workers \
  --vcpus 4 \
  --memory 16GB \
  --flexible \
  --usage-class spot
```

Treat generated output as a starting point. Review the selected generations, architecture, and regional availability before storing it.

## Define the Mixed Instances Policy

An example worker group is:

```yaml
apiVersion: kops.k8s.io/v1alpha2
kind: InstanceGroup
metadata:
  labels:
    kops.k8s.io/cluster: prod.example.com
  name: spot-workers
spec:
  autoscale: true
  machineType: m6i.xlarge
  minSize: 2
  maxSize: 20
  capacityRebalance: true
  mixedInstancesPolicy:
    instances:
      - m6i.xlarge
      - m6a.xlarge
      - m7i.xlarge
      - m7a.xlarge
    onDemandBase: 2
    onDemandAboveBase: 20
    spotAllocationStrategy: price-capacity-optimized
  nodeLabels:
    workload-class: interruptible
  taints:
    - capacity=interruptible:NoSchedule
  role: Node
  subnets:
    - eu-west-2a
    - eu-west-2b
    - eu-west-2c
```

The fields have distinct jobs:

- `instances` lists the launch-template overrides AWS may choose;
- `onDemandBase` is the minimum capacity fulfilled as On-Demand first;
- `onDemandAboveBase` is the On-Demand **percentage** above the base, from 0 through 100;
- `spotAllocationStrategy` controls which Spot pools AWS selects;
- `capacityRebalance` asks the ASG to start a proactive replacement after a rebalance recommendation.

AWS recommends `price-capacity-optimized` for Spot. It selects from pools with lower interruption risk while considering price. Current kOps API validation also accepts this strategy. Older kOps releases may support a smaller strategy set, so check the documentation for the binary that manages the cluster before applying the field.

## Make the Group Opt-In for Workloads

A workload intended for interruptible capacity should tolerate the taint and select the group:

```yaml
spec:
  template:
    spec:
      nodeSelector:
        workload-class: interruptible
      tolerations:
        - key: capacity
          operator: Equal
          value: interruptible
          effect: NoSchedule
```

Use replicated, checkpointing, or retryable workloads. A PodDisruptionBudget can limit voluntary disruption, but it cannot prevent AWS from reclaiming a Spot instance. Applications must tolerate involuntary loss.

Keep irreplaceable local state off Spot instance-store volumes. Use durable storage with correct zone topology and ensure rescheduling does not depend on the lost node.

## Preserve Cluster Autoscaler Accuracy

The Cluster Autoscaler AWS provider examines Mixed Instances Policy overrides but simulates the node group from the **first** instance type. AWS may launch any allowed override.

Consequences:

- if the first type is larger than another option, autoscaler can predict a Pod will fit although the launched node is too small;
- if the first type is smaller, autoscaler can reject a useful group even though AWS could launch a larger option;
- different GPU, architecture, or ephemeral-storage profiles make the template actively misleading.

Use near-equivalent types and put a representative type first. Split materially different sizes into separate InstanceGroups.

`minSize` and `maxSize` remain bounds. Enable the kOps-managed Cluster Autoscaler if Kubernetes scheduling demand should change desired capacity; the mixed policy only decides how AWS fulfills that capacity.

## Handle Interruption End to End

Capacity Rebalancing improves replacement timing, but it does not safely evict Kubernetes Pods by itself. AWS may temporarily exceed the ASG maximum by up to 10% of desired capacity while launching a proactive replacement, and a replacement can still fail when suitable Spot capacity is unavailable.

Use an interruption handler that cordons and drains the node when it receives a Spot interruption or rebalance event. kOps can manage AWS Node Termination Handler, including queue-processor mode for a broader set of ASG lifecycle events. Review its mode, IAM permissions, SQS/EventBridge resources, and lifecycle hooks as part of the cluster design.

The application still needs:

- replicas spread across nodes and zones;
- termination grace periods that fit the interruption window;
- idempotent work or checkpoints;
- readiness gates so replacements do not receive traffic too early;
- enough non-Spot capacity for critical system components.

Do not place every DNS, networking, ingress, and observability replica exclusively on one Spot pool.

## Preview and Apply with kOps

Store the InstanceGroup through the normal kOps workflow, then preview:

```bash
export KOPS_STATE_STORE=s3://example-kops-state
export CLUSTER_NAME=prod.example.com

kops update cluster "$CLUSTER_NAME" \
  --instance-group spot-workers
```

Review the ASG, launch template, purchase distribution, allowed instance types, subnets, and tags. Apply only after the preview matches the intended policy:

```bash
kops update cluster "$CLUSTER_NAME" \
  --instance-group spot-workers \
  --yes
```

For a new group, instances launch under the policy as desired capacity requires. For an existing group, changing allowed instance types or the allocation strategy does not necessarily replace all running nodes immediately. AWS documents that changing the On-Demand base or percentage can proactively rebalance the purchase-option mix, while allocation-strategy and instance-type changes mainly affect future launches.

Use a scoped kOps rolling update only when you intentionally need to replace existing nodes with the new launch configuration:

```bash
kops rolling-update cluster "$CLUSTER_NAME" \
  --instance-group spot-workers
```

Review before adding `--yes`; a full rotation is disruptive and can create a large series of Spot-capacity requests.

## Verify the Actual Mix

Inspect the backing ASG:

```bash
aws autoscaling describe-auto-scaling-groups \
  --auto-scaling-group-names ASG_NAME

aws autoscaling describe-scaling-activities \
  --auto-scaling-group-name ASG_NAME
```

Inspect the EC2 instances to distinguish Spot from On-Demand capacity:

```bash
aws ec2 describe-instances \
  --filters \
    "Name=tag:aws:autoscaling:groupName,Values=ASG_NAME" \
    "Name=instance-state-name,Values=pending,running" \
  --query 'Reservations[].Instances[].{InstanceId:InstanceId,InstanceType:InstanceType,PurchaseOption:InstanceLifecycle,AvailabilityZone:Placement.AvailabilityZone}' \
  --output table
```

`InstanceLifecycle` is `spot` for a Spot Instance and is absent (`null`) for an On-Demand Instance. Do not confuse it with the ASG's `LifecycleState`, which reports states such as `Pending` or `InService` rather than the purchase option.

Check:

- `MixedInstancesPolicy.InstancesDistribution`;
- `CapacityRebalance`;
- desired, minimum, and maximum capacity;
- launched instance types and purchase options;
- failed scaling activities and capacity errors.

Correlate AWS state with Kubernetes:

```bash
kubectl get nodes \
  -L kops.k8s.io/instancegroup,node.kubernetes.io/instance-type,workload-class
```

Test a controlled interruption-tolerant workload and verify it reschedules after node loss. A configuration is not resilient merely because the ASG accepted it.

## Safe Design Checklist

- Is the On-Demand base sufficient for the minimum service and system capacity?
- Is `onDemandAboveBase` understood as a percentage, not a node count?
- Are all instance overrides truly interchangeable to the scheduler?
- Is the first override representative for Cluster Autoscaler simulation?
- Does the group span multiple suitable Availability Zones and Spot pools?
- Is `price-capacity-optimized` supported by the managing kOps release?
- Is Capacity Rebalancing enabled?
- Is an interruption handler responsible for Kubernetes-aware draining?
- Can workloads tolerate involuntary termination despite PDBs?
- Is a separate On-Demand group used where placement guarantees matter?

A mixed group is a capacity-allocation mechanism, not an availability guarantee. Protect a deliberate On-Demand floor, diversify equivalent Spot pools, and make every workload on the group interruption-ready.

## Official Documentation

- [kOps: InstanceGroup `mixedInstancesPolicy`](https://kops.sigs.k8s.io/instance_groups/#mixedinstancespolicy-aws-only)
- [kOps: Managed addons and AWS Node Termination Handler](https://kops.sigs.k8s.io/addons/#node-termination-handler)
- [Kubernetes Autoscaler: AWS Mixed Instances Policy behavior](https://github.com/kubernetes/autoscaler/blob/master/cluster-autoscaler/cloudprovider/aws/README.md)
- [AWS: InstancesDistribution API](https://docs.aws.amazon.com/autoscaling/ec2/APIReference/API_InstancesDistribution.html)
- [AWS: Allocation strategies for multiple instance types](https://docs.aws.amazon.com/autoscaling/ec2/userguide/allocation-strategies.html)
- [AWS: Capacity Rebalancing](https://docs.aws.amazon.com/autoscaling/ec2/userguide/ec2-auto-scaling-capacity-rebalancing.html)
- [AWS: Spot best practices](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/spot-best-practices.html)
