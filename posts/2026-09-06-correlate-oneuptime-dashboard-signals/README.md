# How to Correlate Incidents and Telemetry in a OneUptime Dashboard

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OneUptime, Dashboard, Observability, Incident Management, Telemetry

Description: Build a time-aligned OneUptime dashboard for incidents, alerts, logs, metrics, and traces using consistent service attributes and filters.

---

A OneUptime dashboard can place incidents, alerts, metrics, logs, and traces on one canvas, with a shared time range for telemetry charts and values alongside live resource lists. That makes relationships easier to investigate, but co-location is not automatic causal proof. The useful work starts before the dashboard, with consistent telemetry identity and resource labels.

The widget and variable behavior below matches OneUptime 12.0.33.

## Standardize correlation keys

Emit the same OpenTelemetry resource attributes from every signal for a service:

```text
service.name = checkout-api
service.version = 2026.09.1
deployment.environment.name = production
cloud.region = eu-west-1
```

Use W3C trace context to propagate request context across services, and enable logging instrumentation to attach the active trace and span IDs to application logs where supported. Apply matching OneUptime labels to monitors, alerts, and incidents, for example `service=checkout-api` and `environment=production`.

OneUptime does not infer that two differently named services are identical. Fix identity at instrumentation or Collector level rather than maintaining a long list of dashboard exceptions.

## Create the dashboard and variables

Open **Dashboards > Create Dashboard** and create a focused operational view. Under **Dashboard > Settings > Variables**, add:

- `service` as a Telemetry Attribute variable for `service.name`
- `environment` as a Custom List or Telemetry Attribute variable
- `region` as a Telemetry Attribute variable for `cloud.region`

Set a safe production default and avoid multi-select where the aggregation would become misleading. Reference variables in widget filters, such as:

```text
service.name = '{{service}}'
```

Use the same variable meaning for all telemetry widgets. Resource-list widgets use their supported field and label filters, so align OneUptime labels with the telemetry vocabulary.

## Build a diagnostic reading order

Arrange the canvas so responders move from impact to evidence:

| Row | Widgets | Question |
| --- | --- | --- |
| 1 | Monitor List, Incident List, Alert List | What is failing and who owns it? |
| 2 | Value or Gauge for error rate, P95 latency, throughput | How severe is user impact? |
| 3 | Metric Chart for errors, latency, saturation | When did behavior change? |
| 4 | Log Chart and Log Stream | What errors appeared in the chart window, and what is streaming now? |
| 5 | Trace List | Which requests and dependencies are slow or failing? |
| 6 | Text | Which runbook and escalation policy apply? |

Use warning and critical thresholds on Value or Gauge widgets only when the unit and direction are clear. Put a Markdown Text widget beside the first row with ownership, SLO, and runbook links.

## Keep every panel on one clock

The dashboard header controls the global time range for telemetry charts and values. During an incident, choose a fixed range around the first alert. In View mode, drag across a line or area chart to change the shared telemetry window; double-click a chart or use Reset zoom to return. Live resource lists still describe current state.

Check that hosts and collectors have synchronized clocks. A timestamp skew can make a log appear before the request that produced it and create a false narrative.

Set refresh to a useful live interval during response, then turn it off while reviewing a fixed historical window. Live lists can update independently, so note whether a panel describes current state or the chosen telemetry window.

## Investigate without overclaiming

If latency rises at 10:04, errors at 10:05, and an incident at 10:06, the dashboard establishes temporal association. Follow a trace into the slow dependency and use its trace ID to find corresponding logs before calling the dependency the cause.

Compare regions and versions. A spike limited to one `service.version` after a deployment is stronger evidence than an all-service log-volume change, but it still needs validation against deployment and trace data.

Save a dashboard link with a fixed time range or record the exact UTC range so another responder sees the same evidence. Do not rely on a rolling one-hour window in a retrospective.

## Validate the dashboard before an incident

Generate a known test request that emits a trace, log, and metric measurement. Confirm the selected `service` value filters all three signals and that the trace ID connects the expected log and trace records. Correlate the metric by service and time; trace-level metric links require exemplars and support throughout the telemetry pipeline and backend. Create a low-risk test alert and incident with matching labels and confirm the list widgets display them.

Review permissions before sharing. A dashboard can expose raw logs and traces that contain sensitive data. Public dashboards need deliberate filters and data designed for external viewing; use a master password or an IP allowlist (on the Scale plan) when access should be restricted. Log Chart requires an authenticated dashboard and is unavailable on public dashboards.

## Conclusion

OneUptime dashboards support cross-signal investigation by putting time-aligned widgets and shared variables in one view. They do not manufacture causality. Consistent service identity, trace context, labels, and a disciplined impact-to-evidence layout turn that shared canvas into a useful incident tool.

## Official Documentation

- [OneUptime dashboards overview](https://oneuptime.com/docs/en/dashboards/index)
- [OneUptime dashboard authoring](https://oneuptime.com/docs/en/dashboards/authoring)
- [OneUptime dashboard widgets](https://oneuptime.com/docs/en/dashboards/widgets)
- [OneUptime dashboard variables and filters](https://oneuptime.com/docs/en/dashboards/variables)
- [OpenTelemetry resource semantic conventions](https://opentelemetry.io/docs/specs/semconv/resource/)
