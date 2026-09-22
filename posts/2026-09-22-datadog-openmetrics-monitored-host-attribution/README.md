# How to Attribute Datadog OpenMetrics Data to the Monitored Host

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Datadog, Prometheus, Monitoring

Description: Attribute Datadog OpenMetrics submissions to the monitored machine using hostname_label, a deliberate hostname format, and multi-target verification.

---

An exporter can run on one machine while reporting metrics about several others. If Datadog assigns all those measurements to the scraper host, host dashboards and grouping can become misleading even though the numeric samples are correct.

For the latest OpenMetrics check, use `hostname_label` to take host identity from a source label. A normal tag such as `node:db-01` is not the same as the submission's hostname field.

## Identify what the endpoint actually measures

Consider a central appliance exporter:

```text
# TYPE appliance_temperature_celsius gauge
appliance_temperature_celsius{node="db-01",sensor="cpu"} 48
appliance_temperature_celsius{node="db-02",sensor="cpu"} 51
# EOF
```

Here, `node` identifies the monitored machines. The machine running the exporter is a transport and collection location, not the entity whose temperature is being measured.

Before changing attribution, compare these label values with hostnames already present in Datadog. If infrastructure metrics use fully qualified names but the exporter reports short names, decide on a consistent mapping. Two aliases for one physical machine can fragment dashboards; the same short name reused in two environments can merge unrelated machines.

## Configure host identity on each submission

```yaml
init_config: {}
instances:
  - openmetrics_endpoint: http://central-exporter:9108/metrics
    namespace: appliances
    metrics:
      - appliance_temperature_celsius: temperature
    hostname_label: node
    hostname_format: '<HOSTNAME>.ops.example.com'
    tags:
      - source:central-exporter
```

This configuration produces `appliances.temperature` associated with `db-01.ops.example.com` and `db-02.ops.example.com`. Replace the example suffix with the naming convention actually used in your Datadog account; omit `hostname_format` when the label already contains the correct hostname.

The [official OpenMetrics configuration](https://github.com/DataDog/integrations-core/blob/master/openmetrics/datadog_checks/openmetrics/data/conf.yaml.example) defines both options. The placeholder is literally `<HOSTNAME>`, not a shell variable or a brace-format expression.

This example applies to latest mode selected with `openmetrics_endpoint`. Legacy configurations use `label_to_hostname`, so confirm the active mode before assuming an option is being honored.

## Preserve the source identity through transformations

In the [current scraper implementation](https://github.com/DataDog/integrations-core/blob/master/datadog_checks_base/datadog_checks/base/checks/openmetrics/v2/scraper/base_scraper.py), hostname lookup uses the sample's source labels. `rename_labels` changes emitted tag names; it does not mean that `hostname_label` should reference the renamed tag.

For example:

```yaml
hostname_label: node
rename_labels:
  node: monitored_node
```

This uses the original `node` label for hostname attribution and emits the descriptive `monitored_node` tag. Verify the installed integration version if behavior differs.

Do not remove identity from the exporter before the scraper can read it. If one endpoint reports several machines without any per-sample host identifier, a static tag cannot infer which measurement belongs to which machine. Fix the producer contract or separate the targets.

## Test missing and conflicting labels

Include a fixture where the source hostname label is absent. The check cannot derive the intended machine in that case, so inspect the resulting attribution rather than allowing that fallback to go unnoticed. A missing host label is especially risky when some families contain it and others report exporter-local statistics.

Select remote-machine metrics separately from exporter process metrics. The exporter's own memory usage describes the exporter, even when temperature samples describe remote machines. One blanket identity policy is unlikely to fit both categories.

If shared metadata supplies the host label, confirm that its match keys uniquely identify each target. Unconditionally copying one host label across a multi-host response assigns every measurement to the same host.

## Verify in both Agent output and Datadog

Run diagnostics:

```bash
sudo datadog-agent configcheck
sudo datadog-agent check openmetrics
sudo datadog-agent status
```

Inspect the resolved options and submitted hostnames for two distinct source machines. In Datadog, query the new metric grouped by host and compare it with the existing infrastructure identity. A correct tag alone is insufficient evidence; inspect the host dimension itself.

Use a fresh time window because historical points keep their earlier attribution. Also verify that no second scraper continues submitting the same measurements under the old host. Host reassignment does not deduplicate overlapping collection.

For measurements that genuinely describe a cluster rather than any machine, the check offers `empty_default_hostname`. That is a separate decision for hostless metrics, not a substitute for correct monitored-host identity.

The final contract should say which entity every selected family describes, where that identity comes from, and how its name aligns with the rest of your monitoring data.
