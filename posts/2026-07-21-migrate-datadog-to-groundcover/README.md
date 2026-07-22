# Migrating from Datadog to Groundcover Without Losing Coverage

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Groundcover, Datadog, Observability Migration, Monitoring, Dashboards, Alerts, OpenTelemetry

Description: Migrate from Datadog to Groundcover with a coverage inventory, parallel telemetry, query validation, and a safe, reversible cutover.

---

An observability migration is not complete when data appears in the new UI. It is complete when the new platform detects the same important failures, routes them to the right people, preserves required history, and supports the same incident workflow.

Groundcover now provides an automated Datadog migration flow, but automation does not remove the need for a controlled cutover. The safest approach is inventory, dual coverage, asset translation, failure testing, and only then retirement of the old path.

Feature availability changes. The statements below reflect Groundcover's official documentation reviewed on July 22, 2026.

## Start With a Coverage Contract

Before changing an agent, export an inventory of what Datadog currently protects. Do not limit the list to dashboards.

Record:

- metrics, logs, traces, RUM, synthetics, profiles, and security signals in use;
- every monitor, threshold, evaluation window, no-data rule, and notification route;
- dashboards, notebooks, saved views, and links used in runbooks;
- integrations, custom metrics, log pipelines, parsing rules, and redaction;
- retention, legal-hold, access-control, and audit requirements;
- API clients, Terraform resources, scheduled reports, and downstream exports;
- a named owner and acceptance test for each critical capability.

Turn that inventory into a matrix with `equivalent`, `redesigned`, `temporarily retained`, or `not required` for every row. A missing widget is inconvenient. A missing pager for database saturation is a release blocker.

## Understand What the Migration Tool Covers

Groundcover's [migration documentation](https://docs.groundcover.com/getting-started/migrations) says full Datadog migration support is available. An admin opens the migrations page, supplies API keys for discovery, reviews the result, and migrates selected assets. Groundcover says those API keys are not stored.

The documented asset coverage includes:

- monitors, including conditions, thresholds, and evaluation windows;
- dashboards for widget types Groundcover supports, with layout, time-range, filter, visual, and query translation;
- data-source discovery and setup assistance;
- mappings for metric names, tags to labels, and query syntax;
- validation that referenced metrics and data sources exist.

Read the boundaries as carefully as the features. The current page describes detecting missing data sources and helping you set them up; it does not document migration of log pipelines or advanced metric mappings. A translated query may be syntactically valid without being semantically equivalent, especially when aggregation, missing data, rollups, or tag cardinality differ.

## Establish Groundcover Collection in Parallel

Bring up Groundcover alongside Datadog and keep Datadog authoritative during the comparison period. Groundcover's architecture uses eBPF sensors for Kubernetes visibility and accepts additional telemetry through documented integrations such as OpenTelemetry and Prometheus.

For applications already instrumented with Datadog SDKs, Groundcover documents a compatibility path for traces and DogStatsD custom metrics. In Kubernetes, its sensor can receive Datadog SDK traces; the documented default sampling ratio is 5 percent and `agent.sensor.apmIngestor.dataDog.samplingRatio` accepts values from `0` to `1`. A value of `1` requests 100 percent sampling. Direct custom metrics from the Datadog SDK are documented as Kubernetes-only.

That compatibility path is not permission to assume identical datasets. Sampling, service naming, resource attributes, tag-to-label conversion, and payload support can change the result. Compare by source and service.

The Groundcover guide also shows how to point both `DD_TRACE_AGENT_URL` and `DD_DOGSTATSD_URL` at the Groundcover sensor service. Roll out such endpoint changes gradually. This SDK redirection sends those signals to Groundcover instead of Datadog; it does not duplicate them by itself. A small canary deployment should prove redirected data reaches Groundcover while a separately configured path preserves the intended Datadog coverage before a wider change.

Datadog's own [dual-shipping documentation](https://docs.datadoghq.com/agent/configuration/dual-shipping/) primarily describes sending to multiple Datadog organizations or sites. It directs external log-vendor routing toward Observability Pipelines. Do not infer that every Datadog signal can be duplicated to Groundcover through one agent switch, and check the billing impact of temporary duplication.

## Validate Data Before Assets

A monitor cannot work if its underlying series is absent or differently labeled. Validate telemetry in this order:

1. Confirm every expected service, cluster, namespace, environment, and region appears.
2. Compare request rates, error rates, latency distributions, and infrastructure totals over the same UTC window.
3. Check high-cardinality and custom tags after their conversion to labels.
4. Verify log parsing, timestamps, severity, multiline behavior, and sensitive-data controls.
5. Compare complete traces for known cross-service requests, including errors and slow paths.
6. Account explicitly for sampling and retention differences before comparing raw counts.

Use known synthetic traffic with a correlation ID. It gives you a specific log, trace, request metric, and expected alert transition to find on both sides.

## Validate Every Monitor Semantically

Import monitors in small groups and keep notifications muted initially. For each one, compare:

- the exact input metric or log query;
- aggregation and grouping dimensions;
- evaluation window and threshold direction;
- behavior when data is delayed or absent;
- recovery condition and notification frequency;
- recipient, escalation, maintenance, and ownership rules.

Replay or safely induce representative failures. CPU saturation, an HTTP error spike, a slow dependency, a stopped exporter, and a no-data condition often exercise different evaluator behavior. A monitor is accepted only after it fires and recovers as expected.

Dashboard review needs the same discipline. Groundcover promises translation for supported widgets, not universal visual identity. Check units, percentiles, template variables, top lists, links, time shifts, and empty-state behavior. Keep screenshots or exported Datadog dashboard JSON as the review baseline; Datadog documents both dashboard JSON export and a Dashboards API.

## Plan the History Boundary

Configuration migration and historical telemetry migration are separate decisions. Groundcover's migration page says it ensures current data flows through metric, label, and query mapping, but public documentation does not describe a universal bulk-history procedure for every Datadog signal and retention tier.

Before cutover, obtain a written answer for each dataset:

- how much history is transferred;
- whether original timestamps, tags, IDs, and event links survive;
- how duplicates are handled during overlapping ingestion;
- how long the transfer takes and how completeness is measured;
- which history remains accessible only in Datadog.

If old history will not move, document a read-only access period or an approved archive. Incident responders need to know the date at which a graph must switch systems.

## Cut Over in Reversible Stages

Use a staged exit:

1. Complete the inventory and define sign-off owners.
2. Run Groundcover collection in parallel for representative peak and incident periods.
3. Migrate and validate data sources, then dashboards, then monitors.
4. Send test notifications without paging production responders.
5. Make Groundcover authoritative for one low-risk service.
6. Expand service by service while watching coverage and ingestion costs.
7. Freeze Datadog configuration so the two inventories do not drift.
8. Stop Datadog collection only after the rollback window and history plan are approved.

Keep rollback concrete: agent configuration, endpoints, credentials, notification routing, and responsible operator. Avoid deleting Datadog assets during the observation window. Disabling is easier to reverse than rebuilding.

## Define Exit Criteria

The migration can close when critical signals have comparable freshness and scope, every page-worthy monitor has passed a fire-and-recover test, dashboards support real incident tasks, access controls and retention are approved, historical data has an explicit disposition, and responders have completed a Groundcover incident exercise.

That is how you migrate without losing coverage: treat the tool as an accelerator for asset translation, while your coverage contract and failure tests remain the source of truth.

## Official Documentation

- [Groundcover migrations](https://docs.groundcover.com/getting-started/migrations)
- [Groundcover Datadog SDK ingestion](https://docs.groundcover.com/integrations/data-sources/datadog/sending-directly-from-instrumented-services)
- [Groundcover architecture overview](https://docs.groundcover.com/architecture/overview)
- [Groundcover integrations overview](https://docs.groundcover.com/integrations/overview)
- [Datadog dual shipping](https://docs.datadoghq.com/agent/configuration/dual-shipping/)
- [Datadog dashboard guide](https://docs.datadoghq.com/getting_started/dashboards/)
- [Datadog Dashboards API](https://docs.datadoghq.com/api/latest/dashboards/)
