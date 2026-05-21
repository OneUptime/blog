# Validation Summary: How to Set Up Istio on Google Anthos

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Cloud Service Mesh, formerly Anthos Service Mesh
- Istio
- Google Anthos / GKE Enterprise
- Google Kubernetes Engine
- Kubernetes
- Google Cloud CLI
- Certificate Authority Service
- Cloud Monitoring and Cloud Trace

## Sources Consulted
- Google Cloud Service Mesh overview: https://cloud.google.com/service-mesh/docs/overview
- Google Cloud managed Cloud Service Mesh provisioning guide: https://cloud.google.com/service-mesh/docs/onboarding/provision-control-plane
- Google Cloud Service Mesh proxy injection guide: https://cloud.google.com/service-mesh/v1.19/docs/anthos-service-mesh-proxy-injection
- Google Cloud Service Mesh versions: https://docs.cloud.google.com/service-mesh/versions
- Google Cloud Service Mesh control plane implementation guide: https://cloud.google.com/service-mesh/docs/check-control-plane-implementation
- Google Cloud Service Mesh in-cluster installation guide: https://cloud.google.com/service-mesh/v1.20/docs/unified-install/install-anthos-service-mesh
- Google Cloud CLI reference for `gcloud container fleet mesh update`: https://docs.cloud.google.com/sdk/gcloud/reference/container/fleet/mesh/update
- Google Cloud CLI reference for fleet membership registration: https://cloud.google.com/sdk/gcloud/reference/container/fleet/memberships/register
- Google Cloud CLI reference for `gcloud privateca roots create`: https://cloud.google.com/sdk/gcloud/reference/privateca/roots/create
- Cloud Service Mesh authorization policy overview: https://cloud.google.com/service-mesh/docs/security/authorization-policy-overview
- Istio Telemetry API reference: https://istio.io/latest/docs/reference/config/telemetry/
- Istio supported releases: https://istio.io/latest/docs/releases/supported-releases/

## Issues Found
- The post used the older Anthos Service Mesh naming as if it were still the current product name. Updated references to Cloud Service Mesh while noting that it was formerly Anthos Service Mesh.
- The managed control plane description incorrectly stated that managed control plane pods always appear in `istio-system`. Updated it to reflect the current Traffic Director and managed `istiod` implementations.
- The managed mesh update commands omitted `--location`, which is required when addressing membership resources by name. Added membership locations and split the multi-region example into one update per membership location.
- The IAM section listed outdated or incomplete roles for current managed Cloud Service Mesh setup. Updated it to include GKE Hub Admin, Service Usage Admin, cluster admin permissions for Kubernetes operations, and CA Service Admin only when CA Service is used.
- The required API enablement example listed several transitive APIs directly. Updated it to the current documented `mesh.googleapis.com` enablement command.
- The sidecar injection revision command did not remove the legacy `istio-injection` label. Updated it to remove `istio-injection` when applying `istio.io/rev`.
- The in-cluster install and Bookinfo examples used Cloud Service Mesh / Istio 1.22 artifacts, which are unsupported. Updated the examples to use Cloud Service Mesh 1.27 artifacts and Istio `release-1.27` sample URLs.
- The monitoring section referred to the old Stackdriver adapter and used a dashboard-list command that does not validate Cloud Service Mesh telemetry. Updated the text to refer to Stackdriver telemetry provider configuration and console verification.
- The Certificate Authority Service root CA example did not enable the root CA after creation. Added `--auto-enable`.
- The trust domain note implied all Anthos identities use `PROJECT.svc.id.goog`. Updated it to clarify this applies to Cloud Service Mesh with Mesh CA, while Citadel CA uses `cluster.local`.

## Review Notes
Managed Cloud Service Mesh is the recommended path for GKE. In-cluster Cloud Service Mesh is still documented but is discouraged for on-Google Cloud deployments compared with the managed option.
