# Validation Summary: How to Set Up Flagger with Kuma Service Mesh

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Flagger
- Kuma service mesh
- Kubernetes
- Helm
- kubectl
- kumactl
- Prometheus
- Envoy metrics

## Sources Consulted
- Flagger Kuma Canary Deployments documentation: https://docs.flagger.app/tutorials/kuma-progressive-delivery
- Flagger Metrics Analysis documentation: https://docs.flagger.app/main/usage/metrics
- Flagger Upgrade Guide: https://docs.flagger.app/main/dev/upgrade-guide
- Kuma Kubernetes installation documentation: https://kuma.io/docs/2.13.x/production/cp-deployment/kubernetes/
- Kuma MeshMetric policy documentation: https://kuma.io/docs/2.13.x/policies/meshmetric/
- Kuma TrafficRoute policy documentation: https://kuma.io/docs/2.13.x/policies/traffic-route/
- Kuma observability documentation: https://kuma.io/docs/2.13.x/explore/observability/
- Prometheus Kuma service discovery configuration: https://prometheus.io/docs/prometheus/latest/configuration/configuration/#kuma_sd_config

## Issues Found
- The Kuma Helm install command set `controlPlane.mode=standalone`, but current Kuma Helm chart documentation uses the default Kubernetes single-zone installation without that setting. Removed the explicit standalone mode from the Helm command.
- The metrics configuration used the older `Mesh.spec.metrics` Traffic Metrics style. Updated it to a `MeshMetric` resource, which is the current Kuma policy for proxy metrics.
- The Prometheus install used the generic Prometheus community chart without adding the Helm repository or configuring Kuma service discovery. Replaced it with `kumactl install observability --components "grafana,prometheus"`, which installs Kuma's demo observability stack with Prometheus configured for Kuma.
- The Flagger `metricsServer` and custom MetricTemplate Prometheus address pointed at the old `monitoring` namespace. Updated them to `http://prometheus-server.mesh-observability:80`.
- The Canary resource omitted the Kuma mesh annotation and generated service protocol annotations required for HTTP-level TrafficRoute splitting. Added `kuma.io/mesh: default` and the `9898.service.kuma.io/protocol: "http"` annotations for apex, canary, and primary services.

## Review Notes
Kuma's `TrafficRoute` policy is now a legacy policy in Kuma, but Flagger's official Kuma integration still creates Kuma `TrafficRoute` resources. The post remains accurate for Flagger's documented Kuma integration, with the caveat that Kuma users should watch Flagger support for newer Kuma route policies in the future.
