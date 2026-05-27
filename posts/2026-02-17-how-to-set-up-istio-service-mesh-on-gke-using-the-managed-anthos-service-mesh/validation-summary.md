# Validation Summary: How to Set Up Istio Service Mesh on GKE Using the Managed Anthos Service Mesh

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Kubernetes Engine (GKE)
- Cloud Service Mesh / Anthos Service Mesh
- Istio APIs
- Kubernetes namespaces and workloads
- Google Cloud CLI
- Cloud Monitoring, Cloud Logging, and Cloud Trace

## Sources Consulted
- Google Cloud: Provision a managed Cloud Service Mesh control plane on GKE - https://cloud.google.com/service-mesh/docs/onboarding/provision-control-plane
- Google Cloud SDK: `gcloud container fleet mesh update` reference - https://cloud.google.com/sdk/gcloud/reference/container/fleet/mesh/update
- Google Cloud SDK: `gcloud container fleet memberships register` reference - https://cloud.google.com/sdk/gcloud/reference/container/fleet/memberships/register
- Google Cloud: Cloud Service Mesh control plane revisions - https://cloud.google.com/service-mesh/docs/revisions-overview
- Google Cloud: Request proxy logs for Cloud Service Mesh - https://cloud.google.com/service-mesh/docs/observability/access-logs
- Google Cloud: Cloud Service Mesh observability overview - https://cloud.google.com/service-mesh/docs/observability-overview
- Google Cloud: Cloud Service Mesh by example: mTLS - https://cloud.google.com/service-mesh/docs/tutorials/mtls
- Google Cloud: Cloud Service Mesh supported platforms - https://cloud.google.com/service-mesh/docs/supported-platforms
- Istio: AuthorizationPolicy reference - https://istio.io/latest/docs/reference/config/security/authorization-policy/
- Istio: PeerAuthentication reference - https://istio.io/latest/docs/reference/config/security/peer_authentication/
- Istio: VirtualService reference - https://istio.io/latest/docs/reference/config/networking/virtual-service/
- Istio: DestinationRule reference - https://istio.io/latest/docs/reference/config/networking/destination-rule/
- Istio: Telemetry API reference - https://istio.io/latest/docs/reference/config/telemetry/

## Issues Found
- Updated product naming to clarify that Anthos Service Mesh is now Cloud Service Mesh.
- Replaced the outdated prerequisite of "GKE version 1.25 or later" with the current requirement to use a supported GKE version in a supported region.
- Changed API enablement to the current documented `mesh.googleapis.com` command with an explicit project.
- Changed the fleet registration example from `--zone` to `--location`, matching current Google Cloud documentation.
- Corrected the managed mesh update example to use the fleet membership location, which is usually the cluster region for newly registered zonal clusters, instead of the cluster zone.
- Updated namespace injection commands to clear the alternate injection label when switching between default injection and revision-based injection.
- Clarified that revision-based injection should use the value returned by `kubectl get controlplanerevision`.
- Updated Istio security and networking examples from `v1beta1` to the current `v1` API versions.
- Reworded the telemetry example because the shown resource customizes access logging, not custom metrics.
- Tightened observability claims to distinguish default Cloud Monitoring and Cloud Logging integration from Cloud Trace, which depends on tracing configuration.
- Clarified that service-level telemetry in the Cloud Service Mesh console is for HTTP traffic, not every protocol.
- Replaced fixed sidecar resource estimates with a more accurate note that usage depends on traffic volume, cluster mode, and injection settings.

## Review Notes
The Google Cloud CLI was not installed in the local environment, so CLI syntax was verified against official Google Cloud SDK and Cloud Service Mesh documentation instead of local `gcloud --help` output.
