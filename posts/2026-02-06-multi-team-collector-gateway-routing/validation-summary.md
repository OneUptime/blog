# Validation Summary: How to Use Multi-Team Observability with Per-Team Collector Instances

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- OpenTelemetry Collector
- OpenTelemetry Collector Contrib distribution
- OpenTelemetry Collector routing, resource, batch, memory limiter, and probabilistic sampler processors
- OTLP and OTLP HTTP exporters
- Kubernetes Deployments and Services
- OpenTelemetry Helm chart
- Python subprocess scripting

## Sources Consulted
- OpenTelemetry Collector Helm chart documentation: https://opentelemetry.io/docs/platforms/kubernetes/helm/collector/
- OpenTelemetry Collector Helm chart values: https://github.com/open-telemetry/opentelemetry-helm-charts/blob/main/charts/opentelemetry-collector/values.yaml
- OpenTelemetry Collector Contrib routing processor documentation for v0.96.0: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/v0.96.0/processor/routingprocessor/README.md
- Current OpenTelemetry Collector Contrib routing processor deprecation notice: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/routingprocessor/README.md
- OpenTelemetry Collector Contrib routing connector documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/connector/routingconnector/README.md
- OpenTelemetry Collector component documentation: https://opentelemetry.io/docs/collector/components/
- Local validation with `otel/opentelemetry-collector-contrib:0.96.0 validate`

## Issues Found
- The gateway routing processor used `from_attribute: team.name` without `attribute_source: resource`. In Collector v0.96.0, the routing processor defaults to context/header lookup, so it would not route based on the `team.name` resource attribute added by the team agents. Added `attribute_source: resource`.
- The gateway routing processor referenced `otlphttp/compliance` and `otlphttp/rum`, but the pipelines only listed `otlphttp/primary` as an exporter. The routing processor documentation requires exporters used by the processor to also be present in the pipeline exporters. Added all routed exporters to the traces, metrics, and logs pipelines.
- The gateway only routed traces even though the surrounding text described routing telemetry generally. Added the routing processor to metrics and logs pipelines as well.
- The post described gateway "rate limiting", but the shown configuration uses the memory limiter processor, not a rate limiting processor. Updated the wording to "memory limiting" and "memory limits".
- The team-agent template used `{{ .team_name }}`, but the provisioning script's team dictionaries use the key `name`, so the generated values would leave the team name placeholders unresolved. Changed those placeholders to `{{ .name }}`.
- The Python provisioning snippet imported `yaml` but did not use it, creating an unnecessary PyYAML dependency. Removed the unused import.

## Review Notes
The examples were validated for the pinned Collector image `otel/opentelemetry-collector-contrib:0.96.0`. The routing processor is now deprecated in current OpenTelemetry Collector Contrib releases in favor of the routing connector, but it was valid for the pinned version used by this post.
