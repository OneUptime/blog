# Validation Summary: How to Set Up Azure ACI as an Environment in Portainer

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Portainer
- Azure Container Instances (ACI)
- Azure CLI
- Microsoft Entra ID service principals and app registrations
- Azure RBAC

## Sources Consulted
- Portainer Documentation, Add a new environment: https://docs.portainer.io/admin/environments/add
- Portainer Documentation, Add an ACI environment: https://docs.portainer.io/sts/admin/environments/add/aci
- Portainer Documentation, Azure ACI dashboard: https://docs.portainer.io/user/aci/dashboard
- Portainer Documentation, Add a new container in Azure ACI: https://docs.portainer.io/user/aci/containers/add
- Microsoft Learn, Install the Azure CLI on Linux: https://learn.microsoft.com/en-us/cli/azure/install-azure-cli-linux?view=azure-cli-latest
- Microsoft Learn, `az ad app` reference: https://learn.microsoft.com/en-us/cli/azure/ad/app?view=azure-cli-latest
- Microsoft Learn, `az ad sp` reference: https://learn.microsoft.com/en-us/cli/azure/ad/sp?view=azure-cli-latest
- Microsoft Learn, `az ad app credential` reference: https://learn.microsoft.com/en-us/cli/azure/ad/app/credential?view=azure-cli-latest
- Microsoft Learn, `az role assignment` reference: https://learn.microsoft.com/en-us/cli/azure/role/assignment?view=azure-cli-latest
- Microsoft Learn, Azure built-in roles for General: https://learn.microsoft.com/en-us/azure/role-based-access-control/built-in-roles/general
- Microsoft Learn, Subscriptions - List Locations REST API: https://learn.microsoft.com/en-us/rest/api/resources/subscriptions/list-locations?view=rest-resources-2022-12-01

## Issues Found
- The Portainer UI steps were outdated. The post said to select `Azure ACI`, enter a `Subscription ID`, and then click `Save environment`, but current Portainer docs for adding an ACI environment use the `ACI` wizard and the form fields are `Application ID`, `Tenant ID`, and `Authentication Key`. I corrected Step 6 to match the documented workflow.
- The verification section described an immediate empty container list and region/resource-group population after connection. Current Portainer docs describe an Azure ACI dashboard that shows counts for subscriptions, resource groups, and container instances. I updated Step 7 to reflect that flow.
- The Azure CLI example for creating the app registration depended on `jq`, but `jq` was not listed as a prerequisite. I removed that dependency by switching to `--query appId -o tsv`, which is supported by the Azure CLI.
- The RBAC guidance was internally inconsistent. The permissions summary included subscription-level `Reader`, but the command block only assigned `Contributor` on the resource group. I added the subscription `Reader` assignment and updated the troubleshooting command to use `--assignee-object-id` and `--all`, which better matches current Azure CLI guidance.
- The post mixed older Azure AD terminology with current Microsoft Entra ID naming and had a prerequisite that implied the app registration already existed even though the tutorial creates it later. I corrected those technical details while keeping the original structure.

## Review Notes
- Azure CLI still uses the `az ad` command group even though the product name is Microsoft Entra ID. The updated post keeps the current product naming in prose while using the correct CLI commands.
- Portainer UI text can vary slightly between release tracks, but the corrected ACI environment flow matches current Portainer documentation at review time.
