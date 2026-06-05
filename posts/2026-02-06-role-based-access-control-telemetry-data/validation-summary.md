# Validation Summary: How to Implement Role-Based Access Control for Telemetry Data

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTelemetry SDK resource attributes
- OpenTelemetry Collector resource processor
- OpenTelemetry Collector routing connector
- OpenTelemetry Collector attributes processor
- OpenTelemetry Collector OTLP exporter TLS configuration
- Grafana Tempo multi-tenancy
- Grafana datasource provisioning
- Grafana Enterprise / Grafana Cloud RBAC
- LGTM stack tenant isolation concepts

## Sources Consulted
- OpenTelemetry Resources documentation: https://opentelemetry.io/docs/concepts/resources/
- OpenTelemetry SDK declarative configuration documentation: https://opentelemetry.io/docs/languages/sdk-configuration/declarative-configuration/
- OpenTelemetry Collector routing connector README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/connector/routingconnector/README.md
- OpenTelemetry Collector resource processor README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/resourceprocessor/README.md
- OpenTelemetry Collector attributes processor README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/attributesprocessor/README.md
- OpenTelemetry Collector configuration documentation: https://opentelemetry.io/docs/collector/configuration/
- Grafana Tempo multi-tenancy documentation: https://grafana.com/docs/tempo/latest/operations/multitenancy/
- Grafana datasource provisioning documentation: https://grafana.com/docs/grafana/latest/administration/provisioning/
- Grafana RBAC permission actions and scopes: https://grafana.com/docs/grafana/latest/administration/roles-and-permissions/access-control/custom-role-actions-scopes/
- Grafana RBAC provisioning documentation: https://grafana.com/docs/grafana/latest/administration/roles-and-permissions/access-control/rbac-grafana-provisioning/
- Grafana RBAC HTTP API documentation: https://grafana.com/docs/grafana/latest/developer-resources/api-reference/http-api/api-legacy/access_control/
- Grafana datasource permissions documentation: https://grafana.com/docs/grafana/latest/permissions/datasource_permissions/

## Issues Found
- The SDK resource attributes example used a generic `resource.attributes` shape with `key` fields. Current OpenTelemetry declarative SDK configuration uses `file_format: "1.0"` and resource attributes with `name` and `value` fields, so the snippet was updated accordingly.
- The SDK example used `environment`, which is not the current OpenTelemetry semantic convention for deployment environment. It was changed to `deployment.environment.name`.
- The routing connector example omitted the inbound pipeline that receives OTLP data and exports to the connector. Without that pipeline, telemetry would never enter the routing connector. The snippet now includes an `otlp` receiver and a `traces/in` pipeline exporting to `routing`.
- The routing connector example used `statement: route() where ...`, while the current routing connector examples use `condition` with an explicit OTTL context. The table entries now use `context: resource` and `condition: attributes["team.name"] == ...`.
- The routing example used `X-Tenant-ID` headers while the Tempo/Grafana multi-tenancy example later relies on `X-Scope-OrgID`. The exporter headers were updated to `X-Scope-OrgID`, matching Tempo's tenant header.
- The routing example sent default telemetry to the payments exporter, which would incorrectly place untagged data in the payments tenant. A separate default exporter and tenant were added.
- The Grafana datasource snippet did not define a datasource UID, but the RBAC scopes should use datasource UID scopes. The datasource now has `uid: tempo-payments`.
- The Grafana RBAC snippet showed a team object with embedded permissions, which is not the Grafana RBAC custom role/provisioning format. It was replaced with a Grafana Enterprise/self-managed RBAC provisioning example defining a custom role with folder and datasource permissions.
- The Grafana RBAC scope `datasources:name:Tempo-Payments` was invalid for Grafana RBAC. It was replaced with `datasources:uid:tempo-payments`.

## Review Notes
The article is technically relevant and implementation-focused. Grafana fine-grained RBAC and datasource permissions are Enterprise / Grafana Cloud features, so the post now states that caveat in the RBAC section.
