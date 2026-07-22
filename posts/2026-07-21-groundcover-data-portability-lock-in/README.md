# How Hard Is It to Leave Groundcover? Data Formats, Schemas, and Vendor Lock-In

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Groundcover, Vendor Lock-In, Data Portability, ClickHouse, VictoriaMetrics, OpenTelemetry, Prometheus

Description: Evaluate Groundcover portability across telemetry, schemas, queries, dashboards, storage, and operations, then prepare a testable exit plan.

---

Running observability storage in your own cloud reduces one kind of vendor dependency, but it does not eliminate lock-in. You can own the volumes and still depend on a vendor's schema, query language, control plane, dashboard model, and support tooling.

Groundcover's BYOC architecture is a meaningful portability advantage because the backend and telemetry data remain in the customer's environment. The practical question is not simply, "Where are the bytes?" It is, "Can another supported system understand, export, and operate those bytes within our recovery objective?"

The product and its APIs evolve. This assessment reflects the official documentation available on July 21, 2026, and distinguishes documented access from capabilities that need contractual confirmation.

## Evaluate Lock-In in Six Layers

Treat portability as a stack:

| Layer | Groundcover characteristic | Portability concern |
| --- | --- | --- |
| Collection | eBPF sensors plus third-party ingestion | Replacing product-specific collection and enrichment |
| Protocol | OpenTelemetry, Prometheus, Datadog, and other integrations | Whether original semantics survive translation |
| Storage | ClickHouse and VictoriaMetrics in BYOC | Supported bulk export, schema, credentials, and version |
| Query | MetricsQL and Groundcover Query Language | Rewriting searches, joins, monitors, and dashboards |
| Configuration | Dashboards, monitors, pipelines, RBAC | Export format and import support in the destination |
| Operations | Groundcover control and lifecycle tooling | Upgrades, backups, retention, and access after termination |

Metrics may be relatively portable while alert logic remains costly to move. A single portability score hides that difference.

## What Groundcover Documents

The [architecture overview](https://docs.groundcover.com/architecture/overview) says ClickHouse stores logs, traces, and Kubernetes events, while VictoriaMetrics stores metrics. In BYOC, the data plane runs in the customer's cloud. Groundcover also documents ingestion from OpenTelemetry and Prometheus-compatible sources.

For queries, Groundcover exposes a raw Prometheus API for metrics and a Logs API. Its main query interface uses MetricsQL for metrics and Groundcover Query Language for logs, traces, and events. The older endpoint that allowed direct ClickHouse SQL is explicitly marked deprecated.

Those facts support day-to-day access. They do not, by themselves, promise:

- a complete bulk export of every signal and retention tier;
- stable access to Groundcover's internal ClickHouse tables;
- a published schema migration contract;
- destination-ready dashboards, monitors, users, or pipelines;
- continued control-plane operation after a subscription ends.

Ask Groundcover to specify those items for your edition and deployment. Do not design an exit around a deprecated SQL endpoint.

## Metrics Have the Clearest Standards Path

Groundcover's Metrics API is Prometheus-compatible, and its backend uses VictoriaMetrics. That makes metric names, labels, timestamps, and samples more accessible to standard tooling than a proprietary store would be.

Still, a query API is not automatically a bulk-export API. VictoriaMetrics itself documents `/api/v1/export`, CSV export, and a native export format, along with `vmctl` for migrations. Groundcover's public documentation does not state that a customer may directly use every VictoriaMetrics endpoint in its managed deployment. Confirm endpoint access, authentication, limits, and support before relying on those tools.

If a supported direct export is available, prefer a documented interchange format unless the destination is VictoriaMetrics. VictoriaMetrics warns that its native binary format can change incompatibly between releases. JSON lines or CSV are easier to inspect, while native blocks can be faster and preserve VictoriaMetrics-specific structure.

Portability also depends on semantics. Preserve recording-rule definitions, unit conventions, histogram type and buckets, counter-reset behavior, label casing, and the time range actually exported. A syntactically valid PromQL query can still return a different answer after a label or histogram conversion.

## Logs and Traces Need Schema Work

ClickHouse is open source, but the tables written by an application are still application schemas. Groundcover enriches traces with container and Kubernetes context and aligns many attributes with OpenTelemetry conventions. That helps, but enrichment fields, internal identifiers, sampling metadata, and relationships can remain product-specific.

OpenTelemetry defines data models and semantic conventions for common telemetry fields. It does not guarantee that two vendors store the same column layout or implement every convention identically. Before an exit, build a field dictionary containing:

- canonical service, environment, cluster, namespace, and resource identity;
- trace ID, span ID, parent relationships, timestamp precision, and duration units;
- log timestamp, observed timestamp, severity, body, attributes, and resource fields;
- event type, source, object identity, and lifecycle timestamps;
- sensitive fields, redaction state, and retention class;
- which fields Groundcover creates versus which the source supplied.

Export a small interval and validate it against the destination before moving history. Check row counts, time bounds, null values, encoding, payload size, ID fidelity, and trace completeness. Sampling means stored traces are not necessarily the full observed request population.

## Object Storage Is Not Automatically an Exit Format

Groundcover's disaster recovery documentation says older logs, traces, and events can be offloaded to object storage, and daily volume snapshots are used for monitoring data. It also says metrics are not offloaded to object storage.

Owning the bucket is valuable, but a disaster-recovery artifact is not necessarily a supported interchange artifact. Establish:

- the file and compression format;
- partition layout and manifest format;
- schema version and compatibility policy;
- encryption keys and access after contract termination;
- whether offloaded data is complete and independently readable;
- the supported restore or export tool;
- how deletion and legal hold are represented.

Likewise, a volume snapshot may require a compatible database version and cluster topology. It protects recovery into the original system better than migration into a different one.

## Configuration Usually Costs More Than Bytes

Groundcover dashboards and monitors may encode Groundcover Query Language, MetricsQL, variables, transformations, alert windows, and routing behavior. The destination needs equivalent semantics, not merely copied JSON.

Inventory all configuration through supported APIs or infrastructure as code where available. Store an external record of:

- dashboard purpose and owner;
- monitor query, threshold, missing-data behavior, and notification route;
- log and trace pipeline transformations;
- retention, sampling, and obfuscation rules;
- service accounts, roles, and integration dependencies.

Avoid reverse engineering internal databases as the primary configuration backup. Internal records can omit control-plane state or change without a public compatibility promise.

## Build Portability Before You Need It

The cheapest exit is prepared during adoption:

1. Send manually instrumented telemetry using OpenTelemetry where it meets the use case.
2. Use Prometheus conventions for custom metrics and keep recording rules in source control.
3. Maintain a canonical attribute and label dictionary owned by your organization.
4. Keep monitors and dashboards in version-controlled definitions when supported.
5. Document which eBPF-derived fields have no equivalent in a destination.
6. Run a quarterly export of a bounded interval into a separate account or project.
7. Import that sample into a different tool and execute representative incident queries.
8. Measure throughput so a full export has a credible duration and cost estimate.

For a real exit, dual-write new telemetry before moving old history. Pick a timestamp boundary, validate both systems over the same window, freeze configuration changes, migrate history in resumable chunks, and reconcile every chunk. Keep Groundcover available until alerts, investigations, retention, and access controls pass their acceptance tests.

## Questions to Put in the Contract

Get direct answers about bulk export, schemas, rate limits, egress costs, object-store ownership, encryption keys, deletion, configuration export, and support after notice of termination. Include a maximum time for credentials or tooling needed to complete the export.

Groundcover's BYOC model gives customers useful control over placement and infrastructure. The remaining work is to turn physical custody into logical portability. Open protocols, a documented schema map, configuration as code, and a rehearsed export make that difference measurable.

## Official Documentation

- [Groundcover architecture overview](https://docs.groundcover.com/architecture/overview)
- [Groundcover Metrics and Logs API](https://docs.groundcover.com/use-groundcover/remote-access-and-apis/raw-prometheus-and-clickhouse)
- [Groundcover querying data](https://docs.groundcover.com/use-groundcover/querying-your-groundcover-data)
- [Groundcover disaster recovery](https://docs.groundcover.com/architecture/byoc/disaster-recovery)
- [VictoriaMetrics data export](https://docs.victoriametrics.com/victoriametrics/index.html#how-to-export-data-in-json-line-format)
- [VictoriaMetrics `vmctl`](https://docs.victoriametrics.com/victoriametrics/vmctl/)
- [OpenTelemetry semantic conventions](https://opentelemetry.io/docs/specs/semconv/)
- [OpenTelemetry logs data model](https://opentelemetry.io/docs/specs/otel/logs/data-model/)
- [OpenTelemetry metrics data model](https://opentelemetry.io/docs/specs/otel/metrics/data-model/)
