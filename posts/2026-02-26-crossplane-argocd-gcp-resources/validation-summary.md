# Validation Summary: How to Manage GCP Resources with Crossplane and ArgoCD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Crossplane
- Upbound GCP providers
- Google Cloud Platform
- Google Cloud Storage
- Cloud SQL for PostgreSQL
- GCP VPC networking and Private Service Access
- GCP IAM and Workload Identity
- Argo CD
- Kubernetes and kubectl

## Sources Consulted
- Crossplane managed resources documentation: https://docs.crossplane.io/latest/managed-resources/managed-resources/
- Crossplane provider package documentation: https://docs.crossplane.io/latest/packages/providers/
- Upbound provider-family-gcp ProviderConfig documentation: https://marketplace.upbound.io/providers/upbound/provider-family-gcp/latest/resources/gcp.upbound.io/ProviderConfig/v1beta1
- Upbound provider-gcp-storage Bucket documentation: https://marketplace.upbound.io/providers/upbound/provider-gcp-storage/latest/resources/storage.gcp.upbound.io/Bucket/v1beta1
- Upbound provider-gcp-storage BucketIAMMember documentation: https://marketplace.upbound.io/providers/upbound/provider-gcp-storage/latest/resources/storage.gcp.upbound.io/BucketIAMMember/v1beta1
- Upbound provider-gcp-sql DatabaseInstance, Database, and User documentation: https://marketplace.upbound.io/providers/upbound/provider-gcp-sql/latest
- Upbound provider-gcp-compute Network, Subnetwork, and GlobalAddress documentation: https://marketplace.upbound.io/providers/upbound/provider-gcp-compute/latest
- Upbound provider-gcp-servicenetworking Connection documentation: https://marketplace.upbound.io/providers/upbound/provider-gcp-servicenetworking/latest/resources/servicenetworking.gcp.upbound.io/Connection/v1beta1
- Upbound provider-gcp-cloudplatform ServiceAccount and IAM member documentation: https://marketplace.upbound.io/providers/upbound/provider-gcp-cloudplatform/latest
- Argo CD sync options documentation: https://argo-cd.readthedocs.io/en/stable/user-guide/sync-options/
- Kubernetes kubectl get reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/

## Issues Found
- The provider installation snippet used a `servicenetworking.gcp.upbound.io/v1beta1` `Connection` later in the article but did not install `provider-gcp-servicenetworking`. Added that provider package to the installation snippet so the Private Service Access resource API is available.
- The service account key example contained a raw `...` entry inside JSON, which made the embedded credentials document invalid JSON. Replaced it with valid placeholder fields commonly present in a Google service account key file.
- The monitoring command used `kubectl get managed -l crossplane.io/provider-gcp`, but Crossplane does not document that as a standard label on managed resources. Changed it to `kubectl get managed`, which is the documented way to list managed resources.

## Review Notes
- The article pins Upbound provider packages to `v1.0.0`. The examples were reviewed against the cluster-scoped `*.gcp.upbound.io/v1beta1` APIs used by those provider versions; newer Upbound GCP provider releases also offer newer package versions and, in some cases, namespaced `*.gcp.m.upbound.io` APIs.
- Several managed resources omit `providerConfigRef`; this is valid because Crossplane providers use a `ProviderConfig` named `default` when no explicit reference is supplied.
- The Argo CD `RespectIgnoreDifferences=true` sync option and `ignoreDifferences` structure match the current Argo CD documentation.
