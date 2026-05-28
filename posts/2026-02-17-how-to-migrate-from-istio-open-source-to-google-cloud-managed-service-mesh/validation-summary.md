# Validation Summary: How to Migrate from Istio Open Source to Google Cloud Managed Service Mesh

## Status
validated

## Post Type
Tutorial / migration guide

## Technologies Covered
- Google Cloud Service Mesh
- Google Kubernetes Engine
- GKE Fleet
- Istio APIs and sidecar injection
- Istio ingress gateways
- Mesh CA and Certificate Authority Service
- kubectl, gcloud, istioctl, Helm

## Sources Consulted
- Google Cloud Service Mesh: Provision a managed Cloud Service Mesh control plane on GKE: https://cloud.google.com/service-mesh/docs/onboarding/provision-control-plane
- Google Cloud Service Mesh: Supported features using Istio APIs (managed control plane): https://cloud.google.com/service-mesh/docs/supported-features-managed
- Google Cloud Service Mesh: Migrate from Istio 1.11 or later to Google Service Mesh: https://cloud.google.com/service-mesh/docs/migrate/from-istio
- Google Cloud Service Mesh: Cloud Service Mesh control plane revisions: https://cloud.google.com/service-mesh/docs/revisions-overview
- Google Cloud Service Mesh: Installing and upgrading gateways with Istio APIs: https://cloud.google.com/service-mesh/docs/operate-and-maintain/gateways
- Google Cloud Service Mesh: Migrate from IstioOperator: https://cloud.google.com/service-mesh/docs/managed/migrate-istio-operator

## Issues Found
- The post described a direct same-cluster migration from open source Istio to managed Cloud Service Mesh. Current Google documentation supports direct migration from open source Istio using a canary cluster migration; same-cluster namespace migration applies after moving to a supported in-cluster Cloud Service Mesh control plane. Updated the strategy and caveats.
- The prerequisite pinned GKE 1.25 and Istio 1.17. Replaced this with Cloud Service Mesh-supported GKE versions and the documented Istio 1.11+ canary cluster migration baseline.
- The cluster describe command used `--zone`; changed it to `--location` so it works for zonal and regional clusters.
- The required API list was incomplete and included non-required APIs. Updated it to the APIs documented for managed Cloud Service Mesh provisioning.
- The fleet mesh update command omitted membership location. Added `--location=YOUR_MEMBERSHIP_LOCATION`.
- The namespace migration examples used `istio.io/rev=asm-managed` as a universal managed label. Current managed Cloud Service Mesh documentation recommends default injection for managed control plane migration, with revision labels only for specific managed Istiod cases. Updated namespace migration commands to use `istio.io/rev- istio-injection=enabled`.
- The control plane revision command used singular `controlplanerevision`; changed it to `controlplanerevisions`, matching Google documentation.
- The gateway migration text implied service selector patching was the only traffic shift method. Updated it to mention the documented canary gateway pattern where both gateway deployments can sit behind the same Service and traffic distribution is controlled by replica counts.
- The old-control-plane verification command used `grep -v "asm-managed"`, which can show headers and unrelated lines. Changed it to check for the old revision explicitly.
- The rollback command restored default injection, which would not roll back to the old revision in a revision-based migration. Updated it to restore `istio.io/rev=YOUR_OLD_REVISION` and remove `istio-injection`.
- The certificate and EnvoyFilter notes were too broad. Updated them to reflect Mesh CA or Certificate Authority Service and the fact that EnvoyFilter support depends on the managed control plane implementation.

## Review Notes
The corrected post still mixes two migration paths: direct open source Istio to managed Cloud Service Mesh by canary cluster, and same-cluster migration after moving to in-cluster Cloud Service Mesh. A future editorial pass should split these into separate guides for clarity.
