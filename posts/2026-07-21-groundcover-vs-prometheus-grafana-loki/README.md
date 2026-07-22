# Groundcover vs. Prometheus, Grafana, and Loki: When Integration Wins

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Groundcover, Prometheus, Grafana, Loki, Observability

Description: Decide whether Groundcover should integrate with or replace a Prometheus, Grafana, and Loki stack through a low-risk migration plan.

---

Groundcover is not a direct substitute for one of Prometheus, Grafana, or Loki. It overlaps with the combined operating outcome of the stack: collection, storage, querying, visualization, alerting, and application context across metrics, logs, traces, and Kubernetes events. A useful comparison therefore asks which existing components still provide value and which operational responsibilities Groundcover can absorb.

Groundcover-specific feature details in this article were checked against its public documentation on 2026-07-21. Product behavior and plan entitlements can change, so verify them in a proof of concept and your order form.

## Compare Responsibilities, Not Logos

Prometheus is an open source metrics monitoring and alerting toolkit. It stores labeled time series, commonly scrapes HTTP endpoints, evaluates rules, and exposes PromQL. Grafana queries data sources and visualizes their data. Loki stores and queries logs organized into labeled streams with LogQL.

Groundcover's documented BYOC architecture places its observability backend in the customer's environment. It uses VictoriaMetrics as a Prometheus-compatible metrics store and ClickHouse for logs, traces, and Kubernetes events. Its eBPF sensor produces application and infrastructure signals, and the platform can ingest external telemetry.

| Capability | Existing stack | Groundcover's documented path |
|---|---|---|
| Metrics collection | Prometheus scrapes exporters and endpoints | eBPF-generated metrics plus Prometheus scraping or remote write |
| Metrics query | PromQL against Prometheus | Prometheus-compatible storage and an exposed Prometheus API |
| Visualization | Grafana dashboards | Native dashboards and embedded Grafana |
| Logs | Agents send logs to Loki | Kubernetes stdout collection plus supported log inputs into ClickHouse |
| Traces | Requires another backend, often Tempo or a vendor | eBPF traces and ingested OpenTelemetry or Datadog traces |
| Operations | Your team or a managed provider runs each selected component | Groundcover manages BYOC backend components, while the cloud resources remain in your account |

This is not evidence that one design is universally better. It identifies the interfaces that make gradual integration possible.

## Preserve Prometheus Contracts First

Prometheus ecosystems accumulate valuable contracts: exporter formats, service monitors, recording rules, PromQL dashboards, and alert semantics. Replacing every contract at once creates risk without necessarily improving application visibility.

Groundcover documents several ways to ingest Prometheus metrics. It can scrape Kubernetes pods, Prometheus custom resources, standalone hosts, and additional endpoints. It also accepts Prometheus remote write. After ingestion, metrics can be queried through a Prometheus API endpoint.

That creates two useful integration patterns:

1. **Groundcover scrapes existing targets:** retain application exporters while retiring some Prometheus server operations.
2. **Existing collection remote-writes to Groundcover:** keep the current scrape topology during evaluation and make Groundcover an additional destination.

Do not run both patterns against the same targets indefinitely without intent. Duplicate scraping increases load, and duplicate alert evaluation creates two pages for one condition. Build an inventory of scrape jobs, rules, and dashboards, then choose one owner for each after the parallel test.

Validate PromQL compatibility with real queries. A Prometheus-compatible API does not guarantee that every operational detail, extension, retention behavior, or query-performance characteristic matches an existing Prometheus deployment. Test recording-rule dependencies, label names, high-cardinality queries, and alert timing.

## Keep Grafana Where It Protects Investment

Grafana is designed to query many data sources, which makes it a useful migration boundary. Groundcover documents both an embedded Grafana experience and native dashboards. It also documents connecting a customer-owned Grafana instance to Groundcover's Prometheus API for BYOC installations.

This allows a team to preserve familiar dashboards while changing collection and storage underneath them. Start with high-value operational dashboards and verify variables, transformations, links, annotations, and alert rules. A panel rendering successfully is not enough if its label assumptions changed.

Groundcover's current documentation marks its older direct ClickHouse data-source integration as deprecated for new installations. Do not design a new migration around that legacy path. Use the documented Prometheus API for metrics and confirm supported access for other signals.

Decide who owns dashboards during coexistence. If engineers edit both Groundcover-native and external Grafana copies, they will drift. Treat one as source of truth, provision dashboards as code where practical, and put a retirement date on temporary copies.

## Handle Loki as a Separate Migration

Loki history, LogQL, labels, retention, and tenant design are different from Prometheus metrics. Groundcover's public data-source catalog, as reviewed on the research date, documents log ingestion from Kubernetes stdout and sources such as Fluent Bit, Fluentd, Logstash, CloudWatch, JSON, and OpenTelemetry. It does not document Loki as a native ingestion source.

Do not infer a supported Loki migration API from the fact that both products handle logs. A safe transition is:

- keep historical Loki data available through Grafana for its required retention period;
- send new logs to Groundcover through a documented input;
- dual-write only a bounded representative scope while validating completeness;
- translate critical LogQL investigations and alerts into the destination query model; and
- remove the old log path only after retention, audit, and incident requirements are met.

If a direct historical import or Loki query path is essential, obtain a supported design from Groundcover before committing. Avoid an undocumented custom bridge that becomes permanent infrastructure.

## Choose Integration When Existing Assets Are Valuable

Integration is usually the lower-risk choice when:

- application teams depend on custom Prometheus exporters and metrics;
- many reviewed PromQL dashboards or recording rules encode operational knowledge;
- Grafana is an organization-wide portal for more than Kubernetes data;
- Loki contains historical data subject to audit or incident-retention requirements;
- another system consumes Prometheus APIs; or
- the platform team needs comparative evidence before retiring current tools.

Integration also helps separate product evaluation from migration work. Teams can assess eBPF application visibility and correlation without first rewriting every dashboard.

## Choose Replacement When Duplication Costs More Than It Protects

A more complete replacement can make sense when the current stack is lightly customized, unreliable, or expensive to operate. It is also attractive when teams want one supported system for Kubernetes infrastructure, logs, application metrics, traces, and events.

Before replacement, verify gaps that the current stack may hide:

- control-plane and managed-service metrics;
- black-box and synthetic checks;
- long-term metrics retention and downsampling;
- custom alert routing and silences;
- audit access to historical logs;
- multi-tenancy and authorization boundaries; and
- integrations that query Prometheus or Loki directly.

Groundcover's eBPF coverage is protocol, kernel, and deployment dependent. Existing application metrics may still carry business semantics that kernel observation cannot produce. Replacement should preserve those through supported ingestion rather than discard them.

## Run a Bounded Coexistence Plan

Use a representative production slice, not only a quiet development cluster. Define success before deploying:

1. Compare a fixed set of service-level metrics and alerts.
2. Verify log counts, timestamps, parsing, labels, and retention.
3. Exercise a real incident workflow across metrics, logs, traces, and Kubernetes events.
4. Measure sensor and backend resource use in your environment.
5. Test failure behavior when collectors, storage, or network paths are unavailable.
6. Record which dashboards, rules, and agents can be retired.
7. Compare total cost, including Groundcover subscription, BYOC infrastructure, and platform labor.

During coexistence, label every alert with its authoritative system. Deduplicate paging and ensure one tool cannot silently fail while the other hides the gap.

## Make the Decision Per Component

The strongest architecture may be mixed: Groundcover for eBPF visibility and unified investigation, existing exporters for domain metrics, external Grafana for an organization-wide portal, and Loki retained temporarily for history. Over time, evidence may justify removing more pieces.

Integration wins when it preserves trusted operational contracts while reducing duplicate collection and storage deliberately. Replacement wins only after the team proves that the destination covers the responsibilities, not merely the product names, of the system being retired.

## Official Documentation

- [Groundcover: Architecture overview](https://docs.groundcover.com/architecture/overview)
- [Groundcover: Prometheus integration](https://docs.groundcover.com/integrations/data-sources/prometheus)
- [Groundcover: Use Groundcover with self-hosted Grafana](https://docs.groundcover.com/use-groundcover/querying-your-groundcover-data/using-groundcover-as-a-database)
- [Groundcover: Data sources](https://docs.groundcover.com/integrations/data-sources)
- [Prometheus: Overview](https://prometheus.io/docs/introduction/overview/)
- [Grafana: Data sources](https://grafana.com/docs/grafana/latest/datasources/)
- [Grafana Loki documentation](https://grafana.com/docs/loki/latest/)
