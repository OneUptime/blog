# Migrate Legacy Transform Processor Config to Current OTTL Syntax

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, OpenTelemetry Collector, OTTL, Observability, Troubleshooting

Description: Migrate pre-0.120 transform rules to qualified OTTL paths and inferred contexts while preserving grouping, error handling, and output.

Upgrading the Collector does not require rewriting every transform rule immediately. Current transform documentation describes the syntax introduced in version 0.120.0, while older configuration remains supported. A careful migration makes field ownership clearer without accidentally changing what the pipeline exports.

This walkthrough compares the pre-0.120 style with OpenTelemetry Collector Contrib **0.160.0**. Pin the old and new binaries during testing so a syntax migration does not get confused with unrelated processor changes.

## Inventory the Existing Behavior

Start by recording the signal section, explicit context, statement order, error mode, and feature gates. Also identify rules that change a parent resource from a child log or span, and rules that convert metric types.

A typical older log group looks like this:

```yaml
processors:
  transform/legacy:
    error_mode: ignore
    log_statements:
      - context: log
        statements:
          - set(attributes["pipeline"], "application")
          - set(severity_text, "ERROR") where body == "request failed"
```

Inside explicit log context, `attributes`, `severity_text`, and `body` refer to the current log record. The [0.119.0 documentation](https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/v0.119.0/processor/transformprocessor/README.md) is the appropriate reference when interpreting such a configuration.

Before editing it, capture a small sanitized input and its output. Include a matching record, a nonmatching record, a missing field, and a malformed value wherever a converter is involved.

## Qualify the Paths First

The least disruptive first step retains the explicit group and adds the context prefix:

```yaml
processors:
  transform/qualified:
    error_mode: ignore
    log_statements:
      - context: log
        statements:
          - set(log.attributes["pipeline"], "application")
          - set(log.severity_text, "ERROR") where log.body == "request failed"
```

The prefix tells a reviewer which telemetry object owns the field. Resource attributes remain `resource.attributes`; do not rewrite every `attributes` occurrence with the same prefix blindly.

For metrics, data point labels belong under `datapoint.attributes`, while shared metadata belongs under paths such as `metric.name` and `metric.unit`. A textual search-and-replace that produces `metric.attributes` introduces an invalid path.

After the qualified version produces equivalent output, simplify groups that have no special settings:

```yaml
processors:
  transform/current:
    error_mode: ignore
    log_statements:
      - set(log.attributes["pipeline"], "application")
      - set(log.severity_text, "ERROR") where log.body == "request failed"
```

The [current transform configuration guide](https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/v0.160.0/processor/transformprocessor/README.md#config) explains how qualified paths support context inference.

## Preserve Groups That Carry Meaning

Do not flatten groups with group-level conditions, distinct error modes, or incompatible contexts. A metric conversion and a data point transformation may need separate inferred groups:

```yaml
processors:
  transform/metrics:
    error_mode: ignore
    metric_statements:
      - statements:
          - set(metric.description, "Queue occupancy") where metric.name == "queue.depth"
      - statements:
          - set(datapoint.attributes["queue.region"], "eu") where metric.name == "queue.depth" and datapoint.attributes["queue.region"] == nil
```

This keeps the metadata edit at metric level and the conditional label edit at data point level. If an earlier statement renames a metric, subsequent conditions must use the new name.

Also preserve cache dependencies. Rules that parse a log body into cache and then extract fields should stay together. Ordinary caches are not a promise of persistent state across all groups or incoming requests.

## Make Upgrade-Sensitive Choices Explicit

Declare `error_mode` even if it matches the new default. Version 0.160.0 enables the beta gate that changes the transform default to `ignore`; older deployments may have expected propagation. A migration should not silently change what happens when one input is malformed.

Review feature gates separately. Log resource isolation through `flatten_data` requires its own supported setting and gate; qualified syntax alone does not isolate resources. Likewise, do not enable a nil-setting behavior change merely as part of cleaning up path prefixes.

Check regex strings through every configuration layer. Moving a statement into double-quoted YAML can add another escaping layer. Plain YAML scalar statements or literal block scalars often make OTTL quoting easier to inspect. Helm, environment expansion, and generated configuration still need their own verification.

## Compare Old and New Output

Use a local file or debug exporter and run both configurations against the same fixture. Validate with the appropriate binary:

```bash
otelcol-contrib validate --config collector-current.yaml
otelcol-contrib --config collector-current.yaml
```

Compare record counts, values, attribute types, resource grouping, timestamps, and metric metadata. An output diff should explain each intentional change. Ignore incidental formatting differences from the exporter, but do not ignore numeric-versus-string changes or missing fields.

Finally, canary the migrated configuration with the production exporter. Backend queries can depend on details that a successful local parse does not cover. Keep the previous configuration and binary combination available until the canary behaves as expected under representative traffic.

## Conclusion

Migrate by first qualifying paths, then simplifying only the groups whose behavior remains equivalent. Preserve ordering, explicit error modes, and context boundaries. Current syntax improves readability, but a fixture-based comparison is what establishes that the upgrade preserved your telemetry contract.

## Official Documentation

- [Legacy transform configuration](https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/v0.119.0/processor/transformprocessor/README.md)
- [Current transform configuration](https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/v0.160.0/processor/transformprocessor/README.md)
- [OTTL path grammar](https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/v0.160.0/pkg/ottl/LANGUAGE.md)
