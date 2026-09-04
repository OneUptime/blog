# Kubernetes Events Never Expire: Verify `--event-ttl` and Reclaim etcd Space Safely

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Event, Kubernetes API Server, etcd, Storage, Troubleshooting

Description: Distinguish continuously updated Event series from broken expiration, align event TTL across API servers, and reclaim etcd storage without bypassing Kubernetes or quorum safety.

---

Kubernetes Events are best-effort, short-lived diagnostic objects. The kube-apiserver flag `--event-ttl` controls retention and defaults to one hour. Yet `kubectl get events` can show an Event whose apparent age is days old. That is not automatically a TTL failure: repeated occurrences can update the same Event series, preserving its original creation time while refreshing its last-observed time and storage lease.

Before deleting data or touching etcd, prove whether old, inactive Event objects really remain. Then align every kube-apiserver replica, stop the event source if it is flooding, and let Kubernetes delete through its API. Compaction and defragmentation solve different storage layers and must be handled as etcd maintenance.

## Measure the Right Event Timestamp

Count Events and inspect both creation and most recent observation:

```bash
kubectl get events --all-namespaces -o json |
  jq -r '.items[] |
    [.metadata.namespace, .metadata.name,
     .metadata.creationTimestamp,
     (.series.lastObservedTime // .eventTime //
      .deprecatedLastTimestamp // .lastTimestamp // "-"),
     (.series.count // .deprecatedCount // .count // 1),
     .reason] | @tsv' |
  sort -k4
```

Field availability differs between the `events.k8s.io/v1` and legacy core representations. Use the server's returned schema and inspect a sample object rather than assuming every timestamp is present.

Classify an Event as suspicious only when its **last observation or update** is older than the configured TTL plus reasonable clock and observation delay. A three-day creation timestamp with a last observation two minutes ago is an active series, not an unexpired dead Event.

Also compare the Event object's `.metadata.resourceVersion` over time. If it keeps changing, a producer is refreshing it. Events are supplemental diagnostics, not a durable audit trail; export selected data to a log or event backend if longer retention is required.

## Read the Effective Flag on Every API Server

On a kubeadm control plane, inspect each static Pod manifest and running process:

```bash
sudo grep -n -- '--event-ttl' /etc/kubernetes/manifests/kube-apiserver.yaml
sudo crictl ps --name kube-apiserver
sudo crictl inspect <container-id>
```

If the flag is absent, the documented default is `1h0m0s`. Check all replicas for:

- an explicit zero or unexpectedly long duration;
- different manifests or rendered configuration;
- a failed rollout where old API servers remain behind the load balancer;
- a management tool that keeps reverting the value; and
- clock skew large enough to confuse diagnosis.

For a managed control plane, use the provider's supported configuration and support diagnostics rather than editing inaccessible component flags. Keep the TTL comfortably long enough for operators and automation to consume Events, but do not use it as an observability-retention setting.

After changing a static Pod manifest, roll one control-plane node at a time and keep quorum plus at least one ready API server. Validate `/readyz?verbose` before moving to the next replica. A synchronized restart can warm every watch cache against etcd at once.

## Distinguish Expiration From Event Flooding

Graph creation and update traffic separately where labels allow:

```promql
sum by (instance, verb, code) (
  rate(apiserver_request_total{resource="events"}[5m])
)
```

Group active Events by reporting controller, reason, namespace, involved object, and source. A component that records a warning on every retry can keep a series active forever and write a new etcd revision for each update. Correct the underlying failure and make the producer use the standard event recorder's aggregation and spam controls.

Do not delete evidence first. Preserve a bounded export of relevant Events, component logs, audit metadata, and metrics for the incident timeline. Event messages can contain workload names and operational details, so apply normal access and retention controls.

## Verify Deletion Through the Kubernetes API

Once the TTL is consistent, create a harmless Event in a test namespace through a supported recorder or observe an existing inactive test Event. Confirm it disappears after the configured period. Do not use a continually updated object for this test.

If immediate cleanup is required because etcd is near quota, delete Events through kube-apiserver in controlled namespace batches:

```bash
kubectl -n noisy-test get events --no-headers | wc -l
kubectl -n noisy-test delete events --all --request-timeout=30s
```

Start with a noncritical namespace, monitor API and etcd latency, and pause between batches. This operation permanently removes troubleshooting data and can generate substantial delete and watch traffic. Never delete `/registry/events` keys directly with `etcdctl`; bypassing Kubernetes storage semantics is unsupported and a prefix mistake can destroy cluster state.

If objects older than the TTL remain after all writers stop, inspect kube-apiserver logs and etcd lease metrics/errors for the affected time. Verify that the Events use the normal storage path and that no API-server storage override points Events at an unhealthy secondary etcd cluster.

## Understand Why Disk Space Does Not Shrink Immediately

Four states matter:

1. TTL expiry or an API delete removes the current Event key.
2. etcd still retains historical revisions until compaction.
3. Compaction makes old revision space reusable **inside** the backend database.
4. Defragmentation rewrites one member's backend and returns reusable space to its filesystem.

The kube-apiserver has an `--etcd-compaction-interval` flag, defaulting to five minutes in the current reference. Separately, etcd can use automatic history compaction. Confirm the actual deployment's ownership model; do not run competing ad hoc compaction schedules without understanding it.

Deleting Events therefore may reduce live key count before the database file shrinks. Use etcd endpoint status and metrics to compare database size with size in use, and check alarms:

```bash
etcdctl --endpoints="$ETCD_ENDPOINTS" \
  --cacert="$ETCD_CA" --cert="$ETCD_CERT" --key="$ETCD_KEY" \
  endpoint status --cluster --write-out=table
etcdctl --endpoints="$ETCD_ENDPOINTS" \
  --cacert="$ETCD_CA" --cert="$ETCD_CERT" --key="$ETCD_KEY" \
  alarm list
```

Keep those credential paths in a root-only environment and do not paste their contents into logs.

## Compact and Defragment With Quorum Safety

Normal scheduled compaction is preferable. If an approved incident runbook requires manual maintenance:

1. Verify every member is healthy and identify the leader.
2. Save a fresh snapshot from one endpoint and validate it with `etcdutl snapshot status`.
3. Choose the compaction revision according to the runbook's history window. Compacted revisions cannot be watched or read again and can force clients to relist.
4. Compact once at cluster level.
5. Defragment one member at a time, confirming health and catch-up before the next.
6. Recheck alarms, database size, proposal latency, leader stability, and kube-apiserver readiness.

Example snapshot structure:

```bash
etcdctl --endpoints="https://etcd-1.example.net:2379" \
  --cacert="$ETCD_CA" --cert="$ETCD_CERT" --key="$ETCD_KEY" \
  snapshot save /secure-backups/etcd-before-event-maintenance.db
etcdutl --write-out=table snapshot status \
  /secure-backups/etcd-before-event-maintenance.db
```

Online defragmentation blocks reads and writes on the target member while it rebuilds state. Never target all members simultaneously, never defragment an unhealthy quorum, and avoid the current leader first when the runbook allows a safe leadership transfer. A snapshot is not useful unless restore procedures and encryption/access controls are tested.

## Prevent Recurrence

Alert on Event write rate, live Event count, oldest inactive last-observed time, etcd database size and in-use size, quota alarms, proposal latency, and API-server response codes. Review `--event-ttl` and storage overrides after every control-plane upgrade.

At producers, aggregate repeated failures, use exponential backoff, and reserve Events for operator-relevant state changes. At the API boundary, the alpha `EventRateLimit` admission controller can provide defense in depth, but it is disabled by default and rejected Events mean loss of diagnostic data. Test it against normal burst behavior before enabling it.

## Conclusion

An old Event creation time does not prove failed expiration. Check its last observation and resource version, then verify `--event-ttl` on every API server. Delete only through Kubernetes, allow compaction to make space reusable, and defragment etcd members sequentially only under a backed-up, quorum-safe maintenance plan.

## Official Documentation

- [Kubernetes Event API](https://kubernetes.io/docs/reference/kubernetes-api/cluster-resources/event-v1/)
- [Kubernetes kube-apiserver Options](https://kubernetes.io/docs/reference/command-line-tools-reference/kube-apiserver/)
- [Kubernetes Admission Controllers: EventRateLimit](https://kubernetes.io/docs/reference/access-authn-authz/admission-controllers/#eventratelimit)
- [etcd Maintenance](https://etcd.io/docs/v3.7/op-guide/maintenance/)
- [etcd: Save a Database Snapshot](https://etcd.io/docs/v3.6/tasks/operator/how-to-save-database/)
- [etcd Monitoring](https://etcd.io/docs/v3.6/op-guide/monitoring/)
