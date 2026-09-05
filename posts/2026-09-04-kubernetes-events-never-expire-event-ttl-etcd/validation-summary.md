# Validation Summary: Kubernetes Events Never Expire: Verify `--event-ttl` and Reclaim etcd Space Safely

## Status

validated

## Post Type

Technical troubleshooting and operational maintenance guide.

## Technologies Covered

- Kubernetes Events: core/v1 and events.k8s.io/v1
- kube-apiserver, kubeadm static Pods, kubectl, and crictl
- etcd leases, MVCC revisions, compaction, defragmentation, quotas, and snapshots
- Prometheus metrics and PromQL
- Bash and jq
- Event recorders and EventRateLimit admission control

## Sources Consulted

- Kubernetes kube-apiserver options: https://kubernetes.io/docs/reference/command-line-tools-reference/kube-apiserver/
- Kubernetes Event API (the post's link redirects to the core Event reference): https://kubernetes.io/docs/reference/kubernetes-api/core/event-v1/
- Kubernetes events.k8s.io/v1 field definitions, v0.35.0: https://github.com/kubernetes/api/blob/v0.35.0/events/v1/types.go
- Kubernetes Event storage TTL function: https://github.com/kubernetes/kubernetes/blob/master/pkg/registry/core/event/storage/storage.go
- Kubernetes etcd storage creation and update implementation, v1.35.0: https://github.com/kubernetes/kubernetes/blob/v1.35.0/staging/src/k8s.io/apiserver/pkg/storage/etcd3/store.go
- Kubernetes lease reuse implementation, v0.35.0: https://github.com/kubernetes/apiserver/blob/v0.35.0/pkg/storage/etcd3/lease_manager.go
- Kubernetes client-go Event aggregation and spam filtering, v0.35.0: https://github.com/kubernetes/client-go/blob/v0.35.0/tools/record/events_cache.go
- Kubernetes EventRateLimit admission controller: https://kubernetes.io/docs/reference/access-authn-authz/admission-controllers/#eventratelimit
- Kubernetes API health endpoints: https://kubernetes.io/docs/reference/using-api/health-checks/
- Kubernetes metrics reference: https://kubernetes.io/docs/reference/instrumentation/metrics/
- kubectl delete reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_delete/
- Debugging Kubernetes nodes with crictl: https://kubernetes.io/docs/tasks/debug/debug-cluster/crictl/
- etcd maintenance: https://etcd.io/docs/v3.7/op-guide/maintenance/
- etcd snapshot save and status: https://etcd.io/docs/v3.6/tasks/operator/how-to-save-database/
- etcd endpoint status and health: https://etcd.io/docs/v3.6/tasks/operator/how-to-check-cluster-status/
- etcd monitoring: https://etcd.io/docs/v3.6/op-guide/monitoring/
- Prometheus rate function: https://prometheus.io/docs/prometheus/latest/querying/functions/#rate
- jq manual: https://jqlang.org/manual/
- Author profile: https://github.com/nawazdhandala

## Issues Found

1. **First-observation timestamp could hide a later occurrence.** The jq expression preferred `eventTime` over `deprecatedLastTimestamp` and `lastTimestamp`. Since `eventTime` describes the first observation, this could incorrectly classify a repeatedly updated Event as inactive. Moved both last-occurrence fields ahead of `eventTime`, retaining series time as the first choice.
2. **Expiration timing omitted storage lease reuse.** The text allowed for clock and observation delays but omitted the lease manager's deliberate extra TTL. Clarified that retention runs from a storage write, independently of the producer's observation timestamp, and documented the v1.35 default slack of up to min(60 seconds, 5% of TTL).
3. **The post implied that consistent new flags make existing inactive Events suitable for the new-TTL test.** Existing leases are not retroactively replaced when the API server configuration changes. Restricted the test to a newly created Event and explained that old Events retain their prior expiry, including no expiry when originally stored with zero TTL, until a subsequent stored update or deletion. Adjusted the expected test window to include lease-reuse slack.
4. **Automatic expiration was described as deletion through the Kubernetes API.** Changed the introductory workflow to distinguish automatic etcd lease expiration from explicitly requested Kubernetes API deletion. The recommendation to perform manual cleanup through Kubernetes remains intact.
5. **The crictl placeholder was not valid executable shell syntax.** Replaced the unquoted `<container-id>` placeholder, which Bash interprets as redirection syntax, with a quoted `CONTAINER_ID` variable and an instruction to set it from the preceding listing.
6. **Quota recovery stopped at rechecking alarms.** An etcd `NOSPACE` alarm must be disarmed after enough space has been reclaimed before normal writes resume. Added conditional `etcdctl alarm disarm` guidance to the existing final maintenance step, with the same endpoint/TLS flags and a requirement to verify sufficient space on all members first.

## Review Notes

- Confirmed the documented one-hour Event TTL and five-minute API-server compaction interval defaults, per-resource etcd server overrides, and the distinction between Event creation age and continued updates.
- Confirmed EventRateLimit remains alpha and disabled by default in the consulted reference. Recorder aggregation and throttling are implementation-dependent; the inspected client-go legacy recorder provides both.
- The PromQL expression correctly applies `rate` before aggregation and separates request verbs and response codes. It also includes read traffic; operators should examine write verbs when diagnosing floods. `instance` normally comes from Prometheus scrape labels rather than the API server metric itself. Request counts are not identical to committed etcd writes.
- Confirmed the command structures for namespace Event deletion, etcd endpoint status, alarm inspection, snapshot save, and `etcdutl snapshot status`. Endpoint values, credentials, namespace, container ID, and backup directory must be supplied for the actual deployment.
- Confirmed compaction versus filesystem reclamation, per-member blocking during online defragmentation, and single-endpoint snapshot requirements. Sequential maintenance and tested restore procedures remain appropriate.
- All six documentation links in the post resolved to relevant official resources. The Event API link redirects to the core representation; the separate events.k8s.io/v1 fields were checked in the official API source. The author profile also resolved.
- The post mixes etcd v3.7 maintenance documentation with v3.6 snapshot and monitoring references. The operations discussed are consistent across the consulted references; operators should still use documentation and tools matching their deployed version. The added numerical lease-reuse statement is explicitly scoped to Kubernetes v1.35.
- Validation performed: all five Bash blocks passed `bash -n`; the corrected jq filter passed five synthetic cases covering series timestamps, both legacy last-occurrence fields, singleton `eventTime`, and missing timestamps. The validation JSON was parsed and checked for the exact requested status and date.
- This was a documentation/source review with local syntax and fixture checks. No live Kubernetes or etcd cluster was used; TTL expiry, control-plane rollout, deletion, snapshot restore, and maintenance were not executed against a cluster.
