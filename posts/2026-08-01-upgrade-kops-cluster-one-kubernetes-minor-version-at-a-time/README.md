# How to Upgrade a kOps Cluster One Kubernetes Minor Version at a Time

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: kOps, Kubernetes, Cluster Upgrade, Version Skew, Deprecated APIs, etcd Backup

Description: Upgrade a kOps cluster through consecutive Kubernetes minors with compatible tooling, exact target patches, preflight checks, and validation after every hop.

---

If a cluster is several Kubernetes minors behind, do not jump directly to the final release. Turn the migration into a sequence of independently validated upgrades:

```text
1.N → 1.(N+1) → validate → 1.(N+2) → validate → final minor
```

kOps recommends one minor at a time because skipped releases compound API removals and version-specific changes. Kubernetes’ version-skew policy is stronger: the API-server upgrade order does not permit skipping minor versions.

Each hop should target a current patch in exactly one next minor, use a compatible kOps binary, and finish with a healthy cluster before the next hop begins.

## Build a Version Route Before Changing State

Capture the installed tools, desired version, API-server version, and node versions:

```bash
CLUSTER_NAME=prod.example.com
STATE_STORE=s3://company-kops-state

kops version
kops get cluster "${CLUSTER_NAME}" \
  --state "${STATE_STORE}" \
  -o yaml

kubectl version
kubectl get --raw=/version
kubectl get nodes \
  -o custom-columns='NAME:.metadata.name,KUBELET:.status.nodeInfo.kubeletVersion,OS:.status.nodeInfo.osImage'
```

Record a route such as:

| Hop | Starting minor | Exact target patch | Compatible kOps release | Change window |
| --- | --- | --- | --- | --- |
| 1 | 1.N | v1.(N+1).P | Reviewed | Window 1 |
| 2 | 1.(N+1) | v1.(N+2).P | Reviewed | Window 2 |

Do not write “latest” into the plan. Patch releases and kOps support move over time. Choose an exact target from the current official kOps support policy, target release notes, and organization’s tested image/add-on matrix.

kOps documents that a release supports Kubernetes up to the matching minor, with the preceding two minors supported and two older minors deprecated for migration. It recommends using the latest kOps release that supports the Kubernetes version. Check the live policy rather than assuming that a historical matrix is still supported.

## Upgrade the kOps Tool Deliberately

The local kOps binary computes desired cloud configuration. A newer binary can introduce default changes even when the Kubernetes version stays constant.

Before using it against production:

1. install a stable kOps release compatible with both the current and next Kubernetes minor;
2. read every intervening kOps release note;
3. run `kops update cluster` without `--yes` and review unrelated drift;
4. test the same path on a representative non-production cluster.

Do not confuse installing a newer kOps binary with `kops upgrade cluster`. The latter changes the cluster’s desired Kubernetes version.

## Clear API and Add-on Blockers for the Next Minor

For each target, review the Kubernetes Deprecated API Migration Guide and the target release notes. Kubernetes recommends using client warnings, API-server metrics, and audit data to locate deprecated API calls.

Inventory at least:

- objects and manifests using API versions removed by the target;
- admission webhooks and conversion webhooks;
- CNI, CSI, cloud-controller, autoscaler, metrics, and ingress versions;
- operators and custom controllers with Kubernetes client dependencies;
- deprecated component flags and feature gates;
- CRD stored versions and conversion behavior;
- node operating systems, container runtimes, cgroups, and architecture support;
- PodDisruptionBudgets and spare capacity for node drains.

Fix callers, not only stored manifests. A CI job, old controller, or rarely used recovery script can keep requesting a removed API after live objects have been converted.

## Verify Backups and a Recovery Decision

kOps’ etcd-manager takes periodic backups and backups before cluster modifications, storing the `main` and `events` backups in the cluster’s object storage. The current documentation describes default retention, but retention is not proof of recoverability.

Before every hop:

- confirm recent backups exist for both etcd clusters;
- confirm the recovery role can read the state store and decrypt it;
- preserve the kOps cluster and instance-group manifests securely;
- document the last safe point and the stop/restore decision owner;
- test restore procedures outside the production incident path.

An etcd restore is disruptive, can lose resources created after the backup, and is not an “undo” button. Changing `spec.kubernetesVersion` back is also not a general Kubernetes downgrade procedure.

## Establish a Healthy Baseline

Do not start from a cluster already consuming its disruption budget:

```bash
kops validate cluster "${CLUSTER_NAME}" \
  --state "${STATE_STORE}" \
  --wait 10m \
  --count 3

kubectl get nodes
kubectl get pods --all-namespaces
kubectl get poddisruptionbudgets --all-namespaces
```

Resolve `NotReady` nodes, unavailable critical pods, blocked evictions, and insufficient replacement capacity first. kOps rolling updates use eviction and respect PodDisruptionBudgets; a mathematically impossible budget will block a drain rather than become safe because the maintenance window started.

## Set Exactly One Next-Minor Target

You can edit the cluster manually:

```bash
kops edit cluster "${CLUSTER_NAME}" \
  --state "${STATE_STORE}"
```

Set one exact value:

```yaml
spec:
  kubernetesVersion: v1.NEXT.PATCH
```

Replace the illustrative value with an actual supported version; do not paste `NEXT` or `PATCH` literally.

Alternatively, have kOps preview and write an explicit target:

```bash
TARGET_VERSION="${TARGET_VERSION:?set the exact next-minor v1.x.y target}"

kops upgrade cluster "${CLUSTER_NAME}" \
  --state "${STATE_STORE}" \
  --kubernetes-version "${TARGET_VERSION}"
```

Review, then apply only the desired-state change:

```bash
kops upgrade cluster "${CLUSTER_NAME}" \
  --state "${STATE_STORE}" \
  --kubernetes-version "${TARGET_VERSION}" \
  --yes
```

At this point, the target is recorded but the running cluster is not fully upgraded.

## Apply the Hop with the Version-Appropriate Workflow

### Target Kubernetes 1.31 or newer, direct cloud target

The current kOps guide requires `reconcile`:

```bash
kops reconcile cluster "${CLUSTER_NAME}" \
  --state "${STATE_STORE}"
```

Review the preview, capacity, and expected replacements. Then:

```bash
kops reconcile cluster "${CLUSTER_NAME}" \
  --state "${STATE_STORE}" \
  --yes
```

Reconcile interleaves cloud-resource changes and rotations so control-plane/API-server groups become current before node groups can launch newer kubelets.

### Older target under an older documented workflow

Follow that kOps release’s upgrade guide. The historical sequence is:

```bash
kops update cluster "${CLUSTER_NAME}" --state "${STATE_STORE}"
kops update cluster "${CLUSTER_NAME}" --state "${STATE_STORE}" --yes
kops rolling-update cluster "${CLUSTER_NAME}" --state "${STATE_STORE}"
kops rolling-update cluster "${CLUSTER_NAME}" --state "${STATE_STORE}" --yes
```

Do not use the legacy two-command sequence for a 1.31+ target when the current guide requires reconcile.

### Terraform target

Use the kOps tutorial’s Terraform-specific sequence from the existing Terraform output directory: generate Terraform, apply the instance-group resources whose role is `ControlPlane`, `Master`, or `APIServer` first, roll the control-plane and API-server nodes, apply the remaining plan, then roll remaining nodes. Direct `reconcile --yes` does not replace the Terraform apply workflow.

## Validate the Entire Hop

Do not begin the next minor when only the API server reports the target version. Validate desired state, cloud state, component health, and every node group:

```bash
kops validate cluster "${CLUSTER_NAME}" \
  --state "${STATE_STORE}" \
  --wait 15m \
  --count 3

# Direct cloud target drift preview:
kops update cluster "${CLUSTER_NAME}" \
  --state "${STATE_STORE}"

kops rolling-update cluster "${CLUSTER_NAME}" \
  --state "${STATE_STORE}"

kubectl get --raw=/version
kubectl get nodes \
  -o custom-columns='NAME:.metadata.name,KUBELET:.status.nodeInfo.kubeletVersion'
kubectl get pods --all-namespaces
```

For a Terraform target, regenerate the Terraform configuration and run `terraform plan` from the existing output directory instead of using the direct-target `kops update cluster` preview. The other validation commands still apply.

Also run workload-level smoke tests and examine:

- API-server and controller errors;
- admission-webhook failures;
- CNI and CSI health;
- scheduling and autoscaling;
- DNS and service routing;
- storage attach/mount operations;
- error rates and latency for representative applications.

Keep the cluster at that minor through a defined observation period. A quiet `kops validate` result does not exercise every custom controller or application API path.

## Stop Conditions Are Part of the Plan

Stop the hop if:

- a replacement control-plane or worker instance cannot bootstrap;
- an API removal breaks a controller or webhook;
- the cluster cannot sustain its required redundancy;
- validation repeatedly fails after a replacement;
- persistent-volume operations fail;
- workload error budgets are being consumed unexpectedly.

Do not continue to the next minor to see whether it fixes the problem. Preserve logs and cloud state, stabilize the current hop, and use the documented recovery decision.

Repeat the full preflight, apply, validation, and observation cycle for every minor. That may take more windows, but it keeps each failure attributable to one release boundary and respects the control-plane and kubelet ordering Kubernetes actually supports.

## Official Documentation

- [kOps: Updates and Upgrades](https://kops.sigs.k8s.io/operations/updates_and_upgrades/)
- [kOps: Upgrading Kubernetes](https://kops.sigs.k8s.io/tutorial/upgrading-kubernetes/)
- [kOps: Releases and Versioning](https://kops.sigs.k8s.io/welcome/releases/)
- [kOps: etcd Backup, Restore, and Encryption](https://kops.sigs.k8s.io/operations/etcd_backup_restore_encryption/)
- [Kubernetes: Version Skew Policy](https://kubernetes.io/releases/version-skew-policy/)
- [Kubernetes: Upgrade a Cluster](https://kubernetes.io/docs/tasks/administer-cluster/cluster-upgrade/)
- [Kubernetes: Deprecated API Migration Guide](https://kubernetes.io/docs/reference/using-api/deprecation-guide/)
- [Kubernetes: Disruptions and PodDisruptionBudgets](https://kubernetes.io/docs/concepts/workloads/pods/disruptions/)
