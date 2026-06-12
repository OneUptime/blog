# Validation Summary: How to Use Linkerd Multi-Cluster

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Linkerd
- Linkerd Multicluster
- Linkerd Viz
- Linkerd SMI / TrafficSplit
- Kubernetes Services and Deployments
- Kubernetes PrometheusRule resources
- Prometheus remote write
- Smallstep `step` certificates
- OneUptime telemetry ingestion

## Sources Consulted
- Linkerd multicluster reference: https://linkerd.io/2-edge/reference/multicluster/
- Linkerd multicluster CLI reference: https://linkerd.io/2-edge/reference/cli/multicluster/
- Linkerd installing multicluster guide: https://linkerd.io/2-edge/tasks/installing-multicluster/
- Linkerd automatic multicluster failover guide: https://linkerd.io/2-edge/tasks/automatic-failover/
- Linkerd SMI extension guide: https://linkerd.io/2-edge/tasks/linkerd-smi/
- Linkerd ServiceProfile guide: https://linkerd.io/2-edge/tasks/setting-up-service-profiles/
- Linkerd proxy metrics reference: https://linkerd.io/2-edge/reference/proxy-metrics/
- Linkerd telemetry and monitoring guide: https://linkerd.io/2-edge/features/telemetry/
- Linkerd manual certificate rotation guide: https://linkerd.io/2-edge/tasks/manually-rotating-control-plane-tls-credentials/
- Linkerd multicluster source metrics definitions: https://github.com/linkerd/linkerd2/tree/main/multicluster/service-mirror
- OneUptime OpenTelemetry docs: https://oneuptime.com/docs/telemetry/open-telemetry
- OneUptime Prometheus remote write example: https://oneuptime.com/blog/post/2026-02-26-argocd-send-metrics-oneuptime/view

## Issues Found
- The service export example used `mirror.linkerd.io/exported` as a Service annotation. Linkerd's multicluster docs describe exported services as selected by labels, so this was changed to `metadata.labels`.
- The cluster linking commands used `linkerd multicluster link`. Current Linkerd documentation uses `linkerd multicluster link-gen` for generating Link manifests and credentials, so both link commands were updated.
- The gateway production configuration block showed a custom ConfigMap and a partial Deployment manifest that are not supported/current Linkerd multicluster configuration examples and would not apply as a complete Kubernetes Deployment. It was replaced with supported `linkerd multicluster install --ha`, `--gateway-probe-seconds`, and Helm value overrides for gateway service annotations.
- The post used `linkerd viz` and `linkerd multicluster gateways` later but did not install Linkerd Viz. Added `linkerd viz install` and `linkerd viz check` after the Linkerd control plane installation on each cluster.
- The TrafficSplit examples omitted the SMI extension prerequisite. Added the Helm-based Linkerd SMI extension installation commands before the TrafficSplit example.
- The ServiceProfile failover section implied ServiceProfiles perform automatic failover. ServiceProfiles configure route metadata such as retries and timeouts, so the heading and comment were changed to describe retries and timeouts instead.
- The geographic load-balancing TrafficSplit example implied geography-aware routing. SMI TrafficSplit is static weighted routing, so the heading and comment were changed to "Regional Traffic Weighting" and static regional preference.
- The OneUptime remote write example used an incorrect endpoint and header. Updated it to the OneUptime Prometheus remote write endpoint and `x-oneuptime-token` header format.
- The alert examples referenced non-current or non-existent metrics such as `linkerd_mirror_endpoints_total` and treated a histogram metric name as directly comparable. Updated the alerts to use Linkerd service mirror metrics from the current source: `gateway_alive`, `gateway_latency`, and `service_mirror_endpoint_repairs`.
- The certificate troubleshooting commands read `linkerd-identity-trust-roots` as a Secret and base64-decoded it. Current Linkerd stores this as a ConfigMap with plain PEM data, so the commands were corrected.

## Review Notes
- Linkerd ServiceProfiles are still supported for backwards compatibility, but Linkerd documentation says they have been supplanted by Gateway API types as of Linkerd 2.16.
- The Linkerd SMI extension is deprecated and expected to be removed in a future release; new deployments should evaluate Linkerd dynamic request routing for traffic shifting.
- The local environment did not have Linkerd, kubectl, or step available, so commands were verified against current official documentation and Linkerd source rather than local CLI help.
