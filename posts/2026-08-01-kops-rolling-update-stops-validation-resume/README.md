# Why a kOps Rolling Update Stops on Cluster Validation—and How to Resume Safely

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: kOps, Kubernetes, Rolling Update, Cluster Validation, Node Drain, Troubleshooting

Description: Diagnose the validation gate that stopped a kOps rolling update, repair cluster health, and resume only the remaining instance replacements.

---

A stopped kOps rolling update is often a safety mechanism working as designed.

Before updating an instance group, kOps validates the cluster. After replacing an instance, it waits for the cluster to validate again before moving to the next one. If required nodes or critical pods are not healthy, the default behavior is to stop instead of consuming more capacity.

The safe response is not to add `--force`. Preserve the failure, restore a stable validation baseline, preview the remaining work, and rerun the same rolling update.

## Understand the Two Validation Gates

The rolling-update documentation describes this sequence for a normal Kubernetes node:

1. validate before starting an instance group;
2. apply a soft `PreferNoSchedule` taint to selected old nodes;
3. cordon a node;
4. drain it through eviction, respecting PodDisruptionBudgets;
5. terminate and replace the cloud instance;
6. wait for the API server to observe the change;
7. wait for the cluster to validate before continuing.

Current CLI defaults include:

- `--fail-on-validate-error=true`;
- `--validation-timeout=15m`;
- `--validate-count=2` after a node update;
- `--fail-on-drain-error=true`;
- `--drain-timeout=15m`.

An initial validation failure means no instance in that group should have been replaced. A failure after replacement means the newest node, another node, or a critical pod did not reach the required state before the timeout.

## Preserve the Point of Failure

Save the complete command output and note:

- the last instance group and instance ID mentioned;
- whether cordon or drain started;
- whether a replacement instance launched;
- the exact validation, drain, API, or timeout message;
- timestamps for cloud and Kubernetes event correlation.

Then take read-only snapshots:

```bash
CLUSTER_NAME=prod.example.com
STATE_STORE=s3://company-kops-state

kops get instances "${CLUSTER_NAME}" \
  --state "${STATE_STORE}"

kops validate cluster "${CLUSTER_NAME}" \
  --state "${STATE_STORE}" \
  --wait 2m \
  -o yaml

kubectl get nodes -o wide
kubectl get pods --all-namespaces -o wide
kubectl get events --all-namespaces \
  --sort-by='.metadata.creationTimestamp'
kubectl get poddisruptionbudgets --all-namespaces
```

Structured validation output helps distinguish an expected instance that never joined, a Node that is not Ready, and a critical-priority pod that is not Ready.

Do not immediately delete the new instance or stale Node object. That can remove the evidence tying bootstrap logs, instance identity, and Kubernetes events together.

## Determine Whether Validation or Drain Stopped It

These gates are related but different:

| Failure | Typical evidence | First investigation |
| --- | --- | --- |
| Pre-group validation | Existing Node or critical pod already unhealthy | Restore baseline health |
| New node never joins | Cloud instance exists, no Node object | nodeup, S3/IAM/KMS, API DNS/network, kubelet auth |
| New node is `NotReady` | Node conditions and kubelet events | Runtime, CNI, pressure, cloud-controller initialization |
| Critical pod not Ready | Validation names pod or component | Pod logs/events, scheduling, dependencies |
| Drain timeout | Eviction retries or PDB denial | Workload replicas, PDB math, termination behavior |
| API/DNS/auth failure | kOps cannot query cluster | Operator endpoint and kubeconfig, not node health |
| Capacity timeout | Replacement cannot launch | Auto Scaling activity, quota, subnet/AZ capacity, image |

A PodDisruptionBudget normally blocks eviction rather than cluster validation. If the output says drain failed, fix the workload or budget; increasing validation timeout will not help.

## Repair the Baseline Without Advancing the Roll

Work from the failed layer:

### Existing unhealthy cluster

If validation failed before replacement, restore existing Nodes and critical pods first. Starting a roll with reduced redundancy makes every later drain riskier.

### Bootstrap failure

On the replacement instance, inspect kOps nodeup before restarting services:

```bash
sudo systemctl status kops-configuration.service --no-pager
sudo journalctl -u kops-configuration.service --no-pager
sudo journalctl -u kubelet --no-pager --since '-30 minutes'
```

Fix desired configuration, IAM, state-store access, internal API DNS, networking, image, disk, or time synchronization as indicated by the first error.

### `NotReady` replacement

Inspect conditions and events:

```bash
kubectl describe node NODE_NAME
kubectl get node NODE_NAME \
  -o jsonpath='{range .status.conditions[*]}{.type}{"="}{.status}{" reason="}{.reason}{" message="}{.message}{"\n"}{end}'
```

Resolve runtime, CNI, resource pressure, or cloud-provider initialization rather than relaxing validation.

### Critical pod failure

kOps validation requires expected control-plane pods and critical-priority pods to be running and Ready. Check scheduling, image pulls, configuration, storage, and dependencies. A pod that is merely `Running` can still be unready.

### PDB or eviction failure

Confirm the selected workload has enough healthy replicas for its `minAvailable` or `maxUnavailable`. Scale or repair the workload when appropriate. Do not delete pods directly to bypass the Eviction API; direct deletion is not protected by the PDB.

## Know What the Escape Flags Actually Mean

The similarly named options solve different problems:

### `--force`

Forces instance selection even when kOps sees no normal need for update. It does **not** bypass validation and is unnecessary for resuming instances that still have an old specification.

### `--fail-on-validate-error=false`

Allows the rolling command not to fail when validation fails. It weakens the stop condition; it does not make the cluster healthy. Use only under a reviewed recovery procedure with a known false-negative or an explicitly accepted unavailable component.

### `--cloudonly`

Skips cluster validation. The rolling-update documentation also says cloud-only instances are not cordoned or drained and warns that the option can cause downtime. Reserve it for exceptional recovery where Kubernetes API operations are impossible and the outage tradeoff is understood.

### Longer `--validation-timeout`

Appropriate when a healthy replacement predictably needs longer than 15 minutes, for example because of a measured image or bootstrap duration. It is not a fix for persistent authentication, CNI, or capacity failure.

### `--interactive`

Prompts after each replacement and can add operator checkpoints during a high-risk recovery. It does not change health criteria.

## Re-establish Consecutive Health

Before resuming, demand more than one momentary success:

```bash
kops validate cluster "${CLUSTER_NAME}" \
  --state "${STATE_STORE}" \
  --wait 10m \
  --count 3
```

Also verify application health, spare capacity, PDB allowances, and the fixed replacement path. Validation focuses on kOps’ expected nodes and critical components; it is not a substitute for workload SLOs.

If the repair changed the cluster or instance-group spec, preview and apply the required cloud-resource update before resuming:

```bash
kops update cluster "${CLUSTER_NAME}" \
  --state "${STATE_STORE}"
```

Only add `--yes` after reviewing that plan.

## Preview the Remaining Replacements

Run rolling-update without `--yes`:

```bash
kops rolling-update cluster "${CLUSTER_NAME}" \
  --state "${STATE_STORE}"
```

kOps selects instances created from an older generated specification, instances left detached by a failed or interrupted surge, and nodes annotated as needing update. Instances successfully replaced before the stop should already match and normally disappear from the preview.

Compare the preview with the recorded failure point:

- Does it include the failed group?
- Are completed groups absent?
- Is a detached surge instance accounted for?
- Are there unexpected groups, image changes, or version changes?
- Does the group’s `maxUnavailable` and `maxSurge` fit current capacity?

Unexpected selection is a reason to stop and inspect desired state, not to add `--force`.

## Resume the Same Operation

Once the preview contains only the intended remaining work:

```bash
kops rolling-update cluster "${CLUSTER_NAME}" \
  --state "${STATE_STORE}" \
  --yes
```

For a cautious recovery, add `--interactive` or intentionally scope one reviewed instance group:

```bash
kops rolling-update cluster "${CLUSTER_NAME}" \
  --state "${STATE_STORE}" \
  --instance-group nodes-eu-west-1a \
  --interactive \
  --yes
```

Scoping is not completion: run an unscoped preview afterwards so another stale group is not forgotten.

## Special Case: Kubernetes 1.31+ Upgrade

The current kOps guide says Kubernetes 1.31+ upgrades should use `kops reconcile cluster`, which orders control-plane cloud updates and rotations before worker launch configurations. If a manual `update` plus `rolling-update` sequence for such an upgrade has already stopped, do not casually switch commands midstream.

Capture actual API-server, kubelet, desired-state, and cloud launch-template versions; then use the target release’s documented recovery path. The central risk is allowing a newer kubelet to contact an older API server.

For a reconcile operation that was interrupted, restore health, preview `kops reconcile cluster`, and resume through that workflow rather than starting an independent forced roll.

## Close with a Clean Preview

After completion:

```bash
kops validate cluster "${CLUSTER_NAME}" \
  --state "${STATE_STORE}" \
  --wait 10m \
  --count 3

kops update cluster "${CLUSTER_NAME}" \
  --state "${STATE_STORE}"

kops rolling-update cluster "${CLUSTER_NAME}" \
  --state "${STATE_STORE}"
```

The last two commands are previews. Investigate any remaining cloud drift or selected instance. Then document the failed gate, evidence, durable fix, and whether validation or capacity alerting should catch the same condition before the next maintenance window.

A safe resume does not mean persuading kOps to ignore health. It means making the health gate true again and letting kOps continue only the work that remains.

## Official Documentation

- [kOps: Rolling Updates](https://kops.sigs.k8s.io/operations/rolling-update/)
- [kOps CLI: `kops rolling-update cluster`](https://kops.sigs.k8s.io/cli/kops_rolling-update_cluster/)
- [kOps CLI: `kops validate cluster`](https://kops.sigs.k8s.io/cli/kops_validate_cluster/)
- [kOps: Troubleshooting](https://kops.sigs.k8s.io/operations/troubleshoot/)
- [kOps: Upgrading Kubernetes 1.31 and Newer](https://kops.sigs.k8s.io/tutorial/upgrading-kubernetes/#note-for-kubernetes-131)
- [Kubernetes: Disruptions and PodDisruptionBudgets](https://kubernetes.io/docs/concepts/workloads/pods/disruptions/)
- [Kubernetes: Safely Drain a Node](https://kubernetes.io/docs/tasks/administer-cluster/safely-drain-node/)
