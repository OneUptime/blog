# Validation Summary: How to Use New Relic Distribution (NRDOT) of OpenTelemetry Collector

## Status
validated

## Post Type
Tutorial / technical guide

## Technologies Covered
- New Relic Distribution of OpenTelemetry Collector (NRDOT)
- OpenTelemetry Collector receivers, processors, exporters, and pipelines
- OTLP/HTTP and New Relic OTLP ingest
- Linux package installation
- Docker
- Kubernetes and Helm
- Host metrics, file log collection, Kubernetes events, and kubelet stats

## Sources Consulted
- New Relic NRDOT Collector documentation: https://docs.newrelic.com/docs/opentelemetry/nrdot/nrdot-collector/
- New Relic OTLP endpoint documentation: https://docs.newrelic.com/docs/opentelemetry/best-practices/opentelemetry-otlp/
- New Relic Kubernetes OpenTelemetry install documentation: https://docs.newrelic.com/docs/kubernetes-pixie/k8s-otel/install/
- New Relic ATP host/NRDOT package installation documentation: https://docs.newrelic.com/docs/opentelemetry/nrdot/atp/host/
- New Relic NRDOT Collector releases: https://github.com/newrelic/nrdot-collector-releases/releases
- New Relic NRDOT Collector component manifest: https://github.com/newrelic/nrdot-collector-releases/blob/main/distributions/nrdot-collector/manifest.yaml
- New Relic nr-k8s-otel-collector Helm chart values: https://github.com/newrelic/helm-charts/blob/master/charts/nr-k8s-otel-collector/values.yaml
- OpenTelemetry filelog receiver documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/receiver/filelogreceiver/README.md
- OpenTelemetry Kubernetes Collector components documentation: https://opentelemetry.io/docs/platforms/kubernetes/collector/components/

## Issues Found
- The direct Linux package URL used a non-existent `download.newrelic.com/otel/nrdot-collector/releases/latest/...` path. Updated it to the current GitHub release asset pattern documented by New Relic and verified the latest `1.15.1` DEB asset exists.
- The Docker example used `NEW_RELIC_OTLP_ENDPOINT`, which is not the standard OTLP exporter endpoint environment variable. Updated it to `OTEL_EXPORTER_OTLP_ENDPOINT`.
- The Kubernetes Helm command referenced `newrelic/nrdot-collector`, but New Relic documents the Kubernetes chart as `newrelic/nr-k8s-otel-collector`. Updated the command to use `helm upgrade ... --install` with the documented chart name.
- The post claimed NRDOT includes supervised mode and pulls configuration from New Relic's control plane. I did not find current official documentation for that claim, so I replaced those statements with documented NRDOT capabilities: New Relic support, curated bundled components, and default configurations for common use cases.
- The comparison table claimed NRDOT and the upstream collector both provide the full contrib exporter/component set. The current NRDOT manifest shows a curated component bundle, so I corrected that comparison.

## Review Notes
The remaining configuration snippets are representative examples and align with current OpenTelemetry Collector component names and New Relic OTLP endpoint/header requirements. Kubernetes examples still require the usual RBAC, service account, environment variables, and workload-specific deployment wiring before they can be applied as complete manifests.
