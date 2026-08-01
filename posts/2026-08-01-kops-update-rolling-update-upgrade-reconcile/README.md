# `kops update`, `rolling-update`, `upgrade`, or `reconcile`: Which to Run?

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: kOps, Kubernetes, Cluster Operations, Rolling Update, Upgrade, Reconciliation

Description: Choose the correct kOps command by separating desired-version selection, cloud-resource updates, instance replacement, and version-skew-safe reconciliation.

---

The four commands operate at different layers. Their names sound interchangeable, but running the wrong one can leave a change only half applied or can rotate instances that did not need replacement.

The shortest accurate model is:

| Command | Primary job | Changes running infrastructure with `--yes`? |
| --- | --- | --- |
| `kops upgrade cluster` | Select and write a Kubernetes version into desired state | No complete rollout; another command must finish it |
| `kops update cluster` | Make cloud resources match the cluster and instance-group specs | Yes |
| `kops rolling-update cluster` | Replace instances that do not match the latest generated specification | Yes |
| `kops reconcile cluster` | Sequence cloud updates and rotations across control plane and nodes | Yes |

All four support a non-applying preview in their documented workflows. Use explicit cluster and state-store arguments during production work.

## `kops update cluster`: Generate and Apply Cloud Changes

Use `update` after editing a Cluster or InstanceGroup when kOps must change cloud resources such as launch templates, Auto Scaling Groups, load balancers, IAM policies, or security groups.

Preview first:

```bash
CLUSTER_NAME=prod.example.com
STATE_STORE=s3://company-kops-state

kops update cluster "${CLUSTER_NAME}" \
  --state "${STATE_STORE}"
```

Apply the reviewed plan:

```bash
kops update cluster "${CLUSTER_NAME}" \
  --state "${STATE_STORE}" \
  --yes
```

`update` does not generally replace every already-running instance. The command reference explicitly warns that a subsequent rolling update may be required when nodes need the new specification.

Typical uses include:

- applying an instance-group machine type or image change;
- changing security groups or load-balancer configuration;
- generating a new launch-template revision;
- applying a non-upgrade cluster-spec change;
- previewing drift before an approved change.

Do not assume that an empty `update` preview means every node is current. Check `rolling-update` separately.

## `kops rolling-update cluster`: Replace Stale Instances

Use `rolling-update` after the relevant cloud-resource update has been applied. It selects instances when, among other documented reasons, they were created from an older specification, were detached by an interrupted surge, carry the `kops.k8s.io/needs-update` annotation, or `--force` was supplied.

Preview selection:

```bash
kops rolling-update cluster "${CLUSTER_NAME}" \
  --state "${STATE_STORE}"
```

Then run the approved rotation:

```bash
kops rolling-update cluster "${CLUSTER_NAME}" \
  --state "${STATE_STORE}" \
  --yes
```

By default, kOps validates before updating an instance group, cordons and drains each selected Kubernetes node, respects PodDisruptionBudgets through eviction, replaces instances within the configured `maxUnavailable` and `maxSurge`, and validates again before continuing.

Use it for:

- an AMI, machine type, or nodeup configuration change already applied by `update`;
- a legacy Kubernetes upgrade sequence on versions for which the official guide prescribes `update` then `rolling-update`;
- intentionally rotating nodes annotated as needing update;
- resuming an interrupted rolling update after the underlying failure is fixed.

`--force` means “select instances even when kOps sees no ordinary need.” It does not mean “resume,” “ignore validation,” or “repair the cluster.” `--cloudonly` skips cluster validation and also skips normal cordon/drain behavior; the CLI warns that it can cause downtime. Neither belongs in a routine rollout.

## `kops upgrade cluster`: Change the Desired Kubernetes Version

`upgrade` checks for and applies a recommended Kubernetes version to the cluster specification. Without `--yes`, preview its choice:

```bash
kops upgrade cluster "${CLUSTER_NAME}" \
  --state "${STATE_STORE}"
```

For a controlled change, supply an exact version that the installed kOps release supports:

```bash
TARGET_VERSION="${TARGET_VERSION:?set an exact supported v1.x.y version}"

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

This does not finish the running-cluster upgrade. It records the target. The next operation depends on the target Kubernetes version and deployment target.

You can make the same desired-state change manually by editing `spec.kubernetesVersion` with `kops edit cluster`. `kops upgrade` is useful when you want kOps to check a channel or an explicitly requested version.

Upgrading the **kOps binary itself** is different again. Install a newer compatible kOps release through the supported package or release mechanism; `kops upgrade cluster` upgrades the desired Kubernetes version, not the local executable.

## `kops reconcile cluster`: Sequence a Version-Safe Rollout

The current kOps Kubernetes-upgrade guide says to use `reconcile` for upgrades to Kubernetes 1.31 or newer. It replaces the direct-target combination of `kops update cluster --yes` plus `kops rolling-update cluster --yes` for that upgrade.

Preview:

```bash
kops reconcile cluster "${CLUSTER_NAME}" \
  --state "${STATE_STORE}"
```

Apply:

```bash
kops reconcile cluster "${CLUSTER_NAME}" \
  --state "${STATE_STORE}" \
  --yes
```

Reconcile updates and rolls the control-plane and API-server instance groups before making the remaining node launch configuration current, then rolls the remaining groups and prunes old cloud revisions. That interleaving prevents a newly autoscaled kubelet at the target version from reaching an older API server in an unsupported order.

Use `reconcile` when:

- the official guide for the target Kubernetes release requires it;
- the installed kOps release exposes the command and supports the target version;
- kOps manages the cloud resources directly.

It is not a replacement for selecting the target version, reading release notes, checking deprecated APIs, validating backups, or planning workload disruption.

## Choose by Intent

### I edited an InstanceGroup machine type or AMI

```text
kops update cluster (preview)
        ↓
kops update cluster --yes
        ↓
kops rolling-update cluster (preview)
        ↓
kops rolling-update cluster --yes, if replacements are reported
```

### I changed a cloud-only setting that does not require node replacement

Run `update` preview and apply. Then run a rolling preview to prove that no instances need replacement.

### I want kOps to choose or record a Kubernetes target

Run `upgrade` preview, then `upgrade --yes`. That changes desired state only. Finish with the target-version procedure below.

### I am upgrading to Kubernetes 1.31 or newer

After setting one supported next-minor target, run `reconcile` preview and then `reconcile --yes` for a direct cloud target.

### I am following an older, version-specific upgrade guide

Use that release’s documented `update` then `rolling-update` sequence. Do not transplant a modern command into an old kOps binary that does not implement it.

### A rolling update stopped halfway

Fix the health, drain, capacity, or bootstrap failure. Rerun a rolling preview; completed instances should no longer be selected, while stale or detached instances remain candidates. Resume without `--force` unless a reviewed procedure specifically requires a full rotation.

## Terraform Is a Documented Exception

When kOps generates Terraform, `kops update cluster --target=terraform` writes configuration; Terraform applies it. The Kubernetes 1.31+ upgrade tutorial documents a targeted Terraform apply for control-plane groups, a control-plane rolling update, a full Terraform apply, and then the remaining rolling update.

Do not run direct-target `reconcile --yes` and assume it updates Terraform-managed resources. Follow the kOps Terraform section from the same output directory and review every Terraform plan.

## Resolve Documentation by Target Version

Generated command reference pages can summarize the historical `update` plus `rolling-update` finish. The current version-specific kOps upgrade guide adds the `reconcile` requirement for Kubernetes 1.31+. When they appear to differ, follow:

1. the target kOps release notes;
2. the target Kubernetes upgrade tutorial;
3. the command reference for the installed binary;
4. the correct direct or Terraform target workflow.

Check locally before a maintenance window:

```bash
kops version
kops reconcile cluster --help
kops upgrade cluster --help
```

The right command is therefore determined by the layer you intend to change, the target Kubernetes version, and who owns cloud-resource application. Keeping those decisions explicit prevents the most common half-upgrade: desired state changed, cloud templates updated, but running instances left at a different version.

## Official Documentation

- [kOps CLI: `kops update cluster`](https://kops.sigs.k8s.io/cli/kops_update_cluster/)
- [kOps CLI: `kops rolling-update cluster`](https://kops.sigs.k8s.io/cli/kops_rolling-update_cluster/)
- [kOps CLI: `kops upgrade cluster`](https://kops.sigs.k8s.io/cli/kops_upgrade_cluster/)
- [kOps CLI: `kops reconcile cluster`](https://kops.sigs.k8s.io/cli/kops_reconcile_cluster/)
- [kOps: Updates and Upgrades](https://kops.sigs.k8s.io/operations/updates_and_upgrades/)
- [kOps: Upgrading Kubernetes, Including 1.31+ and Terraform](https://kops.sigs.k8s.io/tutorial/upgrading-kubernetes/)
- [kOps: Rolling Updates](https://kops.sigs.k8s.io/operations/rolling-update/)
