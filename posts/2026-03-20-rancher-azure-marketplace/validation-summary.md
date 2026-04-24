# Validation Summary: How to Use Rancher with Azure Marketplace

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- SUSE Rancher / Rancher Prime
- Azure Marketplace
- Azure Kubernetes Service (AKS)
- Microsoft Entra ID (Azure AD)
- Azure DNS
- Azure Cost Management
- cert-manager
- Helm
- kubectl
- Azure CLI
- Traefik

## Sources Consulted
- SUSE Communities: Announcing NeuVector and Rancher Kubernetes Solutions on the Azure Marketplace - https://www.suse.com/c/announcing-neuvector-and-rancher-kubernetes-solutions-on-the-azure-marketplace/
- Rancher Docs: Installing Rancher on Azure Kubernetes Service - https://ranchermanager.docs.rancher.com/getting-started/installation-and-upgrade/install-upgrade-on-a-kubernetes-cluster/rancher-on-aks
- Rancher Docs: Configure Azure AD - https://ranchermanager.docs.rancher.com/v2.14/how-to-guides/new-user-guides/authentication-permissions-and-global-configuration/authentication-config/configure-azure-ad
- Rancher Docs: Rancher Helm Chart Options - https://ranchermanager.docs.rancher.com/getting-started/installation-and-upgrade/installation-references/helm-chart-options
- Rancher Docs: Setting up the Bootstrap Password - https://ranchermanager.docs.rancher.com/getting-started/installation-and-upgrade/resources/bootstrap-password
- Microsoft Learn: Supported Kubernetes versions in Azure Kubernetes Service (AKS) - https://learn.microsoft.com/en-us/azure/aks/supported-kubernetes-versions
- Microsoft Learn: Best practices for network policies in Azure Kubernetes Service (AKS) - https://learn.microsoft.com/en-us/azure/aks/network-policy-best-practices
- Microsoft Learn: az ad app - https://learn.microsoft.com/en-us/cli/azure/ad/app?view=azure-cli-latest
- Microsoft Learn: az ad app permission - https://learn.microsoft.com/en-us/cli/azure/ad/app/permission?view=azure-cli-latest
- Microsoft Learn: Microsoft Graph permissions reference - https://learn.microsoft.com/en-us/graph/permissions-reference
- Microsoft Learn: az costmanagement export - https://learn.microsoft.com/en-us/cli/azure/costmanagement/export?view=azure-cli-latest
- Microsoft Learn: Get usage data with the Azure CLI - https://learn.microsoft.com/en-us/azure/cost-management-billing/automate/get-usage-data-azure-cli
- cert-manager Docs: Helm installation - https://cert-manager.io/docs/installation/helm/

## Issues Found
- The post pinned AKS to Kubernetes `1.29`, even though AKS standard support for `1.29` ended on March 31, 2025 and AKS LTS for `1.29` ends on April 30, 2026. I removed the hard-coded version and added `az aks get-versions` so readers use a currently supported version for their region and Rancher release.
- The manual Rancher installation path assumed an `ingress-nginx` controller already existed on AKS. Current Rancher AKS docs require installing an ingress controller first, so I added the documented Traefik-based ingress setup and updated the Rancher Helm values and DNS IP lookup accordingly.
- The cert-manager install used the older `installCRDs` flag. I updated it to the current `crds.enabled=true` syntax from the cert-manager installation docs and added a webhook rollout check.
- The Azure AD / Entra ID setup was incomplete. The original commands did not register the required redirect URI or grant the Microsoft Graph application permission Rancher needs. I added the redirect URI, Microsoft Graph `Directory.Read.All` application permission, and admin-consent step, and aligned the UI instructions with the current Rancher auth provider flow.
- The billing section used `az costmanagement query`, which is not the current documented Azure CLI path for cost exports. I replaced it with the supported `az costmanagement export create` and `az costmanagement export show` workflow from Microsoft Learn.
- The Marketplace subscription step linked to the generic marketplace root and described plan choices that were not verified in the consulted docs. I updated the link to the direct SUSE Rancher Prime listing and generalized the plan wording.
- The introduction described Rancher as an Azure “managed application,” which was not supported by the consulted Rancher/SUSE docs. I changed this to the more accurate “marketplace offering.”

## Review Notes
- AKS version availability changes regularly. The post now avoids pinning a stale version, but any future version pin should still be checked against both the AKS supported versions page and the Rancher support matrix.
- Rancher’s current AKS documentation prefers Traefik and warns that the community `ingress-nginx` controller reaches end of life in March 2026.
- `az costmanagement` is provided through the Azure CLI `costmanagement` extension, which Azure CLI installs automatically on first use.
