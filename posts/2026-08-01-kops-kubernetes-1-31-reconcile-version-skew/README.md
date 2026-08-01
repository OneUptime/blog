# kOps to Kubernetes 1.31+: Avoid Version Skew with `reconcile cluster`

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: kOps, Kubernetes 1.31, Version Skew, Cluster Upgrade, Kubelet, Reconciliation

Description: Use `kops reconcile cluster` for Kubernetes 1.31+ upgrades so API servers advance before launch configurations can introduce newer kubelets.

---

For a kOps-managed cluster targeting Kubernetes 1.31 or newer, the historical sequence is no longer the safe default:

```text
kops update cluster --yes
kops rolling-update cluster --yes
```

The current kOps upgrade guide requires `kops reconcile cluster`. The reason is an ordering window between cloud launch configuration and the Kubernetes control plane.

This is a Kubernetes-version upgrade of a kOps cluster. Installing a newer kOps binary is still a separate prerequisite.

## The Version-Skew Rule That Controls the Upgrade

Kubernetes’ version-skew policy says:

- a kubelet must not be newer than any kube-apiserver instance it can reach;
- a kubelet can be older than kube-apiserver within the policy’s documented range;
- highly available kube-apiserver instances can differ by at most one minor;
- controller-manager, scheduler, and cloud-controller-manager must not be newer than the API servers they communicate with.

That creates a required direction: API servers advance before kubelets.

For an illustrative 1.30 → 1.31 hop, these transient states differ:

| State | Supported direction? |
| --- | --- |
| API server 1.31, kubelet 1.30 | Yes, within the documented skew |
| API server 1.30, kubelet 1.31 | No; kubelet is newer |

Kubernetes 1.31 introduced stricter behavior around this edge. The kOps guide warns that a newer kubelet connecting to older API-server nodes during this upgrade can crash.

## Why the Old Two-Step Sequence Had a Race

Historically, `kops update cluster --yes` could make all cloud instance-group launch specifications reflect the target Kubernetes version before `rolling-update` had replaced every control-plane instance.

Normally, the next rolling-update action would choose control-plane groups first. But a cloud event could occur in the gap:

```text
Desired Kubernetes version becomes 1.31
              ↓
update publishes new launch specifications
              ↓
an autoscaler or replacement launches a worker with kubelet 1.31
              ↓
old kube-apiserver 1.30 is still serving
              ↓
newer kubelet reaches older API server
```

The problem is not that a planned rolling update chooses the wrong normal order. It is that cloud groups can create instances asynchronously after their launch configuration changes.

Pausing an autoscaler reduces one trigger but is not a complete ordering guarantee. Failed instances, health checks, or operator actions can also cause replacement.

## What `reconcile cluster` Changes

The kOps tutorial describes reconcile as interleaving cloud updates with rotations. Conceptually, it performs:

1. update control-plane and API-server cloud groups;
2. roll control-plane and API-server instances;
3. update the remaining cloud groups;
4. roll the remaining instances;
5. prune old cloud-resource revisions.

The critical boundary is between steps 2 and 3. Worker launch specifications do not move to the newer kubelet until the API-serving tier has moved first.

This matches Kubernetes’ supported component order: upgrade kube-apiserver, then upgrade kubelets.

## Verify the Tool and Target Before the Window

Use a currently supported kOps release that supports both the source and target Kubernetes minors, and verify the actual binary exposes reconcile:

```bash
kops version
kops reconcile cluster --help
```

Do not infer command availability from the target number alone. Upgrade documentation and release-note wording have evolved; the installed binary’s command plus the target release’s current kOps guide are the operational facts.

Confirm the baseline:

```bash
CLUSTER_NAME=prod.example.com
STATE_STORE=s3://company-kops-state

kops get cluster "${CLUSTER_NAME}" \
  --state "${STATE_STORE}" \
  -o yaml

kops validate cluster "${CLUSTER_NAME}" \
  --state "${STATE_STORE}" \
  --wait 10m \
  --count 3

kubectl get --raw=/version
kubectl get nodes \
  -o custom-columns='NAME:.metadata.name,KUBELET:.status.nodeInfo.kubeletVersion'
```

The source should already be on a healthy patch, and the target must be exactly one minor newer. Review kOps and Kubernetes release notes, API removals, add-on compatibility, PodDisruptionBudgets, capacity, and etcd backup availability before setting it.

## Set the Exact Target Version

Either edit `spec.kubernetesVersion` or use an explicit upgrade target. The latter can be previewed:

```bash
TARGET_VERSION="${TARGET_VERSION:?set an exact supported next-minor v1.x.y version}"

kops upgrade cluster "${CLUSTER_NAME}" \
  --state "${STATE_STORE}" \
  --kubernetes-version "${TARGET_VERSION}"
```

After reviewing the proposed desired-state change:

```bash
kops upgrade cluster "${CLUSTER_NAME}" \
  --state "${STATE_STORE}" \
  --kubernetes-version "${TARGET_VERSION}" \
  --yes
```

`upgrade --yes` records the target. It does not replace `reconcile` and does not itself complete the running-cluster upgrade.

## Preview and Run Reconcile

Preview the full reconciliation without `--yes`:

```bash
kops reconcile cluster "${CLUSTER_NAME}" \
  --state "${STATE_STORE}"
```

Review:

- every control-plane and API-server group expected to rotate;
- worker groups and image changes;
- capacity and disruption strategy;
- cloud IAM, security-group, and launch-template changes;
- any unrelated default drift introduced by the newer kOps binary.

Then run the approved operation:

```bash
kops reconcile cluster "${CLUSTER_NAME}" \
  --state "${STATE_STORE}" \
  --yes
```

Monitor the API and nodes from another shell without trying to run a competing update:

```bash
kubectl get nodes -w
```

Use workload and platform monitoring for control-plane reachability, API errors, node bootstrap, critical pods, CNI/CSI, DNS, and application health. Do not treat a connected watch as the only success criterion.

## What Reconcile Replaces-and What It Does Not

For a direct-target Kubernetes 1.31+ upgrade, reconcile replaces manually applying:

```text
update --yes → rolling-update --yes
```

It does not replace:

- upgrading the local kOps binary;
- selecting one exact next-minor Kubernetes version;
- reviewing deprecated and removed APIs;
- verifying add-on and operating-system support;
- confirming etcd backups and recovery authority;
- validating workload disruption and spare capacity;
- post-upgrade observation and smoke tests.

For an ordinary non-version configuration change, `update` and a subsequent rolling preview remain useful commands. The reconcile requirement here is specifically about the Kubernetes upgrade ordering documented by kOps.

## Terraform Requires Its Own Ordered Apply

If kOps generates Terraform, do not expect direct-target reconcile to apply Terraform-managed resources. The kOps 1.31+ tutorial documents an equivalent staged workflow:

1. generate the new Terraform configuration;
2. identify the Terraform resources belonging to ControlPlane, Master, or APIServer groups;
3. target-apply those control-plane group resources;
4. roll only control-plane and API-server groups;
5. apply the complete remaining Terraform plan;
6. roll the remaining groups.

In outline:

```bash
kops update cluster "${CLUSTER_NAME}" \
  --state "${STATE_STORE}" \
  --target=terraform \
  --out=.

terraform plan
terraform state list

# Review and target only the actual control-plane group resource addresses.
terraform apply -target='CONTROL_PLANE_RESOURCE_ADDRESS'

kops rolling-update cluster "${CLUSTER_NAME}" \
  --state "${STATE_STORE}" \
  --instance-group-roles=control-plane,apiserver \
  --yes

terraform apply

kops rolling-update cluster "${CLUSTER_NAME}" \
  --state "${STATE_STORE}" \
  --yes
```

The placeholder is intentionally not executable. Resource addresses vary by provider and generated configuration. Run all Terraform steps from the existing output directory and review each plan.

## Validate the Final Version Distribution

After reconcile finishes:

```bash
kops validate cluster "${CLUSTER_NAME}" \
  --state "${STATE_STORE}" \
  --wait 15m \
  --count 3

kops update cluster "${CLUSTER_NAME}" \
  --state "${STATE_STORE}"

kops rolling-update cluster "${CLUSTER_NAME}" \
  --state "${STATE_STORE}"

kubectl get --raw=/version
kubectl get nodes \
  -o custom-columns='NAME:.metadata.name,KUBELET:.status.nodeInfo.kubeletVersion'
```

The update and rolling commands are previews here. They should reveal no unexplained pending cloud changes or stale instances.

Observe autoscaling after the upgrade by proving that a newly created node receives the target version and becomes Ready. This specifically tests the path that made the historical ordering window dangerous.

If the cluster has more minors to cross, stop at this healthy target, complete the observation period, and repeat with exactly one next minor. Reconcile fixes the order within a hop; it does not make skipped Kubernetes minors supported.

## Official Documentation

- [kOps: Upgrading Kubernetes 1.31 and Newer](https://kops.sigs.k8s.io/tutorial/upgrading-kubernetes/#note-for-kubernetes-131)
- [kOps CLI: `kops reconcile cluster`](https://kops.sigs.k8s.io/cli/kops_reconcile_cluster/)
- [kOps CLI: `kops upgrade cluster`](https://kops.sigs.k8s.io/cli/kops_upgrade_cluster/)
- [kOps: Updates and Upgrades](https://kops.sigs.k8s.io/operations/updates_and_upgrades/)
- [kOps: Releases and Versioning](https://kops.sigs.k8s.io/welcome/releases/)
- [Kubernetes: Version Skew Policy](https://kubernetes.io/releases/version-skew-policy/)
- [Kubernetes: Upgrade a Cluster](https://kubernetes.io/docs/tasks/administer-cluster/cluster-upgrade/)
