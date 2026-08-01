# How to Configure Cluster Autoscaler for Multiple kOps InstanceGroups

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: kOps, Kubernetes, Cluster Autoscaler, AWS, InstanceGroup, Node Autoscaling

Description: Configure one kOps-managed Cluster Autoscaler to select safely among general, memory, and Spot worker InstanceGroups.

---

One Cluster Autoscaler instance can manage multiple kOps worker InstanceGroups. On AWS, each group maps to an Auto Scaling group; Cluster Autoscaler evaluates pending Pods, simulates the node template for each eligible group, selects a group with its configured expander, and changes that ASG's desired capacity within its minimum and maximum.

The reliable setup has four parts: distinct node templates, explicit scheduling intent, safe bounds, and a single component that owns desired capacity.

## Design the Groups Around Scheduling Needs

Suppose a cluster needs three worker classes:

| InstanceGroup | Purpose | Bounds | Scheduling identity |
| --- | --- | --- | --- |
| `general` | ordinary services | 2–12 | `workload-class=general` |
| `memory` | memory-heavy services | 0–6 | `workload-class=memory` plus a taint |
| `spot` | interruption-tolerant jobs | 0–20 | `capacity-type=spot` plus a taint |

Do not create nearly identical groups without a reason. Each extra template increases selection complexity and can fragment capacity. Conversely, do not mix radically different capacities in one ASG if autoscaler simulation cannot predict what a scale-up will provide.

A general InstanceGroup can look like:

```yaml
apiVersion: kops.k8s.io/v1alpha2
kind: InstanceGroup
metadata:
  labels:
    kops.k8s.io/cluster: prod.example.com
  name: general
spec:
  autoscale: true
  machineType: m7i.large
  minSize: 2
  maxSize: 12
  nodeLabels:
    workload-class: general
  role: Node
  subnets:
    - eu-west-2a
    - eu-west-2b
    - eu-west-2c
```

The memory group can be protected from accidental scheduling:

```yaml
apiVersion: kops.k8s.io/v1alpha2
kind: InstanceGroup
metadata:
  labels:
    kops.k8s.io/cluster: prod.example.com
  name: memory
spec:
  autoscale: true
  machineType: r7i.xlarge
  minSize: 0
  maxSize: 6
  nodeLabels:
    workload-class: memory
  taints:
    - dedicated=memory:NoSchedule
  role: Node
  subnets:
    - eu-west-2a
    - eu-west-2b
    - eu-west-2c
```

A workload intended for this group needs both the label constraint and matching toleration:

```yaml
spec:
  template:
    spec:
      nodeSelector:
        workload-class: memory
      tolerations:
        - key: dedicated
          operator: Equal
          value: memory
          effect: NoSchedule
```

Toleration alone permits scheduling; it does not require the memory group. The selector or required node affinity expresses that requirement.

## Enable the Managed Addon Once

Edit the cluster spec:

```bash
export KOPS_STATE_STORE=s3://example-kops-state
export CLUSTER_NAME=prod.example.com

kops edit cluster "$CLUSTER_NAME"
```

Add:

```yaml
spec:
  clusterAutoscaler:
    enabled: true
    expander: least-waste
    balanceSimilarNodeGroups: false
    emitPerNodegroupMetrics: true
    scaleDownUtilizationThreshold: 0.5
    scaleDownDelayAfterAdd: 10m
    scaleDownUnneededTime: 10m
```

`least-waste` prefers the option with less unused capacity after placing the triggering Pods. It does not promise the lowest EC2 price. Choose an expander that matches the actual objective rather than inferring cost behavior from its name.

When enabled through kOps, the addon, AWS permissions, and ASG discovery tags are generated from cluster and InstanceGroup state. An InstanceGroup with role `Node` is eligible by default unless `spec.autoscale` is set to `false`; setting `autoscale: true` makes intent visible.

## Use Priority When Business Preference Matters

If interruption-tolerant work should prefer Spot and fall back to general capacity, use the priority expander:

```yaml
spec:
  clusterAutoscaler:
    enabled: true
    expander: priority
```

Then set a priority on eligible InstanceGroups:

```yaml
spec:
  autoscale: true
  autoscalePriority: 100
```

kOps creates the priority-expander ConfigMap from `autoscalePriority` values. Higher-priority groups are considered first under the priority expander. Scheduling constraints still apply: Cluster Autoscaler cannot select a preferred group if its template cannot run the Pending Pod.

Use `customPriorityExpanderConfig` in the cluster spec only when regex-based matching is actually needed. According to the kOps addon documentation, custom priority configuration takes precedence over InstanceGroup priority fields.

## Apply and Rotate Only What Changed

Preview the full update:

```bash
kops update cluster "$CLUSTER_NAME"
```

Review the creation or modification of ASGs, launch templates, IAM policy, and addon resources. Then apply:

```bash
kops update cluster "$CLUSTER_NAME" --yes
```

Node labels and taints are launch-time configuration. Existing nodes may need a rolling update before their real labels match the template Cluster Autoscaler uses for simulation:

```bash
kops rolling-update cluster "$CLUSTER_NAME"
kops rolling-update cluster "$CLUSTER_NAME" --yes
```

Restrict the rolling update with `--instance-group` when only selected groups changed. Do not rotate healthy groups merely because autoscaler was enabled.

## Understand Scale from Zero

At zero nodes, the autoscaler cannot inspect a live node from the group. Its AWS provider derives the template from the launch template and ASG tags. kOps adds node-template labels and taints needed for discovery when it creates the group.

Scale-from-zero failures commonly come from:

- labels or taints added directly to live Node objects instead of the InstanceGroup;
- out-of-band changes to ASG tags or launch templates;
- a Pod selector that does not match the generated node template;
- missing zone or volume compatibility;
- resource requests larger than the prospective node's allocatable capacity.

Keep scheduling properties in the kOps InstanceGroup so a zero-sized group still has a truthful template.

## Treat Mixed-Instance Groups Carefully

The Cluster Autoscaler AWS documentation says that, for an ASG with Mixed Instances Policy overrides, it uses the first listed instance type when simulating capacity. AWS might launch another allowed type.

Therefore, list types with approximately equal CPU and memory capacity. If the first type is larger than alternatives, autoscaler can predict that a Pod will fit but AWS may launch a smaller node where it does not. If the first is smaller, valid larger capacity can be overlooked.

Separate materially different sizes into different InstanceGroups. This gives the scheduler and autoscaler distinct, predictable templates.

## Balance Similar Groups Deliberately

`balanceSimilarNodeGroups: true` tells Cluster Autoscaler to keep similar groups more evenly balanced. This is useful for equivalent per-zone groups, but similarity includes labels, taints, and allocatable resources. It is not a general multi-AZ availability guarantee.

If one multi-AZ ASG backs an InstanceGroup, AWS also runs its own Availability Zone balancing process. kOps documents that `AZRebalance` can launch or terminate unexpectedly relative to Cluster Autoscaler's selection of a specific node; assess whether suspending that ASG process is appropriate for your architecture before doing so.

Do not copy a process suspension blindly. It changes AWS failure-domain behavior and transfers more balancing responsibility to your operational design.

## Validate Each Group with a Purpose-Built Test

Check addon health:

```bash
kubectl -n kube-system get deployment cluster-autoscaler
kubectl -n kube-system logs deployment/cluster-autoscaler --tail=300
```

Inspect the groups and nodes:

```bash
kops get ig --name "$CLUSTER_NAME"

kubectl get nodes \
  -L kops.k8s.io/instancegroup,workload-class,capacity-type
```

For each group, create a controlled workload with the exact selector, toleration, and realistic requests that should trigger it. Observe:

1. the Pod becomes Pending for an understood capacity reason;
2. Cluster Autoscaler reports the group as a viable expansion option;
3. the correct ASG desired capacity increases;
4. the new node registers with expected labels and taints;
5. the Pod schedules;
6. the node becomes removable after the configured unneeded period when the workload is deleted.

## Debug Selection Decisions

Start with Pod events:

```bash
kubectl describe pod -n application pending-pod
```

Then correlate the autoscaler log. Common messages reveal that:

- a new node would not satisfy the selector or affinity;
- the Pod would not tolerate the template's taint;
- the node group reached maximum size;
- the group is in backoff after failed node launches;
- a scale-down is blocked by a PodDisruptionBudget or non-evictable Pod.

Do not respond by raising every maximum. First establish which template should run the workload and why it cannot.

## Keep One Desired-Capacity Owner

Cluster Autoscaler should be the only controller changing desired capacity for its ASGs. Avoid attaching EC2 metric policies, scheduled actions, or separate automation to the same groups. Manual emergency changes can also be reverted by the controller.

If a group must be managed outside Cluster Autoscaler, set `spec.autoscale: false` and document its capacity owner.

Multiple groups work well when each has a precise contract: what Pods it can run, how it is identified, its safe size range, and how the autoscaler should prefer it. The controller can then make a scheduling decision instead of guessing among ambiguous pools.

## Official Documentation

- [kOps: Managed Cluster Autoscaler addon](https://kops.sigs.k8s.io/addons/#cluster-autoscaler)
- [kOps: InstanceGroup resource](https://kops.sigs.k8s.io/instance_groups/)
- [kOps: Rolling updates](https://kops.sigs.k8s.io/operations/rolling-update/)
- [Kubernetes: Node autoscaling](https://kubernetes.io/docs/concepts/cluster-administration/node-autoscaling/)
- [Kubernetes Autoscaler: AWS provider and multiple ASGs](https://github.com/kubernetes/autoscaler/blob/master/cluster-autoscaler/cloudprovider/aws/README.md)
- [Kubernetes Autoscaler: Cluster Autoscaler FAQ](https://github.com/kubernetes/autoscaler/blob/master/cluster-autoscaler/FAQ.md)
- [Kubernetes: Assigning Pods to nodes](https://kubernetes.io/docs/concepts/scheduling-eviction/assign-pod-node/)
- [Kubernetes: Taints and tolerations](https://kubernetes.io/docs/concepts/scheduling-eviction/taint-and-toleration/)
