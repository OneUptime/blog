# Validation Summary: How to Use Crossplane Provider for GCP

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Kubernetes
- Crossplane
- Crossplane GCP Upjet provider family
- Google Cloud Platform
- Google Cloud SDK
- GKE Workload Identity
- Prometheus Operator PrometheusRule

## Sources Consulted
- Crossplane provider package documentation: https://docs.crossplane.io/latest/packages/providers/
- Crossplane v1.20 GCP quickstart for provider-upjet-gcp: https://docs.crossplane.io/v1.20/getting-started/provider-gcp/
- Crossplane provider runtime configuration documentation: https://docs.crossplane.io/v1.20/concepts/providers/
- crossplane-contrib/provider-gcp archived repository: https://github.com/crossplane-contrib/provider-gcp
- crossplane-contrib/provider-upjet-gcp generated examples and CRDs for v1.12.1: https://github.com/crossplane-contrib/provider-upjet-gcp/tree/v1.12.1
- Upbound Marketplace provider/resource references for GCP providers: https://marketplace.upbound.io/
- Google Cloud IAM service account key documentation: https://docs.cloud.google.com/iam/docs/keys-create-delete
- Google Cloud SDK `gcloud iam service-accounts keys create` reference: https://docs.cloud.google.com/sdk/gcloud/reference/iam/service-accounts/keys/create
- Google Cloud GKE Workload Identity documentation: https://docs.cloud.google.com/kubernetes-engine/docs/how-to/workload-identity

## Issues Found
- The post installed `crossplane-contrib/provider-gcp:v0.36.0`, but the legacy `provider-gcp` project is archived and its stable GitHub releases only go to `v0.22.0`. Updated the tutorial to use the Crossplane-documented Upjet GCP provider family packages at `v1.12.1`.
- The post mixed legacy `*.gcp.crossplane.io` API groups with Upjet-style `spec.forProvider` fields. Updated ProviderConfig and managed resources to `*.gcp.upbound.io` API groups.
- The Cloud Storage bucket used invalid fields for the selected provider. Simplified it to valid Upjet `Bucket` fields.
- The Cloud SQL example used legacy `CloudSQLInstance` and deprecated `requireSsl`. Changed it to `sql.gcp.upbound.io/v1beta2` `DatabaseInstance`, used the correct list-shaped nested blocks, and replaced `requireSsl` with `sslMode`.
- The Compute Engine VM example used legacy-style boot disk and startup script fields. Updated it to the Upjet `Instance` schema with list-shaped `bootDisk`, `initializeParams.image`, and `metadataStartupScript`.
- The GKE cluster and node pool examples used mixed API versions and invalid nested field shapes. Updated them to `container.gcp.upbound.io/v1beta1`, added labels for selectors, corrected autoscaling and management blocks, and replaced kubeconfig-secret retrieval with `gcloud container clusters get-credentials`.
- The VPC and service networking examples used legacy API groups and selector targets without labels. Updated API groups, added selector labels, corrected `logConfig`, and changed service networking reserved range references to `reservedPeeringRangesRefs`.
- The Workload Identity section configured a Kubernetes service account but did not make provider pods use it. Added a `DeploymentRuntimeConfig` and provider patches that set `runtimeConfigRef`.
- Monitoring and troubleshooting commands referenced legacy resource names and provider labels. Updated the Cloud SQL resource commands and provider log label.

## Review Notes
The examples are now aligned to Crossplane v1.20's documented community Upjet GCP provider family. Newer Crossplane 2.x and Upbound official provider packages may use different package names, scopes, and API groups, so future updates should re-check the provider version selected for the tutorial.
