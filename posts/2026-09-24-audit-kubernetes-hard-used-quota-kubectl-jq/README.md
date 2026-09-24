# How to Audit Hard and Used Quota Across Every Namespace with kubectl and jq

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, ResourceQuota, kubectl

Description: Build a namespace-wide quota audit that preserves Kubernetes quantities, distinguishes missing status, and identifies namespaces without quota objects.

---

A quota audit should show what was configured, what the control plane has observed, and which namespaces have no quota at all. A table of percentages can hide those distinctions, especially when a quantity such as `500m` is silently treated as an ordinary number.

This procedure uses `kubectl` and `jq` with permission to list namespaces and ResourceQuotas across the cluster. It produces local JSON and TSV reports; it does not change any cluster policy.

## Capture the cluster and both inventories

Run these commands in Bash from a directory where you can retain the audit artifacts:

```bash
set -euo pipefail
audit_dir="quota-audit-$(date -u +%Y%m%dT%H%M%SZ)"
mkdir "$audit_dir"
kubectl config current-context > "$audit_dir/context.txt"
kubectl get resourcequotas --all-namespaces -o json > "$audit_dir/quotas.json"
kubectl get namespaces -o json > "$audit_dir/namespaces.json"
```

Check the commands' exit status. An authorization failure must not be converted into an empty, apparently healthy report. These two inventories are collected separately, so a namespace created or removed between requests can appear inconsistent; recheck individual anomalies before acting.

The [ResourceQuota API reference](https://kubernetes.io/docs/reference/kubernetes-api/policy-resources/resource-quota-v1/) defines `spec.hard`, `status.hard`, and `status.used`. Preserve the original JSON so another engineer can reproduce the report.

## Report all resource keys without losing missing values

```bash
jq -r '
  (["NAMESPACE","QUOTA","RESOURCE","SPEC_HARD","STATUS_HARD","USED"] | @tsv),
  (.items[] as $q
   | (((($q.spec.hard // {}) | keys)
       + (($q.status.hard // {}) | keys)
       + (($q.status.used // {}) | keys)) | unique[]) as $k
   | [$q.metadata.namespace, $q.metadata.name, $k,
      ($q.spec.hard[$k] // "MISSING"),
      ($q.status.hard[$k] // "MISSING"),
      ($q.status.used[$k] // "MISSING")]
   | @tsv)
' "$audit_dir/quotas.json" > "$audit_dir/quota-resources.tsv"
```

The union of keys catches a resource present in the desired policy but absent from status, as well as a key still visible in status after a policy change. `MISSING` is deliberately distinct from the string `0`. A newly created quota without observed usage should not appear as a verified zero-use namespace.

Read `spec.hard` as desired policy and `status.hard` as the observed accounting limit. A difference is a reason to investigate reconciliation and recent edits, not enough evidence by itself to declare an outage.

## Keep scope information beside the numbers

```bash
jq -r '
  (["NAMESPACE","QUOTA","SCOPES","SCOPE_SELECTOR"] | @tsv),
  (.items[] | [.metadata.namespace, .metadata.name,
    ((.spec.scopes // []) | tojson),
    ((.spec.scopeSelector // {}) | tojson)] | @tsv)
' "$audit_dir/quotas.json" > "$audit_dir/quota-scopes.tsv"
```

Two quotas in one namespace may overlap. For example, a Pod can consume both an overall CPU request quota and a PriorityClass-specific quota. Adding their `used` values double-counts that Pod; adding their hard limits invents capacity the admission controller does not grant. Review each applicable policy separately.

## Identify namespaces with no quota objects

```bash
jq -r --slurpfile quotaList "$audit_dir/quotas.json" '
  ($quotaList[0].items | map(.metadata.namespace) | unique) as $covered
  | .items[]
  | .metadata.name as $ns
  | select(($covered | index($ns)) == null)
  | $ns
' "$audit_dir/namespaces.json" > "$audit_dir/namespaces-without-quota.txt"
```

Treat this as a policy review queue. System namespaces may intentionally have different controls. Conversely, a namespace with one object-count quota can still lack CPU, memory, or storage budgets. Presence of any ResourceQuota is not evidence that every resource is bounded.

## Preserve quantities before calculating ratios

Kubernetes quantities have units and decimal or binary suffixes. `1` CPU and `1000m` CPU represent the same amount; `1Gi` memory and `1G` memory do not. The [resource-management guide](https://kubernetes.io/docs/concepts/configuration/manage-resources-containers/) explains these units.

Do not strip suffixes and divide with `jq tonumber`. For general utilization calculations, use a Kubernetes Quantity-aware library, normalize both sides to the same unit, handle zero hard limits explicitly, and keep missing values unknown. For a quick manual audit, the raw TSV is safer and easier to verify.

Assign each anomaly to its namespace owner: missing intended policy, a status discrepancy, or insufficient headroom for the next rollout. Retain the context and collection time with the report, then rerun after approved corrections. An audit is useful when it leads to specific policy decisions that can be checked again.
