# Validation Summary: How to Set Up Istio Multi-Cluster Service Mesh

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Istio multi-cluster service mesh
- Kubernetes
- IstioOperator installation profiles
- East-west gateways
- Istio mTLS and authorization policies
- Istio traffic management
- Prometheus federation
- Jaeger distributed tracing

## Sources Consulted
- Istio primary-remote multi-network installation documentation: https://istio.io/latest/docs/setup/install/multicluster/primary-remote_multi-network/
- Istio multi-primary multi-network installation documentation: https://istio.io/latest/docs/setup/install/multicluster/multi-primary_multi-network/
- Istio supported releases and Kubernetes version support: https://istio.io/latest/docs/releases/supported-releases/
- Istio release download documentation: https://istio.io/latest/docs/setup/additional-setup/download-istio-release/
- Istio Telemetry API tracing documentation: https://istio.io/latest/docs/tasks/observability/distributed-tracing/telemetry-api/
- Istio Telemetry API reference: https://istio.io/latest/docs/reference/config/telemetry/
- Istio DestinationRule reference for locality load balancing: https://istio.io/latest/docs/reference/config/networking/destination-rule/
- Istio multicluster verification documentation: https://istio.io/latest/docs/setup/install/multicluster/verify/
- Kubernetes 1.24 release notes for `kubectl version` output changes: https://github.com/kubernetes/kubernetes/blob/master/CHANGELOG/CHANGELOG-1.24.md

## Issues Found
- The post used Istio 1.20.0 and described it as supporting the latest multi-cluster features. Istio 1.20 is no longer supported, so the examples were updated to Istio 1.30.1 and the Kubernetes version guidance was adjusted to the supported range for Istio 1.30.
- The prerequisite commands used `kubectl version --short`, which is removed in newer kubectl versions. Replaced it with `kubectl version`.
- The certificate generation paths referenced the old Istio 1.20.0 directory. Updated them to `istio-1.30.1` and added `cd ..` after certificate generation so later sample paths resolve correctly.
- Namespace creation and labeling commands were not idempotent. Updated namespace creation to use `--dry-run=client -o yaml | kubectl apply -f -` and added `--overwrite` to labels and annotations.
- The remote cluster was missing the required `topology.istio.io/controlPlaneClusters=cluster1` namespace annotation for primary-remote mode. Added it.
- The primary IstioOperator used undocumented environment variables and an obsolete-looking pilot value for external Istiod behavior. Replaced them with the documented `values.global.externalIstiod: true`.
- The hand-written east-west gateway and Istiod exposure manifests were likely to drift from current Istio generated manifests. Replaced them with the official `gen-eastwest-gateway.sh`, `expose-istiod.yaml`, and `expose-services.yaml` paths from the Istio release.
- The remote cluster IstioOperator was missing `istiodRemote.injectionPath`. Added the documented injection path for `cluster2` on `network2`.
- The post incorrectly created a reverse remote secret in the remote cluster for "bidirectional discovery." In primary-remote mode, the primary Istiod consumes the remote secret. Replaced that step with exposing services and verifying `istioctl remote-clusters`.
- The locality load balancing example used cluster names as locality patterns. Updated it to use `region/zone/sub-zone` patterns, matching Istio's DestinationRule locality format.
- The tracing example used `telemetry.istio.io/v1alpha1` and mixed a runtime Telemetry resource with an install-time IstioOperator overlay in one file. Updated Telemetry to `telemetry.istio.io/v1`, split the provider overlay into `tracing-provider.yaml`, and applied it with `istioctl install`.
- The Jaeger service did not expose port 9411 even though Istio was configured to send Zipkin-format traces there. Added the container and service port.
- The troubleshooting connectivity test sent HTTPS to an SNI passthrough east-west gateway, which is not a reliable TCP reachability check. Replaced it with a BusyBox `nc` TCP probe.
- The HPA example used the old `targetAverageUtilization` shape. Updated it to the current `target.type: Utilization` and `target.averageUtilization` structure.
- The "Resource Quotas" label was plain text instead of a heading. Converted it to a proper section heading.
- The diagrams referred to an "Istiod Agent" running in remote clusters. Updated the labels to "Remote Config" / "Remote Config and Webhooks" to better match primary-remote architecture.

## Review Notes
The guide is now technically aligned with the current Istio 1.30 primary-remote multi-network documentation. Readers should still adapt the LoadBalancer address handling, certificate authority process, locality labels, and observability backend setup to their production environment.
