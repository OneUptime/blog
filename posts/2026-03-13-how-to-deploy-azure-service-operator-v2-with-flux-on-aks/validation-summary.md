# Validation Summary: How to Deploy Azure Service Operator v2 with Flux on AKS

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Azure Service Operator v2
- Azure Kubernetes Service (AKS)
- Microsoft Entra Workload ID / workload identity federation
- Flux HelmRelease, HelmRepository, and Kustomization
- cert-manager
- Azure CLI
- Kubernetes custom resources and Secrets

## Sources Consulted
- Azure Service Operator authentication documentation: https://azure.github.io/azure-service-operator/guide/authentication/
- Azure Service Operator credential format documentation: https://azure.github.io/azure-service-operator/guide/authentication/credential-format/
- Azure Service Operator CRD management documentation: https://azure.github.io/azure-service-operator/guide/crd-management/
- Azure Service Operator Helm chart values and chart index: https://raw.githubusercontent.com/Azure/azure-service-operator/main/v2/charts/azure-service-operator/values.yaml and https://raw.githubusercontent.com/Azure/azure-service-operator/main/v2/charts/index.yaml
- Azure Service Operator storage API reference and generated type definitions: https://azure.github.io/azure-service-operator/reference/storage/v20230101/ and https://raw.githubusercontent.com/Azure/azure-service-operator/main/v2/api/storage/v1api20230101/storage_account_types_gen.go
- Azure Service Operator PostgreSQL generated type definitions: https://raw.githubusercontent.com/Azure/azure-service-operator/main/v2/api/dbforpostgresql/v1api20221201/flexible_server_types_gen.go
- cert-manager Helm installation documentation: https://cert-manager.io/docs/installation/helm/
- cert-manager Helm chart index: https://charts.jetstack.io/index.yaml
- Flux HelmRelease specification: https://github.com/fluxcd/helm-controller/blob/main/docs/spec/v2/helmreleases.md
- Flux Kustomization specification: https://github.com/fluxcd/kustomize-controller/blob/main/docs/spec/v1/kustomizations.md
- Azure CLI federated identity credential documentation: https://learn.microsoft.com/en-us/cli/azure/identity/federated-credential
- Azure CLI role assignment documentation: https://learn.microsoft.com/en-us/cli/azure/role/assignment

## Issues Found
- The cert-manager Helm example used chart version `1.14.*` and `installCRDs: true`. Current cert-manager documentation recommends `crds.enabled=true`, and the current stable chart available from the Jetstack repository is `v1.20.2`, so the example now uses `version: "v1.20.*"` and `values.crds.enabled: true`.
- The Azure CLI setup used `AZURE_TENANT_ID` later in the ASO Helm values but never initialized it. Added `AZURE_TENANT_ID=$(az account show --query tenantId -o tsv)`.
- The role assignment command used `--assignee-object-id` without `--assignee-principal-type`. Azure CLI documentation recommends using `--assignee-principal-type` with object IDs to avoid propagation latency issues, so `--assignee-principal-type ServicePrincipal` was added.
- The federated credential command used `--audience`, but the current Azure CLI parameter is `--audiences`. Updated the command accordingly.
- The ASO HelmRelease pinned `version: "2.6.*"`, while the official ASO chart repository currently publishes `2.19.0`. Updated the example to `version: "2.19.*"`.
- The PostgreSQL example referenced `administratorLoginPassword` from a Kubernetes secret that the post had not mentioned. Added a short note that the `postgres-admin-password` secret must already exist.
- The storage secret export example claimed ASO can export connection strings and used `connectionString1`, but ASO v2 storage account operator secrets expose keys and endpoints such as `key1`, `key2`, and `blobEndpoint`, not a `connectionString1` field. Updated the explanation and YAML to export `blobEndpoint`.
- The Flux Kustomization example had `aso-infra` depend on `cert-manager`, but `Kustomization.spec.dependsOn` references other Flux Kustomization objects, while the post only defined cert-manager as a HelmRelease. Removed that invalid dependency from the Kustomization example; the ASO HelmRelease already depends on the cert-manager HelmRelease.

## Review Notes
The ASO `crdPattern`, workload identity subject, ASO Helm values, Flux HelmRelease fields, Flux Kustomization fields, and ASO resource API versions used in the resource examples are consistent with the consulted official references. The examples still use placeholder resource names and assume the AKS cluster was created with OIDC issuer and workload identity enabled, as stated in prerequisites.
