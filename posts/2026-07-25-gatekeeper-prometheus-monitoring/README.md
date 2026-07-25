# Monitor Gatekeeper Audit, Denials, and Policy Latency with Prometheus

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Gatekeeper, Prometheus, Kubernetes, Observability, Admission Control

Description: Build practical Gatekeeper dashboards and alerts for webhook latency, denials, audit freshness, policy ingestion, sync health, and provider errors.

---

Gatekeeper exposes Prometheus metrics on port 8888 at `/metrics` by default. A useful monitoring design answers four questions:

1. Is admission available and fast?
2. Is policy loading healthy?
3. Is audit completing and finding drift?
4. Are synchronized data and external providers healthy?

No single metric answers all four.

## Verify the endpoint and exact names

Read one Pod locally:

```bash
kubectl port-forward -n gatekeeper-system <gatekeeper-pod> 8888:8888
curl -s http://127.0.0.1:8888/metrics \
  | grep '^gatekeeper_'
```

Gatekeeper v3.23 uses the OpenTelemetry Prometheus exporter's default naming, so counter series have a `_total` suffix. Gatekeeper's metrics reference lists the underlying instrument names without that suffix. Confirm the live exposition after an upgrade or exporter customization before copying queries.

Scrape every serving replica and the singleton audit Pod. If only one Service selects both operations, keep the `pod` and workload labels so a dashboard can distinguish them.

For Prometheus Operator, a PodMonitor can target the metrics port. Adapt selectors to the labels in your installation:

```yaml
apiVersion: monitoring.coreos.com/v1
kind: PodMonitor
metadata:
  name: gatekeeper
  namespace: monitoring
spec:
  namespaceSelector:
    matchNames:
      - gatekeeper-system
  selector:
    matchLabels:
      control-plane: controller-manager
  podMetricsEndpoints:
    - port: metrics
      path: /metrics
      interval: 30s
```

Confirm the Pod actually names port 8888 `metrics`. Chart and operator labels can differ.

## Monitor validation traffic and latency

Gatekeeper exposes:

- `gatekeeper_validation_request_count_total`
- `gatekeeper_validation_request_duration_seconds`
- `gatekeeper_mutation_request_count_total`
- `gatekeeper_mutation_request_duration_seconds`

A p99 validation query is:

```promql
histogram_quantile(
  0.99,
  sum by (le) (
    rate(gatekeeper_validation_request_duration_seconds_bucket[5m])
  )
)
```

Denied request rate:

```promql
sum(
  rate(gatekeeper_validation_request_count_total{
    admission_status="deny"
  }[5m])
)
```

Keep mutation and validation latency separate. Kubernetes calls mutating webhooks sequentially and validating webhooks later, so one can be healthy while the other dominates admission.

Alert on latency relative to the configured webhook `timeoutSeconds`, not an arbitrary universal threshold. Include CPU throttling, memory, restarts, ready endpoints, and API server admission metrics on the same dashboard.

## Interpret denials carefully

A denial spike can mean:

- A newly enforced Constraint found real violations.
- A deployment system repeatedly retries one bad object.
- A policy change created false positives.
- An application rollout introduced drift.

Gatekeeper request metrics are intentionally aggregate. Do not add resource names or images as Prometheus labels and create unbounded cardinality.

For detail, enable `--log-denies` or admission events according to retention and volume requirements. Correlate the aggregate spike with structured logs.

If the API server cannot reach Gatekeeper at all, Gatekeeper never sees the request. Its request counters cannot detect that failure. Monitor API server webhook errors, Service endpoints, and scrape availability too.

## Monitor audit freshness, not only violations

Key audit series are:

- `gatekeeper_audit_last_run_time`
- `gatekeeper_audit_last_run_end_time`
- `gatekeeper_audit_duration_seconds`
- `gatekeeper_violations`

Alert when a completed audit is stale:

```promql
time() - max(gatekeeper_audit_last_run_end_time) > 300
```

Set the threshold above the configured audit interval plus the worst expected run duration. A start timestamp without a recent end timestamp can indicate a stuck or repeatedly failing audit.

Show violations by enforcement action:

```promql
sum by (enforcement_action) (
  gatekeeper_violations
)
```

`gatekeeper_violations` is the aggregate from the latest run. It is not limited by the default 20 individual entries stored in Constraint status.

Separate `deny`, `warn`, and `dryrun` on dashboards. A large dry-run baseline can be expected during rollout, while growth after the baseline needs investigation.

## Alert on policy ingestion

Monitor:

- `gatekeeper_constraints{status="error"}`
- `gatekeeper_constraint_templates{status="error"}`
- `gatekeeper_constraint_template_ingestion_count_total{status="error"}`
- `gatekeeper_expansion_templates{status="error"}`
- `gatekeeper_mutators{status="error"}`
- `gatekeeper_mutator_conflicting_count`

An ingestion error can leave intended policy inactive even while the webhook itself is healthy.

Use per-pod metrics to find one stale replica. A cluster-wide sum can hide disagreement when healthy replicas outnumber an unhealthy one.

## Monitor synchronized data and providers

Referential policy depends on:

- `gatekeeper_sync`
- `gatekeeper_sync_duration_seconds`
- `gatekeeper_sync_last_run_time`
- `gatekeeper_watch_manager_watched_gvk`
- `gatekeeper_watch_manager_intended_watch_gvk`

Alert when intended and active watched GVK counts diverge for a sustained period. Track cached object counts for sudden drops.

External data adds:

- `gatekeeper_providers{status="error"}`
- `gatekeeper_provider_error_count_total`

Provider health must be correlated with validation latency and provider-side metrics. A cache can temporarily hide an upstream outage, which is useful for availability but important during incident analysis.

## Example Prometheus alerts

Tune all thresholds to the cluster:

```yaml
groups:
  - name: gatekeeper
    rules:
      - alert: GatekeeperAuditStale
        expr: time() - max(gatekeeper_audit_last_run_end_time) > 300
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: Gatekeeper audit has not completed recently

      - alert: GatekeeperPolicyIngestionError
        expr: sum(gatekeeper_constraint_templates{status="error"}) > 0
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: Gatekeeper has a ConstraintTemplate ingestion error

      - alert: GatekeeperValidationP99High
        expr: |
          histogram_quantile(
            0.99,
            sum by (le) (
              rate(gatekeeper_validation_request_duration_seconds_bucket[5m])
            )
          ) > 0.5
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: Gatekeeper validation p99 exceeds the admission budget
```

Add an `absent()` alert for each required operation so missing scrapes do not look like zero errors:

```promql
absent(gatekeeper_validation_request_count_total)
```

## Use execution statistics for deep diagnosis

`--log-stats-admission` and `--log-stats-audit` log per-template execution statistics. Enable them for a bounded diagnostic window when aggregate latency identifies a problem but metrics cannot identify the policy.

The logs can be high volume. Do not enable them permanently without capacity and privacy review.

## Official documentation

- [Gatekeeper metrics and observability](https://open-policy-agent.github.io/gatekeeper/website/docs/metrics/)
- [Gatekeeper audit metrics and events](https://open-policy-agent.github.io/gatekeeper/website/docs/audit/)
- [Gatekeeper runtime metric flags](https://open-policy-agent.github.io/gatekeeper/website/docs/runtime-flags/)
- [Prometheus histogram query guidance](https://prometheus.io/docs/practices/histograms/)
