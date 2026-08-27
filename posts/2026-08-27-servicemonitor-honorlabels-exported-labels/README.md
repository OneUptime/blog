# Why Do ServiceMonitor Label Conflicts Produce `exported_*`, and When Should You Set `honorLabels`?

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Prometheus, Prometheus Operator, ServiceMonitor, Labels, Federation, Troubleshooting

Description: Explain Prometheus target-versus-exporter label conflicts, the `exported_*` result, and the narrow cases where `honorLabels` should be enabled.

---

Every scraped sample can have labels from two sources:

1. the exporter includes labels in the metrics response;
2. Prometheus attaches server-side target labels such as `job`, `instance`, and labels derived from discovery.

When both sources use the same label name, Prometheus must resolve the collision. By default, `honor_labels` is false. Prometheus keeps its target label and prefixes the exporter's label name with `exported_`, repeating the prefix if necessary to avoid another collision.

## A Concrete Conflict

Suppose discovery builds this target:

```text
job="payments-api"
instance="10.42.1.17:9090"
environment="production"
```

The exporter returns:

```text
requests_total{job="worker",instance="logical-shard-4"} 42
```

With the ServiceMonitor default:

```yaml
spec:
  endpoints:
    - port: metrics
      honorLabels: false
```

the ingested series is conceptually:

```text
requests_total{
  job="payments-api",
  instance="10.42.1.17:9090",
  exported_job="worker",
  exported_instance="logical-shard-4",
  environment="production"
} 42
```

The `exported_job` and `exported_instance` labels in this example are not created by Kubernetes or Prometheus Operator. They are created by Prometheus's normal conflict-resolution behavior.

## What `honorLabels: true` Changes

Set the option on an individual ServiceMonitor endpoint:

```yaml
spec:
  endpoints:
    - port: metrics
      honorLabels: true
```

Prometheus then keeps the labels from the scraped data and ignores conflicting target labels. The example remains:

```text
requests_total{job="worker",instance="logical-shard-4",environment="production"} 42
```

`environment` is still attached because there was no conflicting exporter label. The target's `job` and `instance` values are not preserved under another name in this mode.

This can make the target page show one identity while stored samples use an exporter-controlled identity. Queries, alerts, tenancy controls, and routing that rely on `job`, `instance`, cluster, namespace, or ownership labels can become inconsistent.

## Good Uses for `honorLabels`

Prometheus documentation specifically calls out federation and Pushgateway-style use cases. Those endpoints expose metrics on behalf of other sources, so labels already in the payload can be the authoritative identity.

For federation, the destination Prometheus should preserve labels such as the source `job` and `instance` rather than replace them with the address of the source Prometheus server. The official federation example enables `honor_labels` for this reason.

Use `honorLabels: true` only when:

- the scraped endpoint intentionally represents multiple original targets;
- the payload's labels are trusted and authoritative;
- downstream queries are designed for those labels;
- platform security policy allows the target to control conflicting labels.

It is usually unnecessary for an ordinary application exporter. Exporters should avoid emitting target identity labels that Prometheus already owns.

## Why the Default Is Safer

With `honorLabels: false`, Prometheus controls the target identity while retaining the exporter's value under `exported_*`. That makes label provenance visible and protects server-assigned labels from accidental or malicious override.

Prometheus's security model warns that `honor_labels` removes this protection. In a multi-tenant cluster, a target that can set arbitrary labels might impersonate another job, namespace, or tenant in queries if those labels are honored.

Prefer fixing the exporter or renaming its conflicting label. For example, an exporter-specific logical identity could be `worker_shard` instead of `instance`.

## Check the Prometheus-Level Override

Cluster administrators can force the safe behavior for all selected scrape resources:

```yaml
apiVersion: monitoring.coreos.com/v1
kind: Prometheus
metadata:
  name: platform
  namespace: monitoring
spec:
  overrideHonorLabels: true
```

Despite the field's name, `overrideHonorLabels: true` enforces `honor_labels: false` for targets generated from ServiceMonitor, PodMonitor, and ScrapeConfig resources. An endpoint's `honorLabels: true` cannot override this administrator policy.

In kube-prometheus-stack, a Helm value can render `prometheus.prometheusSpec.overrideHonorLabels`. That is chart configuration for the same Operator CRD field. Inspect the live Prometheus object to determine the effective policy:

```bash
kubectl get prometheus platform -n monitoring \
  -o jsonpath='{.spec.overrideHonorLabels}{"\n"}'
```

An empty result means the field is unset, which is equivalent to `false`.

## Diagnose Before Changing the Flag

Look for series with a non-empty `exported_job`, a common sign—not proof—of a `job` label conflict:

```promql
count by (job, exported_job) ({exported_job!=""})
```

The selector is valid PromQL but broad. A known metric family makes the query more specific:

```promql
count by (job, exported_job) (
  requests_total{exported_job!=""}
)
```

Then inspect the raw exporter response from a trusted diagnostic environment and the target labels on the `/targets` page. Identify which source owns the correct meaning.

Choose among these fixes in order:

1. remove or rename a redundant label at the exporter;
2. rename a copied Service or Pod target label;
3. use metric relabeling for a carefully reviewed transformation;
4. enable `honorLabels` only when exporter labels must be authoritative.

When conflicts exist, changing `honorLabels` can change series identity. Existing and new series can overlap during retention, dashboards can split, and alerts can temporarily see both shapes. Treat it as a schema migration.

## Official Documentation

- [Prometheus scrape configuration and `honor_labels`](https://prometheus.io/docs/prometheus/latest/configuration/configuration/#scrape_config)
- [Prometheus federation](https://prometheus.io/docs/prometheus/latest/federation/)
- [Prometheus security model](https://prometheus.io/docs/operating/security/)
- [Prometheus Operator Endpoint API](https://prometheus-operator.dev/docs/api-reference/api/#monitoring.coreos.com/v1.Endpoint)
- [Prometheus Operator `overrideHonorLabels`](https://prometheus-operator.dev/docs/api-reference/api/#monitoring.coreos.com/v1.CommonPrometheusFields)

## Conclusion

When Prometheus's `honor_labels` conflict resolution generates an `exported_*` label, it means the exporter and Prometheus supplied the same label name while `honorLabels` was false. The default preserves Prometheus's target identity and keeps the exporter value under a new name. Enable `honorLabels` for trusted proxying cases such as federation, not as a generic way to hide conflicts, and check whether the Prometheus-level override forbids it.
