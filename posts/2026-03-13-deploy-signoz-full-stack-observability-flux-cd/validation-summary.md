# Validation Summary: Deploy SigNoz Full-Stack Observability with Flux CD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux CD
- Kubernetes
- HelmRepository and HelmRelease custom resources
- Flux Kustomization custom resources
- SigNoz
- OpenTelemetry OTLP exporters
- ClickHouse
- ZooKeeper
- cert-manager ingress annotations

## Sources Consulted
- SigNoz Helm chart repository index: https://charts.signoz.io/index.yaml
- SigNoz Helm chart README and installation instructions: https://github.com/SigNoz/charts/tree/main/charts/signoz
- SigNoz Helm chart values.yaml for version 0.122.0: https://github.com/SigNoz/charts/blob/main/charts/signoz/values.yaml
- SigNoz Kubernetes installation docs: https://signoz.io/docs/install/kubernetes/aks/
- SigNoz distributed ClickHouse docs: https://signoz.io/docs/manage/administrator-guide/clickhouse/distributed-clickhouse/kubernetes/
- Flux HelmRepository docs: https://fluxcd.io/flux/components/source/helmrepositories/
- Flux HelmRelease docs: https://fluxcd.io/flux/components/helm/helmreleases/
- Flux Kustomization docs: https://fluxcd.io/flux/components/kustomize/kustomizations/
- OpenTelemetry SDK environment variable specification: https://opentelemetry.io/docs/specs/otel/configuration/sdk-environment-variables/

## Issues Found
- The HelmRelease placed the resource in the `platform` namespace without creating that namespace first. Changed the HelmRelease namespace to `flux-system`, added `targetNamespace: platform`, `install.createNamespace: true`, and `releaseName: signoz` so Flux can create the target namespace and the generated service names remain consistent with the instrumentation example.
- The SigNoz chart values used outdated component keys. Replaced `frontend` with `signoz`, removed the obsolete `queryService` block, and changed the OTEL collector port values to the current `otelCollector.ports.otlp` and `otelCollector.ports.otlp-http` structure.
- The ClickHouse replica setting used `clickhouse.replicaCount`, which is not the current SigNoz chart layout key. Changed it to `clickhouse.layout.shardsCount` and `clickhouse.layout.replicasCount`.
- The ZooKeeper values were at the chart root, but the current SigNoz chart nests them under `clickhouse.zookeeper`. Moved the ZooKeeper block accordingly.
- The Flux health checks referenced an outdated `signoz-frontend` Deployment and a chart-generated ClickHouse StatefulSet. Changed the Kustomization health check to wait on the Flux `HelmRelease`, matching Flux's documented pattern for Kustomizations that contain HelmRelease objects.
- Updated the ClickHouse HA best-practice bullet to refer to `clickhouse.layout.replicasCount` and to note that production HA also needs deliberate shard and ZooKeeper quorum configuration.

## Review Notes
The Helm chart version constraint `>=0.43.0 <1.0.0` currently resolves to the active SigNoz chart line, with 0.122.0 published in the SigNoz chart index as of this review. The YAML snippets were parsed successfully after the fixes. Local `helm` and `kubectl` binaries were not installed in the review environment, so validation used official chart files and documentation rather than rendering the chart locally.
