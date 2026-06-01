# Validation Summary: How to Deploy Azure Red Hat OpenShift Clusters with Terraform

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Azure Red Hat OpenShift
- Terraform
- AzureRM Terraform provider
- AzureAD Terraform provider
- Azure CLI
- OpenShift CLI
- Microsoft Entra ID
- Azure networking and RBAC

## Sources Consulted
- Terraform Registry: azurerm_redhat_openshift_cluster resource: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/redhat_openshift_cluster
- Terraform Registry: azuread_service_principal_password resource: https://registry.terraform.io/providers/hashicorp/azuread/2.49.1/docs/resources/service_principal_password
- Terraform Registry: azuread_service_principal data source: https://registry.terraform.io/providers/hashicorp/azuread/2.45.0/docs/data-sources/service_principal
- Microsoft Learn: Create an Azure Red Hat OpenShift cluster with managed identities: https://learn.microsoft.com/en-us/azure/openshift/howto-create-openshift-cluster
- Microsoft Learn: Create a service principal to deploy an Azure Red Hat OpenShift cluster: https://learn.microsoft.com/en-us/azure/openshift/howto-create-service-principal
- Microsoft Learn: Azure Red Hat OpenShift support lifecycle: https://learn.microsoft.com/en-us/azure/openshift/support-lifecycle
- Microsoft Learn: What's new with Azure Red Hat OpenShift: https://learn.microsoft.com/en-us/azure/openshift/azure-redhat-openshift-release-notes
- Microsoft Learn: Connect to an Azure Red Hat OpenShift 4 cluster: https://learn.microsoft.com/en-us/azure/openshift/connect-cluster
- Microsoft Azure pricing: Azure Red Hat OpenShift pricing: https://azure.microsoft.com/pricing/details/openshift/
- Red Hat Developer: How to deploy Azure Red Hat OpenShift using Terraform: https://developers.redhat.com/articles/2025/09/04/how-deploy-azure-red-hat-openshift-using-terraform

## Issues Found
- The Terraform ARO cluster example used `encryption_at_host = "Enabled"` in `main_profile` and `worker_profile`. The AzureRM provider uses `encryption_at_host_enabled = true`, so both snippets were corrected.
- The AzureAD service principal password example used `azuread_service_principal.aro.id` with AzureAD provider 2.x. The provider documentation expects the service principal object ID, so this was changed to `azuread_service_principal.aro.object_id`.
- The ARO resource provider service principal was looked up by display name. The official Terraform examples use the stable ARO RP client ID, so the data source now uses `client_id = "f1dd0a37-89c6-4e07-bcd1-ffd3d43d8875"`.
- The post stated that a Red Hat pull secret is required. Microsoft documentation describes it as optional but recommended, so the prerequisite wording was corrected.
- The Terraform example hard-coded OpenShift `4.14`, which is outdated for a 2026 post and region availability changes over time. The example now uses an `openshift_version` variable and tells readers to check installable versions with `az aro get-versions --location <region>`.
- The networking example used /24 subnets and omitted the Microsoft.Storage service endpoint. The official examples use /23 master and worker subnets under a /22 VNet and include Microsoft.Storage and Microsoft.ContainerRegistry service endpoints, so the CIDRs and service endpoints were updated.
- The generated API server output constructed an `aroapp.io` URL manually. Terraform exports the actual API server URL, so the output now uses `azurerm_redhat_openshift_cluster.main.api_server_profile[0].url`.
- The post described Argo CD as built into newer OpenShift versions. This was corrected to OpenShift GitOps, which is based on Argo CD and installed as an operator.
- The cost/scaling section implied resizing by updating Terraform `worker_profile`. The AzureRM schema marks worker profile changes as forcing replacement, so the text now points readers to OpenShift MachineSets or ARO tooling for post-deployment scaling and notes the Terraform replacement behavior.
- The post used the older Azure AD name for identity integration. This was updated to Microsoft Entra ID.

## Review Notes
The Azure CLI was not installed in the local environment, so CLI command validation was performed against Microsoft Learn rather than local `az --help` output. The post still uses AzureRM 3.x and AzureAD 2.x provider constraints; these are not inherently deprecated for the examples shown, but a future modernization pass could update the post to AzureRM 4.x and AzureAD 3.x with the corresponding provider configuration changes.
