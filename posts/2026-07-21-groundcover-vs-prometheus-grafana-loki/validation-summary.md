# Validation Summary: Groundcover vs. Prometheus, Grafana, and Loki: When Integration Wins

## Status

validated

## Post Type

Technical comparison and migration guide

## Technologies Covered

- Groundcover
- Prometheus and PromQL
- Grafana
- Grafana Loki and LogQL
- VictoriaMetrics
- ClickHouse
- OpenTelemetry
- Datadog tracing
- eBPF
- Kubernetes

## Sources Consulted

- [Groundcover: Architecture overview](https://docs.groundcover.com/architecture/overview)
- [Groundcover: BYOC - Bring Your Own Cloud](https://docs.groundcover.com/architecture/byoc)
- [Groundcover: Prometheus integration](https://docs.groundcover.com/integrations/data-sources/prometheus)
- [Groundcover: Pushing Metrics using Remote Write](https://docs.groundcover.com/integrations/data-sources/prometheus/push-metrics-to-groundcover)
- [Groundcover: Using groundcover as a Prometheus/ClickHouse database in a self-hosted Grafana](https://docs.groundcover.com/use-groundcover/querying-your-groundcover-data/using-groundcover-as-a-database)
- [Groundcover: Dashboards](https://docs.groundcover.com/use-groundcover/dashboards-and-alerts)
- [Groundcover: Data Sources](https://docs.groundcover.com/integrations/data-sources)
- [Groundcover: Log Management](https://docs.groundcover.com/capabilities/log-management)
- [Groundcover: Kernel requirements for eBPF sensor](https://docs.groundcover.com/getting-started/requirements/kernel-requirements-for-ebpf-sensor)
- [Groundcover: Supported Technologies](https://docs.groundcover.com/capabilities/application-performance-monitoring-apm/supported-technologies)
- [Groundcover: Migrations](https://docs.groundcover.com/getting-started/migrations)
- [Prometheus: Overview](https://prometheus.io/docs/introduction/overview/)
- [Prometheus: Configuration](https://prometheus.io/docs/prometheus/latest/configuration/configuration/#remote_write)
- [Grafana: Data sources](https://grafana.com/docs/grafana/latest/datasources/)
- [Grafana: Grafana Cloud](https://grafana.com/docs/grafana/latest/introduction/grafana-cloud/)
- [Grafana Loki: Overview](https://grafana.com/docs/loki/latest/get-started/overview/)

## Issues Found

- The comparison table stated that the customer's team runs every component in an existing Prometheus, Grafana, and Loki stack. Those components can also be operated by a managed provider. Changed the entry to say that the team or a managed provider runs each selected component, avoiding an inaccurate operating-model assumption.

## Review Notes

- The post contains no code examples, terminal commands, or configuration snippets, but it does contain substantial technical implementation and architecture details, so it was reviewed and marked `validated` rather than `not-code-blog`.
- Groundcover's documentation confirms that its BYOC backend is deployed in the customer's environment and managed by Groundcover, with VictoriaMetrics storing metrics and ClickHouse storing logs, traces, and Kubernetes events.
- The documented Prometheus integration supports Kubernetes and standalone scraping, Prometheus custom resources and additional endpoints, remote write ingestion, and querying through a Prometheus API endpoint.
- The self-hosted Grafana documentation exposes the Prometheus data source for BYOC installations. It also correctly marks the direct ClickHouse data-source integration as deprecated and unsupported for new installations; on-premises deployments require different instructions from Groundcover.
- Groundcover's current data-source catalog does not list Loki as a native ingestion source. This is time-sensitive product information, and the post appropriately tells readers to verify product behavior and entitlements during a proof of concept.
- Groundcover's kernel requirements and supported-technologies documentation support the caveat that eBPF coverage depends on the kernel, deployment environment, protocol, and runtime or encryption library.
