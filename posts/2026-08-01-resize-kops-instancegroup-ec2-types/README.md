# Resize or Change EC2 Types in a kOps InstanceGroup Without Rebuilding

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: kOps, Kubernetes, AWS, EC2, InstanceGroup, Rolling Update

Description: Change the EC2 type for one kOps worker group safely by updating its launch template and rotating only that group's nodes.

---

A kOps `InstanceGroup` is the machine configuration boundary for a set of nodes. On AWS, this procedure applies to the default Auto Scaling group lifecycle, where an InstanceGroup maps to an EC2 Auto Scaling group backed by a launch template. It does not apply to an InstanceGroup with `spec.manager: Karpenter`. You can therefore resize one Auto Scaling group-backed worker pool without recreating the cluster: edit the InstanceGroup, let kOps update its launch template, and perform a rolling update for that group.

The important distinction is that `kops update cluster` changes the cloud configuration used for **new** instances. Existing EC2 instances keep their old type until they are replaced.

## Confirm the Target Before Editing

Set the same cluster name and state store used to create the cluster:

```bash
export KOPS_STATE_STORE=s3://example-kops-state
export CLUSTER_NAME=prod.example.com

kops get cluster "$CLUSTER_NAME"
kops get instancegroups --name "$CLUSTER_NAME"
```

A typical worker group might appear as:

```text
NAME                ROLE   MACHINETYPE  MIN  MAX  SUBNETS
workers-eu-west-2a  Node   m6i.large    3    6    eu-west-2a
```

Make sure the group has role `Node`. Resizing a control-plane group has different availability and etcd constraints; do not treat it as an ordinary worker pool.

Record the current spec before changing it:

```bash
kops get ig workers-eu-west-2a \
  --name "$CLUSTER_NAME" \
  -o yaml
```

Also inspect workload placement and disruption constraints:

```bash
kubectl get nodes -L kops.k8s.io/instancegroup,node.kubernetes.io/instance-type
kubectl get pdb --all-namespaces
kubectl get pods --all-namespaces -o wide
```

## Choose a Compatible EC2 Type

Do not select solely by vCPU count. Check:

- CPU architecture. Moving from x86_64 to Arm requires compatible node images and workload images.
- memory, network bandwidth, EBS bandwidth, and ENI/IP limits;
- Availability Zone availability and account quotas;
- local NVMe behavior if workloads use instance-store disks;
- GPU, accelerator, or CPU-feature requirements;
- whether the AMI and operating system support the new generation.

For a straightforward same-architecture change, edit the InstanceGroup:

```bash
kops edit ig workers-eu-west-2a --name "$CLUSTER_NAME"
```

Change only `spec.machineType`:

```yaml
apiVersion: kops.k8s.io/v1alpha2
kind: InstanceGroup
metadata:
  name: workers-eu-west-2a
spec:
  machineType: m7i.xlarge
  minSize: 3
  maxSize: 6
  role: Node
  subnets:
    - eu-west-2a
```

If the group uses `mixedInstancesPolicy`, update its `instances` list or `instanceRequirements`, as applicable, instead of assuming `machineType` is the only input. When an explicit `instances` list is used and Cluster Autoscaler manages the group, keep the listed types close in allocatable CPU and memory; its AWS provider simulates the group using the first override type.

## Preview a Scoped Cloud Update

Current kOps releases can restrict an update to one InstanceGroup:

```bash
kops update cluster "$CLUSTER_NAME" \
  --instance-group workers-eu-west-2a
```

Do not add `--yes` to the first run. The preview should show a launch-template or equivalent InstanceGroup change. Stop if it proposes unrelated cluster, networking, control-plane, or Kubernetes-version changes.

Apply the reviewed change with the same scope:

```bash
kops update cluster "$CLUSTER_NAME" \
  --instance-group workers-eu-west-2a \
  --yes
```

At this point, newly launched instances use `m7i.xlarge`, but existing nodes still run their original type. This separation is useful: you can review the cloud change before causing workload disruption.

## Preview the Node Rotation

Ask kOps which instances need replacement:

```bash
kops rolling-update cluster "$CLUSTER_NAME" \
  --instance-group workers-eu-west-2a
```

kOps rolling updates cordon and drain a node before terminating it. Draining honors PodDisruptionBudgets, so an overly strict budget or an unhealthy replica can stop progress. kOps also validates the cluster and stops the rolling update if validation fails.

For additional capacity during the change, configure a rolling strategy in the InstanceGroup before applying it:

```yaml
spec:
  rollingUpdate:
    maxSurge: 1
    maxUnavailable: 0
```

`maxSurge` permits temporary extra worker capacity. On AWS, kOps implements this by detaching old instances from the Auto Scaling group so that replacements launch; the detached instances keep running until they are drained and terminated. Confirm that EC2 quotas and subnet IP space can accommodate the temporary nodes. The total number of running nodes can temporarily exceed the group's `maxSize` because detached instances no longer count toward the Auto Scaling group. A surge is not a substitute for replicated workloads and valid disruption budgets.

When the preview identifies only the intended group, start the rotation:

```bash
kops rolling-update cluster "$CLUSTER_NAME" \
  --instance-group workers-eu-west-2a \
  --yes
```

Avoid `--force` unless you understand why kOps did not mark the nodes for update. The machine-type launch-template change should normally make replacement necessary without forcing it.

## Watch the Rollout

In another terminal:

```bash
kubectl get nodes \
  -L kops.k8s.io/instancegroup,node.kubernetes.io/instance-type \
  --watch
```

Check that each replacement:

1. launches in the intended subnet and Availability Zone;
2. joins the cluster and becomes `Ready`;
3. reports the new instance type;
4. runs required DaemonSets;
5. accepts rescheduled workloads;
6. passes application and infrastructure health checks.

Afterward, validate the cluster and inspect the group:

```bash
kops validate cluster "$CLUSTER_NAME" --wait 10m

kubectl get nodes \
  -L kops.k8s.io/instancegroup,node.kubernetes.io/instance-type
```

## Common Failure Modes

### The launch template changed, but node types did not

That is expected until instances are replaced. Run the scoped rolling-update preview and then apply it during an approved disruption window.

### The rolling update stops before replacing a node

Check cluster validation, failed system Pods, PodDisruptionBudgets, unavailable replicas, and finalizers. kOps allows deletion of `emptyDir` data during its drain, so verify before the rotation that node-local data is disposable or safely replicated. Do not bypass drain or validation checks reflexively; they are often preventing a real outage.

### A new node never becomes Ready

Inspect the EC2 instance console output and node bootstrap logs. Common causes include an unsupported AMI/type combination, exhausted subnet addresses, security-group or route problems, missing capacity, architecture-incompatible images, and insufficient IAM permissions.

### Workloads remain Pending on the larger nodes

Machine size is only one scheduling input. Check node selectors, affinity, taints and tolerations, topology spread constraints, volume topology, and container resource requests.

## Roll Back Safely

If replacement nodes are unhealthy, stop the rolling update. Restore the previous machine-type settings in the kOps InstanceGroup, including the `mixedInstancesPolicy` configuration when applicable, preview and apply the scoped update, then preview a new scoped rolling update.

Do not fix the launch template directly in AWS. kOps state is the intended configuration, and a later kOps update can overwrite an out-of-band edit. Put the rollback in the InstanceGroup spec so the state store and cloud resources agree.

Changing an EC2 type is therefore a two-phase operation: update the template, then rotate the nodes. Scoping and previewing both phases keeps the rest of the cluster out of the change.

## Official Documentation

- [kOps: Working with InstanceGroups](https://kops.sigs.k8s.io/tutorial/working-with-instancegroups/)
- [kOps: InstanceGroup resource](https://kops.sigs.k8s.io/instance_groups/)
- [kOps: `kops update cluster`](https://kops.sigs.k8s.io/cli/kops_update_cluster/)
- [kOps: Rolling updates](https://kops.sigs.k8s.io/operations/rolling-update/)
- [Kubernetes: Disruptions and PodDisruptionBudgets](https://kubernetes.io/docs/concepts/workloads/pods/disruptions/)
- [AWS: Amazon EC2 instance types](https://docs.aws.amazon.com/ec2/latest/instancetypes/instance-types.html)
