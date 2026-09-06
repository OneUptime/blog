# Validation Summary: How to Correlate Incidents and Telemetry in a OneUptime Dashboard

## Status

validated

## Post Type

Technical guide with dashboard configuration steps and illustrative resource attributes and filter syntax.

## Technologies Covered

- OneUptime 12.0.33 dashboards, widgets, variables, labels, and incident management
- OpenTelemetry resource semantic conventions, logs, metrics, traces, and exemplars
- W3C Trace Context
- Markdown dashboard content

## Sources Consulted

- [OneUptime dashboard overview](https://oneuptime.com/docs/en/dashboards/index)
- [OneUptime dashboard authoring](https://oneuptime.com/docs/en/dashboards/authoring)
- [OneUptime dashboard widgets](https://oneuptime.com/docs/en/dashboards/widgets)
- [OneUptime dashboard variables and filters](https://oneuptime.com/docs/en/dashboards/variables)
- [OneUptime dashboard sharing](https://oneuptime.com/docs/en/dashboards/sharing)
- [OneUptime 12.0.33 package metadata](https://github.com/OneUptime/oneuptime/blob/12.0.33/package.json)
- [Version-pinned dashboard documentation](https://github.com/OneUptime/oneuptime/tree/12.0.33/App/FeatureSet/Docs/Content/en/dashboards): read index.md, authoring.md, variables.md, widgets.md, and sharing.md directly from the official release tag.
- [OpenTelemetry resource conventions](https://opentelemetry.io/docs/specs/semconv/resource/)
- [OpenTelemetry service conventions](https://opentelemetry.io/docs/specs/semconv/resource/service/)
- [OpenTelemetry deployment conventions](https://opentelemetry.io/docs/specs/semconv/resource/deployment-environment/)
- [OpenTelemetry cloud conventions](https://opentelemetry.io/docs/specs/semconv/resource/cloud/)
- [OpenTelemetry context propagation](https://opentelemetry.io/docs/concepts/context-propagation/)
- [OpenTelemetry metric exemplars](https://opentelemetry.io/docs/specs/otel/metrics/data-model/#exemplars)
- [W3C Trace Context](https://www.w3.org/TR/trace-context/)

## Issues Found

1. **Overbroad time-alignment wording.** The introduction and zoom instructions suggested all panels describe the historical window. Clarified the shared telemetry window versus current resource lists, and distinguished the Log Chart window from the live Log Stream in the table.
2. **Missing zoom prerequisite.** Added View mode and specified double-clicking a chart. In Edit mode, dragging manipulates widget layout instead of selecting a time interval.
3. **Propagation versus log enrichment.** W3C context propagation alone does not populate application log records. Clarified that logging instrumentation must attach the active trace and span IDs.
4. **Ambiguous metric correlation test.** The original test could imply that a trace ID directly joins all three signals. Restricted the ID check to logs and traces, described metrics as emitted measurements, and clarified service/time correlation and the conditional role of exemplars.
5. **Incorrect link target for preserving evidence.** Replaced “fixed incident link” with a dashboard link carrying a fixed time range; an incident URL alone does not establish dashboard query state.
6. **Incomplete public-sharing guidance.** Added the Scale-plan qualification for IP allowlisting and the documented absence of Log Chart on public dashboards. Made password/IP gating conditional on restricted access rather than mandatory for intentionally public data.

## Review Notes

- The release tag exists and its package version is 12.0.33. Its bundled documentation supports the retained widget and variable guidance, including the exact `service.name = '{{service}}'` example. This is a version-specific documentation review, not a claim that 12.0.33 is the latest release.
- The resource attribute names and sample string values are valid. The attribute block illustrates desired emitted metadata; it is not an executable SDK or Collector configuration file. No terminal commands or executable programs require testing.
- The widget catalog supports the proposed metric values, thresholds, Markdown Text, and resource label filters. Resource labels must be configured separately from OpenTelemetry attributes.
- Temporal association is correctly distinguished from causal proof. Clock synchronization, comparing versions and regions, and preserving a fixed UTC interval are sound investigation practices.
- Official documentation links resolve to the intended topics. The author profile URL is a plausible GitHub profile link and is not used as technical evidence.
- No live OneUptime instance or instrumented application was exercised. Runtime ingestion, permissions, actual filter results, and exemplar support remain deployment-dependent; the post includes a pre-incident validation procedure for these checks.
- Changes preserve the original section structure and limit edits to technical corrections. Both validation deliverables were checked for the requested format.
