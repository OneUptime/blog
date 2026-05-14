# Validation Summary: How to Deploy Azure Service Operator with Flux CD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Azure Service Operator v2
- Flux CD
- Kubernetes custom resources and Kustomize
- Azure Kubernetes Service workload identity
- Azure CLI
- Azure Resource Manager resources
- Azure Database for PostgreSQL Flexible Server
- Azure Storage Account
- Azure Cache for Redis

## Sources Consulted
- Azure Service Operator authentication documentation: https://azure.github.io/azure-service-operator/guide/authentication/
- Azure Service Operator credential format documentation: https://azure.github.io/azure-service-operator/guide/authentication/credential-format/
- Azure Service Operator credential scope documentation: https://azure.github.io/azure-service-operator/guide/authentication/credential-scope/
- Azure Service Operator Helm installation documentation: https://azure.github.io/azure-service-operator/guide/installing-from-helm/
- Azure Service Operator CRD management documentation: https://azure.github.io/azure-service-operator/guide/crd-management/
- Azure Service Operator chart repository index: https://raw.githubusercontent.com/Azure/azure-service-operator/main/v2/charts/index.yaml
- Azure Service Operator chart values: https://raw.githubusercontent.com/Azure/azure-service-operator/main/v2/charts/azure-service-operator/values.yaml
- Azure Service Operator resource reference for ResourceGroup: https://azure.github.io/azure-service-operator/reference/resources/v1api20200601/
- Azure Service Operator resource reference for PostgreSQL FlexibleServer: https://azure.github.io/azure-service-operator/reference/dbforpostgresql/v1api20221201/
- Azure Service Operator resource reference for StorageAccount: https://azure.github.io/azure-service-operator/reference/storage/v20230101/
- Azure Service Operator resource reference for Redis: https://azure.github.io/azure-service-operator/reference/cache/v1api20230801/
- Flux HelmRepository documentation: https://fluxcd.io/flux/components/source/helmrepositories/
- Flux HelmRelease documentation: https://fluxcd.io/flux/components/helm/helmreleases/

## Issues Found
- The ASO HelmRepository snippet used an OCI GHCR URL, but the official ASO chart repository is the raw GitHub Helm repository. Updated the Flux HelmRepository to use `https://raw.githubusercontent.com/Azure/azure-service-operator/main/v2/charts` and removed `type: oci`.
- The post created an `aso-credential` secret in `azureserviceoperator-system` while the HelmRelease already configures ASO's global controller settings through Helm values. Removed that misleading secret example and clarified that the Helm release creates the controller settings secret.
- The ASO Kustomize resource list referenced the removed `aso-credential-secret.yaml`. Removed that entry.
- The HelmRelease used `version: "2.x"`. Replaced it with the explicit Flux-supported semver range `">=2.0.0 <3.0.0"`.
- The HelmRelease claimed CRDs were managed by the Helm chart via Flux `crds: CreateReplace`. ASO v2 installs and upgrades selected CRDs through the operator based on `crdPattern`, so the misleading CRD policy lines were removed.
- The Redis `redisConfiguration` example used `maxmemoryPolicy`, but Azure Cache for Redis configuration keys use Azure's hyphenated setting names such as `maxmemory-policy`. Updated the key.
- The secret export section called the exported PostgreSQL hostname a connection string. Updated the heading and wording to "connection information" / "resource information".
- The troubleshooting section referenced the removed `aso-credential` secret. Updated it to check `aso-controller-settings`.
- The Kustomize resource list comment implied Kustomize creates resources strictly in listed order. Adjusted the comment to say the resource group is referenced by dependent resources.

## Review Notes
The examples are valid as a guide, but production users should scope the ASO identity as narrowly as possible instead of granting subscription-wide Contributor, and should pin an exact ASO chart version if they want fully reproducible GitOps deployments.
