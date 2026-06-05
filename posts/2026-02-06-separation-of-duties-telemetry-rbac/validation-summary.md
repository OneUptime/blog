# Validation Summary: How to Use Separation of Duties for Telemetry Data Access

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTelemetry Collector
- OpenTelemetry Collector OIDC authenticator extension
- OpenTelemetry Collector resource processor
- OpenTelemetry Collector routing connector
- Kubernetes RBAC
- Kubernetes NetworkPolicy
- Grafana data source provisioning
- Grafana data source permissions API
- Bash and kubectl

## Sources Consulted
- OpenTelemetry Collector configuration documentation: https://opentelemetry.io/docs/collector/configuration/
- OpenTelemetry Collector Contrib OIDC authenticator extension README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/extension/oidcauthextension/README.md
- OpenTelemetry Collector Contrib resource processor README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/resourceprocessor/README.md
- OpenTelemetry Collector Contrib routing connector README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/connector/routingconnector/README.md
- Kubernetes RBAC documentation: https://kubernetes.io/docs/reference/access-authn-authz/rbac/
- Kubernetes NetworkPolicy documentation: https://kubernetes.io/docs/concepts/services-networking/network-policies/
- Grafana data source provisioning documentation: https://grafana.com/docs/grafana/latest/administration/provisioning/
- Grafana data source permissions HTTP API documentation: https://grafana.com/docs/grafana/latest/developer-resources/api-reference/http-api/datasource_permissions/

## Issues Found
- The OpenTelemetry Collector OIDC example used the deprecated single-provider OIDC configuration and an unsupported `attribute_mapping` field. Updated it to use `providers` and copied JWT claims into resource attributes with the resource processor using `from_context`.
- The Collector example used the older routing processor pattern. Updated it to use the current routing connector with OTTL `condition` entries and connector-based pipelines.
- The Kubernetes RBAC example used `resourceNames: ["otel-collector*"]`, but Kubernetes RBAC does not treat `resourceNames` as a glob pattern. Replaced it with explicit object names.
- The Kubernetes RBAC example combined top-level `create` with `resourceNames`, but Kubernetes cannot restrict top-level create requests by resource name. Removed `create` from the name-restricted rules and clarified that the role is for known Collector objects.
- The Grafana example showed data source permissions inside a data source provisioning YAML file, which Grafana provisioning does not support. Replaced it with normal data source provisioning plus Grafana Enterprise/Grafana Cloud data source permission API calls.

## Review Notes
- The NetworkPolicy example is syntactically valid, but it assumes the selected backends, Grafana pod, and Collector pod are in the same namespace unless additional `namespaceSelector` rules are added.
- Data source permissions are a Grafana Enterprise or Grafana Cloud feature; open source Grafana users need a different access-control design.
- `kubectl` was not installed in the local environment, so CLI behavior was checked against Kubernetes documentation rather than local `kubectl --help` output.
