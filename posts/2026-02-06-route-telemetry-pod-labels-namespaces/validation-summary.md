# Validation Summary: How to Route Telemetry Data by Team Ownership Using Pod Labels

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- OpenTelemetry Collector
- OpenTelemetry Collector Kubernetes Attributes Processor
- OpenTelemetry Collector Routing Connector
- OpenTelemetry Collector Transform Processor and OTTL
- Kubernetes labels, annotations, namespaces, and RBAC
- YAML and Bash

## Sources Consulted
- OpenTelemetry Collector Kubernetes Attributes Processor documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/k8sattributesprocessor/README.md
- OpenTelemetry Collector Routing Processor deprecation notice: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/routingprocessor/README.md
- OpenTelemetry Collector Routing Connector documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/connector/routingconnector/README.md
- OpenTelemetry Collector Transform Processor documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/transformprocessor/README.md
- OpenTelemetry Collector processor component list: https://opentelemetry.io/docs/collector/components/processor/
- OpenTelemetry Collector connector component list: https://opentelemetry.io/docs/collector/components/connector/
- Kubernetes labels and selectors documentation: https://kubernetes.io/docs/concepts/overview/working-with-objects/labels/
- Kubernetes RBAC API documentation: https://kubernetes.io/docs/reference/kubernetes-api/rbac/

## Issues Found
- The Collector example used the deprecated `routing` processor. Updated the approach text and Collector configuration to use the current `routing` connector, with input pipelines exporting to the connector and routed pipelines receiving from it.
- The original routing processor configuration routed directly to exporters. Updated the routing configuration to use `default_pipelines`, OTTL `condition` entries, and pipeline names as required by the routing connector.
- The fallback transform snippet only set `team.name` for traces, while the main team-routing example routes metrics by `team.name`. Added equivalent `metric_statements` and `log_statements` so the fallback resource attribute can be applied consistently across telemetry signals.

## Review Notes
- The k8sattributes extraction of pod labels and namespace annotations is valid for resource enrichment.
- The RBAC example includes permissions for pods, namespaces, nodes, deployments, and replicasets. This is broadly suitable for the shown metadata extraction, though production deployments can scope permissions more tightly based on the exact metadata and object sources extracted.
- The CI label validation script is syntactically valid Bash, but it is intentionally simple and indentation-sensitive. A YAML-aware validation tool would be more robust for production use.
