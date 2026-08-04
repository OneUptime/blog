# `external_labels` for Cluster Identity Without Series Collisions

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Prometheus, Remote Write, External Labels, Series Identity, Multi-Cluster, High Availability

Description: Design stable external labels that preserve cluster and replica identity across Remote Write, federation, alerts, and central queries.

---

A Prometheus time series is identified by its metric name and complete label set. If two Prometheus servers Remote Write samples with exactly the same labels into the same receiver tenant, the receiver sees one logical series, not two sources. Independent scrape timestamps or values can then produce duplicates, out-of-order errors, or ambiguous data.

`external_labels` adds source identity when Prometheus communicates with external systems. A small, stable label scheme prevents cross-cluster collisions and makes central queries predictable.

## Add Cluster Identity Globally

On a Prometheus server in the London production cluster:

```yaml
global:
  external_labels:
    cluster: london-production
    region: eu-west-2
    environment: production

remote_write:
  - name: central
    url: https://metrics.example.net/api/v1/write
```

A locally scraped series such as:

```text
up{job="kubelet",instance="10.0.2.17:10250"}
```

is sent externally as:

```text
up{
  job="kubelet",
  instance="10.0.2.17:10250",
  cluster="london-production",
  region="eu-west-2",
  environment="production"
}
```

Configure a different `cluster` value on every independently monitored cluster. Reusing `production` as the cluster name across several regions is not unique enough.

## Understand Where External Labels Apply

The official configuration reference defines external labels as labels added when communicating with external systems such as federation, remote storage, and Alertmanager. They are not a blanket mutation of every locally stored sample.

Consequences include:

- a local PromQL query may not show `cluster` on scraped series;
- the Remote Write receiver sees the label unless write relabeling removes it;
- alert notifications can carry it;
- federation uses it when exposing series externally;
- a receiving Prometheus's own external labels do not automatically rewrite the inbound series it stores.

If local recording rules need the cluster label as part of their input, do not assume `external_labels` makes it available in local PromQL. Add the label during scrape ingestion or attach it to rule output as appropriate.

## Existing Series Labels Win

Prometheus applies an external label only when the time series does not already have that label. If a target exports:

```text
requests_total{cluster="application-shard-7"}
```

then this global configuration does not replace that value:

```yaml
global:
  external_labels:
    cluster: london-production
```

The series retains `cluster="application-shard-7"` when sent externally. This can silently defeat a topology label design.

Audit label names before standardizing them. When `cluster` already has application meaning, choose a less ambiguous name such as:

```yaml
global:
  external_labels:
    prometheus_cluster: london-production
```

Avoid `job` and `instance` for source identity because nearly every scraped series already has them.

## Design a Stable Label Contract

A useful multi-cluster contract often contains:

```yaml
global:
  external_labels:
    environment: production
    region: eu-west-2
    prometheus_cluster: london-production
    prometheus_replica: prometheus-0
```

Each label has one job:

- `environment` groups lifecycle policy;
- `region` represents deployment geography;
- `prometheus_cluster` uniquely identifies the scrape domain or HA pair;
- `prometheus_replica` distinguishes members of an HA pair.

Names and values should be:

- stable across ordinary restarts;
- low-cardinality and drawn from a controlled vocabulary;
- identical for equivalent topology across metrics, alerts, and receivers;
- documented for central query and deduplication behavior.

Do not use a process ID, random UUID generated at startup, container ID, or constantly changing rollout hash. A label-value change creates a different remote series identity and fragments continuity.

## Handle HA Replicas Deliberately

Two HA Prometheus servers scraping the same targets need both a shared cluster identity and a unique replica identity:

```yaml
# prometheus-0
global:
  external_labels:
    prometheus_cluster: london-production
    prometheus_replica: prometheus-0
```

```yaml
# prometheus-1
global:
  external_labels:
    prometheus_cluster: london-production
    prometheus_replica: prometheus-1
```

With the replica label, the receiver gets two distinct series. This avoids two independent writers appending to the same exact label set, but it also stores two copies unless the backend implements HA ingestion deduplication or the query layer removes the replica dimension and deduplicates.

Do not give both replicas the same `prometheus_replica` value. Conversely, do not give them different `prometheus_cluster` values if the backend's HA tracker expects a shared cluster label. Receiver-specific HA behavior must be configured using that receiver's official label settings.

## Expand Environment Variables Safely

Prometheus 3.0 and later expands environment-variable references in external-label values:

```yaml
global:
  external_labels:
    prometheus_cluster: ${PROMETHEUS_CLUSTER}
    prometheus_replica: ${POD_NAME}
```

Undefined variables become empty strings. That is dangerous for identity because several deployments can silently converge on the same empty label value.

Validate the rendered runtime configuration:

```bash
curl --silent --show-error \
  http://localhost:9090/api/v1/status/config
```

Also inspect a received series at the central backend after deployment. Configuration syntax validation cannot prove that the process environment contains the intended values.

Prometheus uses `$$` to escape a literal dollar sign in an external-label value.

## Write Relabeling Sees External Labels

`write_relabel_configs` runs after external labels are applied. You can therefore select a destination or normalize outbound identity with them:

```yaml
remote_write:
  - name: eu-backend
    url: https://eu-metrics.example.net/api/v1/write
    write_relabel_configs:
      - source_labels: [region]
        regex: eu-west-2
        action: keep
```

Avoid dropping identity later in the same write relabel pipeline:

```yaml
# Risky in a multi-cluster backend.
write_relabel_configs:
  - regex: 'prometheus_cluster|prometheus_replica'
    action: labeldrop
```

Removing these labels can merge series from different clusters or replicas. Prometheus's relabel reference warns that `labeldrop` and `labelkeep` must leave metrics uniquely labeled.

## External Labels Do Not Provide Tenancy or Access Control

A label is metric data, not an authorization boundary. If a backend uses a tenant header or credentials, configure those separately:

```yaml
remote_write:
  - name: central
    url: https://metrics.example.net/api/v1/write
    headers:
      X-Scope-OrgID: platform
    authorization:
      credentials_file: /etc/prometheus/secrets/platform-token
```

The receiver may trust or rewrite labels according to its own policy. Do not let an untrusted application choose a security-sensitive tenant merely by exporting a label.

## Detect Potential Collisions

At the central backend, first verify that every expected source has a non-empty cluster label:

```promql
count by (prometheus_cluster) (up)
```

Look explicitly for missing or empty identity:

```promql
count(up{prometheus_cluster=""})
```

Then compare target identity across clusters:

```promql
count by (job, instance) (
  count by (prometheus_cluster, job, instance) (up)
)
```

Repeated `job` and `instance` values across clusters are not a collision as long as `prometheus_cluster` remains in the final label set. They are a collision risk if a later aggregation, recording rule, or relabel action removes that differentiator without intentionally aggregating values.

Receiver logs containing duplicate or out-of-order sample errors should be correlated with the exact final label set. Check:

1. both senders' effective external labels;
2. pre-existing labels with the same name;
3. outbound `write_relabel_configs`;
4. receiver-side label rewrites;
5. HA deduplication label configuration.

## Roll Out Label Changes Carefully

Changing an external-label value changes every outbound series identity. It can create a sharp increase in active series, split dashboards across old and new label values, and affect alert grouping.

Before changing the contract:

1. update central queries to tolerate the transition;
2. check receiver cardinality limits and cost;
3. deploy one source as a canary;
4. confirm old and new identities do not collide;
5. update HA tracker or query deduplication settings together;
6. document when the old label value ages out.

A small stable identity scheme is much easier to operate than many descriptive labels. Add only dimensions that central consumers genuinely use.

## Official Documentation

- [Prometheus global external labels](https://prometheus.io/docs/prometheus/latest/configuration/configuration/#configuration-file)
- [Prometheus Remote Write and write relabel order](https://prometheus.io/docs/prometheus/latest/configuration/configuration/#remote_write)
- [Prometheus relabel configuration and uniqueness warning](https://prometheus.io/docs/prometheus/latest/configuration/configuration/#relabel_config)
- [Prometheus data model and series identity](https://prometheus.io/docs/concepts/data_model/)
- [Prometheus federation](https://prometheus.io/docs/prometheus/latest/federation/)
- [Prometheus Alertmanager high availability](https://prometheus.io/docs/alerting/latest/alertmanager/#high-availability)
- [Prometheus 3.0 migration guide for external-label expansion](https://prometheus.io/docs/prometheus/latest/migration/#prometheus-30)
