# How to Monitor emptyDir Usage per Pod with Kubelet and Prometheus Metrics

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Kubelet, Prometheus, emptyDir, Metric, Ephemeral Storage

Description: Read named emptyDir usage from the kubelet Summary API and export deliberate per-Pod metrics without confusing them with PVC statistics.

---

Kubelet knows the per-volume statistics used for local storage accounting, and its Summary API includes volume entries with the Pod reference and volume name. The standard Prometheus metric commonly mistaken for this job, `kubelet_volume_stats_used_bytes`, is PVC-oriented and ignores volume entries without a PVC reference. It cannot identify a Pod's `emptyDir` by name.

Use the Summary API as the source for named `emptyDir` use, then expose a small custom metric if Prometheus needs a long-term time series or alert.

## Read One Pod's Volume Statistics

Find the node that hosts the Pod and proxy the authenticated kubelet Summary API through the Kubernetes API server:

```bash
NAMESPACE=payments
POD=payments-api-7d9b8c6f5d-abcde
NODE=$(kubectl get pod "$POD" -n "$NAMESPACE" \
  -o jsonpath='{.spec.nodeName}')

kubectl get --raw "/api/v1/nodes/${NODE}/proxy/stats/summary" \
  | jq --arg namespace "$NAMESPACE" --arg pod "$POD" '
      .pods[]
      | select(.podRef.namespace == $namespace and .podRef.name == $pod)
      | {
          podRef,
          volumes: [(.volume // [])[] | {
            name,
            usedBytes,
            availableBytes,
            capacityBytes,
            inodesUsed,
            inodesFree
          }]
        }
    '
```

The kubelet stats schema calls the array `volume`. Each entry has the Pod volume name and filesystem statistics. Fields can be absent when a plugin or runtime does not provide them, so collectors must handle optional values instead of treating missing data as zero use.

The Summary API combines ephemeral and persistent volume statistics. Join it with the live Pod specification to classify a volume source as `emptyDir` and to retrieve `emptyDir.sizeLimit`:

```bash
kubectl get pod "$POD" -n "$NAMESPACE" \
  -o json \
  | jq '.spec.volumes[] | select(has("emptyDir")) | {name, emptyDir}'
```

`capacityBytes` describes the underlying filesystem statistic and is not a reliable substitute for a configured disk-backed `emptyDir.sizeLimit`. When the Pod specifies a positive `sizeLimit`, compare `usedBytes` with that value.

## Why the Standard Kubelet Volume Metric Does Not Work

The Kubernetes metrics reference documents these alpha kubelet series:

```text
kubelet_volume_stats_used_bytes
kubelet_volume_stats_capacity_bytes
kubelet_volume_stats_available_bytes
kubelet_volume_stats_inodes_used
```

Their labels are `namespace` and `persistentvolumeclaim`. The upstream collector iterates volume stats and explicitly skips entries whose `PVCRef` is nil. An `emptyDir` has no PVC reference, so these series are appropriate for PVC-backed volumes, including generic ephemeral PVCs, but not for named `emptyDir` monitoring.

Likewise, `kubectl top` and the resource Metrics API expose CPU and memory, not named volume use. Filesystem metrics from the cAdvisor endpoint do not provide a stable Pod-volume-name join that can be assumed to represent one `emptyDir`.

## Export a Purpose-Built Prometheus Metric

A trusted collector can list Pods, query each relevant node's Summary API, join volume names to Pod specs, and expose metrics such as:

```text
platform_emptydir_used_bytes{namespace="payments",pod="payments-api-...",volume="scratch"} 73400320
platform_emptydir_size_limit_bytes{namespace="payments",pod="payments-api-...",volume="scratch"} 134217728
```

These are example custom names, not Kubernetes built-in metrics. Publish the collector's contract. Emit `platform_emptydir_size_limit_bytes` only for a positive configured `sizeLimit`; do not substitute zero when the field is absent or zero. A useful alert expression is:

```promql
(
  platform_emptydir_used_bytes
/
  platform_emptydir_size_limit_bytes
) > 0.8
```

Add a `for` duration appropriate to the scan interval, and alert separately when collector data disappears. Aggregate by namespace, Pod, and volume only as needed. Pod names and UIDs churn during rollouts, so control retention and label cardinality.

Directory-scan accounting is periodic and can miss deleted-but-open files. Project-quota monitoring can improve kubelet accuracy when its beta feature, supported filesystem, and user-namespace requirements are met, but Kubernetes documents it as monitoring rather than hard-quota enforcement.

## Secure Access to Kubelet Statistics

`nodes/proxy` access can reach kubelet APIs and is highly privileged. Do not expose an unauthenticated kubelet port or grant this verb broadly to application service accounts.

Prefer a tightly scoped cluster component with a dedicated service account, minimal Pod read permissions for the join, network restrictions, and audited access. A node-local collector can reduce central API fan-out, but it still needs a secure, supported way to obtain kubelet stats and Pod metadata.

## Validate What Prometheus Scrapes

Before writing alerts, compare all three views:

1. the Pod spec's volume type and `sizeLimit`;
2. the Summary API's named `usedBytes` value;
3. the collector's Prometheus sample.

Write a known-size test file in a disposable Pod, allow for kubelet's measurement interval, and confirm the increase. Delete it and verify the series falls. Test an open deleted file separately if the chosen accounting mode matters operationally.

Generic ephemeral volumes should follow the PVC path instead. Their automatically created claim has normal PVC identity and capacity; do not label that data as `emptyDir` or compare it with local ephemeral-storage limits.

## Official Documentation

- [Kubernetes node metrics data and Summary API](https://kubernetes.io/docs/reference/instrumentation/node-metrics/)
- [Kubernetes kubelet metrics reference](https://kubernetes.io/docs/reference/instrumentation/metrics/)
- [Kubernetes kubelet volume stats collector source](https://github.com/kubernetes/kubernetes/blob/master/pkg/kubelet/metrics/collectors/volume_stats.go)
- [Kubernetes kubelet stats API types](https://github.com/kubernetes/kubernetes/blob/master/staging/src/k8s.io/kubelet/pkg/apis/stats/v1alpha1/types.go)
- [Kubernetes local ephemeral storage measurement](https://kubernetes.io/docs/concepts/storage/ephemeral-storage/#ephemeral-storage-consumption-management)

## Conclusion

Read named `emptyDir` usage from each Pod's kubelet Summary API volume entries. Do not use the PVC-only `kubelet_volume_stats_*` series for this purpose. If Prometheus needs the data, export a secured, documented custom metric joined with the Pod's configured size limit.
