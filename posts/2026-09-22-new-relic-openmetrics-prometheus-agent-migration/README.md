# How to Migrate New Relic OpenMetrics Scrapers to the Prometheus Agent

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: New Relic, Prometheus, Kubernetes

Description: Migrate Kubernetes nri-prometheus collection to the New Relic Prometheus agent with explicit discovery, compatible labels, and controlled cutover.

---

For Kubernetes installations using `nri-prometheus`, New Relic documents migration to `newrelic-prometheus-agent`, which runs Prometheus in agent mode and sends metrics through remote write. This changes discovery, configuration, metadata, and some type interpretation; it is more than swapping container images.

Keep the scope clear. New Relic still documents OpenMetrics collection for Docker, while its Kubernetes migration path is the Prometheus agent. The [integration overview](https://docs.newrelic.com/docs/infrastructure/prometheus-integrations/get-started/send-prometheus-metric-data-new-relic/) also recommends remote write when you already operate a Prometheus server.

## Inventory the collection contract

Record each endpoint, scrape interval, authentication method, selected families, labels used by dashboards, and alert queries. Include targets discovered through services, pods, and static configuration. Save the installed Helm values and chart version before editing.

Build the canary around a small application with a gauge and cumulative counter. Compare target coverage and actual values, not only whether a new Agent pod becomes ready. Keep the two pipelines distinguishable during the test, preferably with separate targets or a dedicated test environment, to avoid doubling the same data.

## Configure explicit discovery

For an existing `nri-bundle` Helm deployment, the chart values nest the new agent under `newrelic-prometheus-agent`. A controlled pod-only configuration can use:

```yaml
nri-prometheus:
  enabled: false

newrelic-prometheus-agent:
  enabled: true
  config:
    kubernetes:
      jobs:
        - job_name_prefix: application-pods
          integrations_filter:
            enabled: false
          target_discovery:
            pod: true
            endpoints: false
            filter:
              annotations:
                newrelic.io/scrape: "true"
```

Retain the existing global cluster and credential configuration through your normal Helm values or secret mechanism. Treat this as a discovery fragment to merge and render, not a complete replacement for every installed value. It deliberately collects annotated pods; add separately reviewed service and static jobs for the other targets in your inventory.

Add the scrape annotation to the workload's pod template and preserve the required endpoint port/path configuration. The [agent setup documentation](https://docs.newrelic.com/docs/infrastructure/prometheus-integrations/install-configure-prometheus-agent/setup-prometheus-agent/) describes job filters and configuration nesting.

Do not assume all `prometheus.io/scrape` targets remain included by default. The default integration filter changes that behavior, and node metrics are no longer automatically collected in the same way. Render the pinned chart and compare discovered targets before applying the production cutover.

## Preserve query-critical labels intentionally

The [migration guide](https://docs.newrelic.com/docs/infrastructure/prometheus-integrations/install-configure-prometheus-agent/migration-guide/) lists renamed metadata. Common changes include `namespaceName` to `namespace`, `podName` to `pod`, and `clusterName` to `cluster_name`.

If dashboards need temporary compatibility labels, place write relabeling under the agent's `config`:

```yaml
newrelic-prometheus-agent:
  config:
    newrelic_remote_write:
      extra_write_relabel_configs:
        - source_labels: [namespace]
          target_label: namespaceName
          action: replace
        - source_labels: [cluster_name]
          target_label: clusterName
          action: replace
```

Merge this with the discovery configuration rather than defining the same YAML key twice. Add only the aliases actually required by queries, then plan their retirement. Removed metadata such as `deploymentName` cannot be reconstructed just by renaming an unrelated label.

Kubernetes label sanitization also changes. Search saved dashboards for old metadata keys and verify each replacement against fresh data.

## Audit type conversion and transformations

The legacy integration used scraped type metadata during conversion. The remote-write path can use naming conventions, so unusual names need explicit review. A counter lacking a conventional suffix or a gauge named like a counter can arrive with unintended semantics.

Use the documented `newrelic_metric_type` mapping when required, following the [remote-write configuration guide](https://docs.newrelic.com/docs/infrastructure/prometheus-integrations/install-configure-remote-write/set-your-prometheus-remote-write-integration/). Do not apply one override to all families merely to match an old graph.

Translate legacy transformation rules into the new agent's supported relabel configuration. Validate the names and labels at the stage where each rule runs; legacy `ignore_metrics` syntax is not a Prometheus relabel rule.

## Cut over with numerical checks

In the canary, generate a known batch of requests, verify its count, and compare a stable gauge. Check fresh data grouped by the new cluster and pod labels. Inspect scrape health, remote-write failures, and backlog before disabling the old collector for that target set.

Retain self-monitoring jobs when customizing static job lists. Watch for duplicate jobs scraping the same instance and verify required dashboards and alerts through a restart and rollout.

After coverage and values agree, apply the reviewed production values with the pinned chart version and retire the legacy collector. Keep the previous values for rollback until the full target inventory and alert queries have passed verification.
