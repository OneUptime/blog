# Validation Summary: How to Deploy Tempo Tracing with Flux CD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Grafana Tempo
- Grafana Tempo distributed Helm chart
- Flux CD HelmRelease and Kustomization APIs
- Kubernetes namespaces, services, ingress, and ConfigMaps
- OpenTelemetry Protocol (OTLP)
- Prometheus Operator ServiceMonitor
- S3-compatible object storage

## Sources Consulted
- Grafana Tempo Helm chart documentation: https://grafana.com/docs/tempo/latest/setup/helm-chart/
- Grafana Tempo distributed Helm chart values: https://github.com/grafana/helm-charts/blob/main/charts/tempo-distributed/values.yaml
- Grafana Tempo distributed chart templates: https://github.com/grafana/helm-charts/tree/main/charts/tempo-distributed/templates
- Grafana Tempo configuration reference: https://grafana.com/docs/tempo/latest/configuration/
- Grafana Tempo API documentation: https://grafana.com/docs/tempo/latest/api_docs/
- Flux HelmRelease v2 documentation: https://fluxcd.io/flux/components/helm/api/v2/
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/

## Issues Found
- The application examples and ingress used `tempo-distributor`, but the Helm chart generates the distributor service from the Helm release name, producing `tempo-distributed-distributor` for this release. I added `releaseName: tempo-distributed` and updated the OTLP endpoint, ingress backend service, and test trace command to use `tempo-distributed-distributor`.
- The values block used `global_overrides`, which is not a valid `tempo-distributed` chart value. I changed it to `overrides`, matching the chart's generated Tempo configuration.
- The metrics generator was enabled but its processors were not activated. Tempo requires `overrides.defaults.metrics_generator.processors` to include processors such as `service-graphs` and `span-metrics`, so I added those values.
- `max_bytes_per_trace` was placed under ingestion overrides, but Tempo documents it under the `global` override block. I moved it to `overrides.defaults.global.max_bytes_per_trace`.
- `max_search_duration` was placed directly under the defaults object, but Tempo documents it under read overrides. I moved it to `overrides.defaults.read.max_search_duration`.
- The query frontend values included `config.search.max_duration`, which is not a valid key in the current distributed chart. I removed that invalid value because the search duration limit is handled by the read override.
- The Flux Kustomization used `targetNamespace: tracing` while the manifests intentionally include resources in both `flux-system` and `tracing`. Flux documents `targetNamespace` as setting or overriding the namespace for all objects, so I removed it to avoid moving the HelmRepository out of `flux-system`.

## Review Notes
- The YAML examples were parsed successfully after the fixes.
- The current upstream `tempo-distributed` chart metadata marks the chart as deprecated, while Grafana's Tempo documentation still references `tempo-distributed` for Helm-based microservices deployments. Future revisions should revisit the recommended installation path if Grafana updates its Tempo Helm guidance.
