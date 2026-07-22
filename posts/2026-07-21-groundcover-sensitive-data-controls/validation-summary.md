# Validation Summary: How to Keep PII, Credentials, and Sensitive Payloads Out of Groundcover

## Status

validated

## Post Type

Technical security guide

## Technologies Covered

- Groundcover eBPF tracing and observability
- Groundcover Helm and sensor configuration
- Groundcover log and trace data pipelines
- OpenTelemetry traces, baggage, and Collector processors
- Kubernetes namespaces, workloads, labels, and annotations
- ClickHouse, VictoriaMetrics, object storage, and volume snapshots
- Role-based access control, service accounts, API keys, and data retention

## Sources Consulted

- Groundcover sensitive data obfuscation: https://docs.groundcover.com/customization/customize-usage/sensitive-data-obfuscation
- Groundcover log obfuscation: https://docs.groundcover.com/use-groundcover/data-pipelines/log-pipelines/obfuscate-logs
- Groundcover logs pipeline: https://docs.groundcover.com/use-groundcover/data-pipelines/log-pipelines
- Groundcover traces pipeline: https://docs.groundcover.com/use-groundcover/data-pipelines/traces-pipeline
- Groundcover custom log collection: https://docs.groundcover.com/customization/customize-usage/custom-logs-collection
- Groundcover filtering Kubernetes entities: https://docs.groundcover.com/customization/customize-usage/filtering-kubernetes-entities
- Groundcover disabling tracing for specific protocols: https://docs.groundcover.com/customization/customize-usage/disable-tracing-for-specific-protocols
- Groundcover trace payload sizing: https://docs.groundcover.com/customization/customize-usage/customize-tracing-payload-size
- Groundcover traces overview: https://docs.groundcover.com/capabilities/application-performance-monitoring-apm/traces
- Groundcover role-based access control: https://docs.groundcover.com/use-groundcover/role-based-access-control-rbac
- Groundcover service accounts: https://docs.groundcover.com/use-groundcover/remote-access-and-apis/service-accounts
- Groundcover custom data retention: https://docs.groundcover.com/customization/customize-usage/custom-data-retention
- Groundcover architecture overview: https://docs.groundcover.com/architecture/overview
- Groundcover BYOC disaster recovery: https://docs.groundcover.com/architecture/byoc/disaster-recovery
- Groundcover datasource APIs: https://docs.groundcover.com/use-groundcover/remote-access-and-apis/querying-you-data-using-an-api
- OpenTelemetry handling sensitive data: https://opentelemetry.io/docs/security/handling-sensitive-data/
- OpenTelemetry Collector configuration: https://opentelemetry.io/docs/collector/configuration/
- OpenTelemetry baggage: https://opentelemetry.io/docs/concepts/signals/baggage/
- Helm values files: https://helm.sh/docs/v3/chart_template_guide/values_files/

## Issues Found

- The collection-scope description referred broadly to filtering Kubernetes entities and controlling payload size. Changed it to the documented scope: filtering traced namespaces and workloads and controlling trace payload size.
- The SQL obfuscation statement could imply support for every SQL protocol. Clarified that Groundcover's `sqlhandler` applies to MySQL and PostgreSQL.
- The `KeepSpecificValues` example claimed to preserve only one field across HTTP payloads, but key-value obfuscation only applies to recognized structures such as JSON and query parameters. Limited the claim to recognized key-value payloads and added the required caveat that free text needs `unstructuredConfig`.
- The header guidance did not make the override behavior or matching rule explicit. Clarified that needed default keys must be included when overriding `specificKeys` and that header matching is always case-insensitive.
- The description of `obfuscate_pii` used broad categories such as cloud credentials, repository tokens, and API keys that could imply generic detection. Replaced them with the exact 16 documented patterns.
- The access-control guidance omitted that Groundcover RBAC is available only on the Enterprise plan. Added that plan restriction.
- The retention guidance omitted the documented BYOC operational constraint. Added that Groundcover's team must make retention changes for BYOC deployments.

## Review Notes

The YAML examples parse correctly and use the current documented field names, mode values, and OTTL function signature. The `obfuscate_pii` availability statement for Groundcover 1.11.481 and later remains current. The `"***"` replacement is valid for the enabled patterns because it does not exceed their shortest minimum match length. Groundcover documents that truncated trace payloads are returned as `scrubbed` instead of being passed through normal obfuscation. Advanced retention fields use exact matching, and metrics support only the simple global retention strategy.
