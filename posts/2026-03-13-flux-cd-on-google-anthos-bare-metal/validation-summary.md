# Validation Summary: How to Set Up Flux CD on Google Anthos Bare Metal

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux CD
- Kubernetes
- Google Distributed Cloud / Anthos Bare Metal
- Workload Identity Federation
- Google Artifact Registry
- Google Cloud Managed Service for Prometheus
- Google Cloud Fleet

## Sources Consulted
- Google Distributed Cloud for bare metal overview: https://cloud.google.com/kubernetes-engine/distributed-cloud/bare-metal/docs/concepts/about-bare-metal
- Google Distributed Cloud Workload Identity Cluster Authentication: https://cloud.google.com/kubernetes-engine/distributed-cloud/bare-metal/docs/installing/wi-cluster-auth
- Google IAM Workload Identity Federation with Kubernetes: https://cloud.google.com/iam/docs/workload-identity-federation-with-kubernetes
- GKE Workload Identity Federation service account impersonation reference: https://cloud.google.com/kubernetes-engine/docs/how-to/workload-identity
- Flux GCP integration documentation: https://fluxcd.io/flux/integrations/gcp/
- Flux optional components documentation: https://fluxcd.io/flux/installation/configuration/optional-components/
- Flux ImageRepository documentation: https://fluxcd.io/flux/components/image/imagerepositories/
- Flux HelmRepository documentation: https://fluxcd.io/flux/components/source/helmrepositories/
- Google Cloud Managed Service for Prometheus managed collection documentation: https://cloud.google.com/stackdriver/docs/managed-prometheus/setup-managed

## Issues Found
- The post used the older generic "Workload Identity" wording and assumed a GKE-style service account member string. For Anthos Bare Metal / Google Distributed Cloud bare metal, the post now refers to Workload Identity Federation and uses Workload Identity Pool principal identifiers for the Flux Kubernetes service accounts.
- The bootstrap command used `ImageRepository` later in the guide but did not install Flux's image controllers. The command now includes `--components-extra=image-reflector-controller,image-automation-controller`.
- The Artifact Registry setup only configured `image-reflector-controller`, but OCI HelmRepository access is handled by `source-controller`. The IAM binding and Flux service account patch now cover both controllers.
- The Flux GCP object-level Workload Identity example omitted required `ObjectLevelWorkloadIdentity` controller feature gates and `serviceAccountName` fields. The `flux-system/kustomization.yaml`, `ImageRepository`, and `HelmRepository` examples were updated accordingly.
- The Managed Service for Prometheus section said to deploy the stack with a `PodMonitoring` resource. The text now states that managed collection must already be installed, and the `PodMonitoring` resource is for scraping Flux metrics.
- The best practices section claimed fleet-level policies could enforce Flux version and configuration. This was softened to consistent cluster policy because Google Cloud Fleet policy tooling does not directly enforce Flux controller versions.

## Review Notes
- Flux's OCI `HelmRepository` type is still valid, but Flux documentation notes it is in maintenance mode and recommends `OCIRepository` for improved OCI Helm chart support in future revisions.
- Local verification with `flux` and `gcloud --help` was not possible because neither CLI is installed in this workspace, so command flags and API fields were verified against official documentation.
