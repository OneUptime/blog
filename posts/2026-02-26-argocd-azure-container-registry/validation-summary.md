# Validation Summary: How to Use ArgoCD with Azure Container Registry

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Argo CD
- Azure Container Registry
- Azure Kubernetes Service
- Azure Workload Identity
- Helm OCI charts
- Kubernetes Secrets and Applications
- Azure CLI

## Sources Consulted
- Argo CD Private Repositories documentation: https://argo-cd.readthedocs.io/en/latest/user-guide/private-repositories/
- Argo CD Declarative Setup documentation: https://argo-cd.readthedocs.io/en/latest/operator-manual/declarative-setup/
- Argo CD OCI documentation: https://argo-cd.readthedocs.io/en/latest/user-guide/oci/
- Azure Container Registry Helm OCI documentation: https://learn.microsoft.com/en-us/azure/container-registry/container-registry-helm-repos
- Azure Container Registry authentication documentation: https://learn.microsoft.com/en-us/azure/container-registry/container-registry-authentication
- Azure Container Registry geo-replication documentation: https://learn.microsoft.com/en-gb/azure/container-registry/container-registry-geo-replication
- Azure Container Registry repository-scoped token permissions documentation: https://learn.microsoft.com/en-us/azure/container-registry/container-registry-token-based-repository-permissions
- Azure Workload Identity service account annotations documentation: https://azure.github.io/azure-workload-identity/docs/topics/service-account-labels-and-annotations.html

## Issues Found
- The Argo CD Helm OCI repository examples used `myacregistry.azurecr.io` while the chart push example stores charts under the `helm` namespace. Updated the repository secret and Application `repoURL` values to `myacregistry.azurecr.io/helm` so they match the pushed chart path.
- The managed identity repository secret omitted Argo CD's `useAzureWorkloadIdentity: "true"` setting. Added it so Argo CD will use Azure Workload Identity for the Helm OCI repository.
- The geo-replication section recommended `*.data.azurecr.io` endpoints as regional login servers. Azure documents the normal geo-replication flow through the global login server and regional geo-replica endpoints as `*.geo.azurecr.io`, currently in private preview. Updated the guidance and endpoint examples accordingly.
- The troubleshooting example said the correct URL was only the registry hostname. Updated the comment and URL to show the registry path without the protocol and with the chart namespace.
- The ACR token scope map example granted only `content/read`. Added `metadata/read` so the read-only token can also read chart tag and manifest metadata, which is commonly needed for repository inspection.

## Review Notes
The Azure CLI, Helm, and Argo CD CLIs were not installed in the local environment, so command verification was performed against official documentation rather than local `--help` output. The referenced OneUptime managed identity guide URL returned HTTP 200.
