# How to Scale a kOps InstanceGroup Without Accidentally Upgrading Kubernetes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: kOps, Kubernetes, AWS, InstanceGroup, Scaling, Change Management

Description: Change one kOps worker group's capacity with a scoped dry run while holding the cluster Kubernetes version and node template constant.

---

Scaling an InstanceGroup and upgrading Kubernetes are separate changes. A capacity-only operation edits the InstanceGroup's size bounds; a Kubernetes upgrade edits `spec.kubernetesVersion` in the Cluster resource and typically rotates nodes.

The safe way to keep those changes separate is to record the version, edit only the target InstanceGroup, use a scoped `kops update cluster` dry run, and reject any preview that changes launch configuration or cluster components.

## First Identify the Capacity Owner

Before changing a number, determine who controls the backing group's desired capacity:

- **Fixed-size group:** kOps/ASG bounds keep a constant size, commonly with `minSize` equal to `maxSize`.
- **Cluster Autoscaler group:** Cluster Autoscaler changes desired capacity between the InstanceGroup's minimum and maximum.
- **Karpenter-managed group:** Karpenter NodePool semantics apply instead of an ASG managed by Cluster Autoscaler.
- **External automation:** a Terraform workflow, scheduled action, or another controller may own capacity.

Do not make an exact manual desired-capacity change while Cluster Autoscaler is active and expect it to persist. The controller can legitimately change it again. For an autoscaled group, adjust the floor or ceiling; for a fixed group, change the fixed size.

## Capture the Version and Current Spec

Use the intended state store and cluster name:

```bash
export KOPS_STATE_STORE=s3://example-kops-state
export CLUSTER_NAME=prod.example.com
export INSTANCE_GROUP=workers-eu-west-2a

kops version
kops get cluster "$CLUSTER_NAME" -o yaml
kops get ig "$INSTANCE_GROUP" --name "$CLUSTER_NAME" -o yaml
```

Record these fields:

```yaml
spec:
  kubernetesVersion: 1.xx.y
```

and, from the InstanceGroup:

```yaml
spec:
  machineType: m7i.large
  minSize: 3
  maxSize: 3
```

Use a kOps binary version supported for the cluster's current Kubernetes version. Do not change kOps binaries in the middle of a capacity operation: a newer release can introduce regenerated defaults even when no Kubernetes upgrade was intended.

## Choose the Correct Size Change

### Fixed worker group

To scale from three nodes to five, set both bounds to five:

```yaml
spec:
  minSize: 5
  maxSize: 5
```

This creates a fixed-size group. Increasing the minimum above current desired capacity causes AWS to launch capacity.

### Autoscaled worker group

To permit more scale-out while retaining the same baseline:

```yaml
spec:
  autoscale: true
  minSize: 3
  maxSize: 12
```

Changing the maximum from eight to twelve does not immediately add four nodes. It only gives Cluster Autoscaler more room to increase desired capacity when Pending Pods can use the group's template.

To raise the guaranteed baseline, raise `minSize`. Do not set `minSize` to a temporary peak and forget to restore it; the autoscaler cannot scale below that floor.

## Edit Only the InstanceGroup

Open the target resource, not the Cluster resource:

```bash
kops edit ig "$INSTANCE_GROUP" --name "$CLUSTER_NAME"
```

Change only `minSize` and/or `maxSize`. Avoid incidental edits to:

- `machineType` or `mixedInstancesPolicy`;
- image or architecture;
- node labels and taints;
- kubelet configuration;
- subnets, security groups, IAM, or user data.

Those fields can create a new launch-template revision and cause new scale-out nodes to differ from existing nodes.

After saving, confirm that the cluster version did not change:

```bash
kops get cluster "$CLUSTER_NAME" -o yaml
kops get ig "$INSTANCE_GROUP" --name "$CLUSTER_NAME" -o yaml
```

## Scope and Preview the Cloud Update

Current kOps provides an InstanceGroup filter for `update cluster`:

```bash
kops update cluster "$CLUSTER_NAME" \
  --instance-group "$INSTANCE_GROUP"
```

The command is a dry run without `--yes`. For a capacity-only edit, the proposed change should be limited to the target group's Auto Scaling bounds. Stop if the output proposes:

- Kubernetes version or component changes;
- a new AMI or unexpected launch-template content;
- control-plane replacement;
- networking, IAM, DNS, or addon changes;
- changes to any other InstanceGroup.

The scoped update reduces the blast radius, while the dry run proves what this particular kOps binary and stored configuration intend to do.

Apply with the identical filter:

```bash
kops update cluster "$CLUSTER_NAME" \
  --instance-group "$INSTANCE_GROUP" \
  --yes
```

Do not substitute `kops upgrade cluster` or `kops reconcile cluster`. Those commands serve version and broader reconciliation workflows, not a simple size-bound change.

## A Pure Scale-Out Does Not Need a Rolling Update

When only the size bounds change, existing nodes do not need replacement. New capacity launches from the already-current launch template and joins the cluster.

Watch the group:

```bash
kubectl get nodes \
  -L kops.k8s.io/instancegroup,node.kubernetes.io/instance-type \
  --watch
```

Then validate:

```bash
kops validate cluster "$CLUSTER_NAME" --wait 10m
```

Running a forced rolling update after a pure scale change adds disruption without applying anything useful. If the dry run also changed the launch template, the operation was not capacity-only and should be reviewed as a separate node-configuration change.

## Treat Manual Scale-Down as Disruptive

Lowering the maximum below the ASG's desired capacity makes AWS reduce desired capacity. EC2 Auto Scaling chooses instances according to its termination policies; changing kOps bounds is not itself a Kubernetes-aware drain workflow.

Before a manual scale-down:

1. confirm workloads have replicas and valid PodDisruptionBudgets;
2. confirm the remaining nodes have enough requested capacity;
3. identify local volumes, singleton Pods, and zone-constrained storage;
4. plan how the exact instances selected by ASG will be cordoned and drained;
5. monitor application availability throughout termination.

Cluster Autoscaler is usually safer for elastic scale-down because it selects a removable Node, simulates rescheduling, cordons/drains it, and then decreases the backing group. It can still be blocked by disruption budgets, local storage, system Pods, affinity, or an unhealthy cluster-and those blocks should be investigated rather than bypassed.

If an exact manual termination is required, coordinate Kubernetes drain, ASG instance protection/termination selection, and the persistent kOps bounds as one runbook. Simply draining an arbitrary node and lowering `maxSize` does not guarantee AWS terminates the node you drained.

## Verify Kubernetes Did Not Change

Check control-plane and node versions after the capacity operation:

```bash
kubectl version
kubectl get nodes -o custom-columns='NAME:.metadata.name,VERSION:.status.nodeInfo.kubeletVersion,IG:.metadata.labels.kops\.k8s\.io/instancegroup'

kops get cluster "$CLUSTER_NAME" -o yaml
```

The new nodes should report the same intended kubelet version as existing nodes in the group, subject to the normal version-skew policy for that cluster. The Cluster resource should retain the recorded `kubernetesVersion`.

Also inspect ASG state:

```bash
aws autoscaling describe-auto-scaling-groups \
  --auto-scaling-group-names ASG_NAME \
  --query 'AutoScalingGroups[0].{Min:MinSize,Desired:DesiredCapacity,Max:MaxSize,Instances:length(Instances)}'
```

For autoscaled groups, desired capacity may move after the operation. That is correct if Cluster Autoscaler owns it.

## Terraform-Managed Clusters Need a Different Apply Step

If kOps was configured with the Terraform target, do not run a direct cloud update. Generate Terraform from the kOps state in the same output directory used by the cluster:

```bash
kops update cluster "$CLUSTER_NAME" \
  --target terraform \
  --out ./cluster-infrastructure

terraform -chdir=./cluster-infrastructure plan
terraform -chdir=./cluster-infrastructure apply
```

Review the plan for only the intended ASG bounds. Direct kOps and Terraform must not compete to manage the same cloud resources.

## Capacity-Only Checklist

- Is the group managed by fixed bounds, Cluster Autoscaler, Karpenter, or another system?
- Is the current `kubernetesVersion` recorded?
- Is the kOps binary unchanged for this operation?
- Were only InstanceGroup size fields edited?
- Was `kops update cluster` scoped with `--instance-group`?
- Did the dry run exclude launch-template, cluster, and control-plane changes?
- Is a rolling update being avoided for pure scale-out?
- Is scale-down using a Kubernetes-aware removal plan?
- Do Terraform-target clusters apply through Terraform only?
- Do new nodes report the expected, unchanged Kubernetes version?

The strongest protection against an accidental upgrade is not the command name alone. It is a narrow state edit, a narrow update target, and a reviewed dry run whose diff contains only capacity.

## Official Documentation

- [kOps: `kops update cluster` and `--instance-group`](https://kops.sigs.k8s.io/cli/kops_update_cluster/)
- [kOps: Working with InstanceGroups](https://kops.sigs.k8s.io/tutorial/working-with-instancegroups/)
- [kOps: Updates and upgrades](https://kops.sigs.k8s.io/operations/updates_and_upgrades/)
- [kOps: Rolling updates](https://kops.sigs.k8s.io/operations/rolling-update/)
- [kOps: Terraform target](https://kops.sigs.k8s.io/terraform/)
- [Kubernetes: Node autoscaling](https://kubernetes.io/docs/concepts/cluster-administration/node-autoscaling/)
- [AWS: Update an Auto Scaling group](https://docs.aws.amazon.com/autoscaling/ec2/userguide/update-auto-scaling-group.html)
