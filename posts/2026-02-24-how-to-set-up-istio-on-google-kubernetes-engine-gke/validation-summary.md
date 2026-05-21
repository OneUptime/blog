# Validation Summary: How to Set Up Istio on Google Kubernetes Engine (GKE)

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Istio
- Google Kubernetes Engine
- Google Cloud CLI
- Kubernetes
- IstioOperator
- Workload Identity Federation for GKE
- GKE Network Endpoint Groups
- GKE ManagedCertificate
- Istio Telemetry API

## Sources Consulted
- Istio Getting Started: https://istio.io/latest/docs/setup/getting-started/
- Istio Google Kubernetes Engine platform setup: https://istio.io/latest/docs/setup/platform-setup/gke/
- Istio install with istioctl: https://istio.io/latest/docs/setup/install/istioctl/
- Istio 1.30 release announcement: https://istio.io/latest/news/releases/1.30.x/announcing-1.30/
- Istio supported releases: https://istio.io/latest/docs/releases/supported-releases/
- Istio tracing with Telemetry API: https://istio.io/latest/docs/tasks/observability/distributed-tracing/telemetry-api/
- Istio distributed tracing overview: https://istio.io/latest/docs/tasks/observability/distributed-tracing/overview/
- Istio Prometheus integration: https://istio.io/latest/docs/ops/integrations/prometheus/
- Istio Grafana integration: https://istio.io/latest/docs/ops/integrations/grafana/
- Istio Kiali integration: https://istio.io/latest/docs/ops/integrations/kiali/
- GKE Workload Identity Federation: https://cloud.google.com/kubernetes-engine/docs/how-to/workload-identity
- GKE container-native load balancing and NEGs: https://cloud.google.com/kubernetes-engine/docs/concepts/container-native-load-balancing
- GKE container-native load balancing through Ingress: https://cloud.google.com/kubernetes-engine/docs/how-to/container-native-load-balancing
- GKE Google-managed SSL certificates: https://cloud.google.com/kubernetes-engine/docs/how-to/managed-certs
- Cloud Service Mesh supported platforms: https://cloud.google.com/service-mesh/docs/supported-platforms

## Issues Found
- Replaced the obsolete "managed Anthos Service Mesh" reference with "managed Cloud Service Mesh" because Google Cloud documentation now identifies Anthos Service Mesh as Cloud Service Mesh.
- Updated the Istio download directory from `istio-1.24.0` to `istio-1.30.0` because Istio 1.24 is out of support and Istio 1.30.0 is the current upstream release as of May 21, 2026.
- Removed an undeclared `cloud.google.com/backend-config` annotation from the NEG example. The section only enables NEGs, and the referenced `BackendConfig` object was not defined.
- Added the required node pool metadata update after enabling Workload Identity Federation on an existing Standard cluster. GKE documentation states existing node pools are unaffected until `--workload-metadata=GKE_METADATA` is enabled.
- Completed the Google Cloud Trace example by disabling legacy tracing config and adding a mesh-wide `Telemetry` resource that selects the `cloud-trace` provider.
- Clarified Google-managed certificate usage. GKE `ManagedCertificate` resources attach to GKE Ingress with the `networking.gke.io/managed-certificates` annotation, not directly to a plain Istio `LoadBalancer` gateway Service.
- Replaced the Autopilot mutating webhook troubleshooting note with a more accurate note about Istio/GKE compatibility and Istio CNI not being available on GKE Autopilot.

## Review Notes
The tutorial remains a Standard GKE walkthrough. For production use, the Istio sample addons are still demo-grade and should be replaced with supported observability deployments.
