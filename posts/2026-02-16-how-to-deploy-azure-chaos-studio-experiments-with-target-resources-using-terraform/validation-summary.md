# Validation Summary: How to Deploy Azure Chaos Studio Experiments

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Azure Chaos Studio
- Terraform
- AzureRM Terraform provider
- AzAPI Terraform provider
- Azure Virtual Machine Scale Sets
- Azure managed identities and RBAC
- Azure CLI REST calls
- GitHub Actions

## Sources Consulted
- Azure Chaos Studio fault and action library: https://learn.microsoft.com/en-us/azure/chaos-studio/chaos-studio-fault-library
- Azure Chaos Studio agent-based CLI tutorial: https://learn.microsoft.com/en-us/azure/chaos-studio/chaos-studio-tutorial-agent-based-cli
- Azure Chaos Studio service-direct CLI tutorial: https://learn.microsoft.com/en-us/azure/chaos-studio/chaos-studio-tutorial-service-direct-cli
- Azure Chaos Studio Resource Manager template samples for agents: https://learn.microsoft.com/en-us/azure/chaos-studio/chaos-agent-arm-template
- Azure Chaos Studio supported resource types and role assignments: https://learn.microsoft.com/en-us/azure/chaos-studio/chaos-studio-fault-providers
- Terraform Registry, azurerm_chaos_studio_experiment: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/chaos_studio_experiment
- Terraform Registry, azurerm_chaos_studio_target: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/chaos_studio_target
- Terraform Registry, azurerm_chaos_studio_capability: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/chaos_studio_capability
- Azure AzAPI Terraform provider documentation: https://learn.microsoft.com/en-us/azure/developer/terraform/overview-azapi-provider
- Azure Login GitHub Action documentation: https://github.com/Azure/login

## Issues Found
- The post said the sample VM scale set was behind a load balancer, but no load balancer was provisioned. Updated the wording to describe a VM scale set only.
- The agent-based target example used `azurerm_chaos_studio_target` without the required managed identity target properties. Replaced that part with an `azapi_resource` target using a user-assigned managed identity.
- The VMSS used only a system-assigned identity for the Chaos Agent. Updated the VMSS to also attach a user-assigned identity, matching Azure Chaos Agent authentication guidance.
- The Chaos Agent extension settings used an incorrect nested shape and passed a principal ID as a client ID. Updated the settings to use `profile`, `auth.msi.clientid`, and the target `agentProfileId`.
- The network disconnect capability used `NetworkDisconnect-1.0`, but current Azure Chaos Studio documentation lists `NetworkDisconnect-1.2`. Updated the capability name and references.
- The experiment Terraform used `step` and `action` blocks, arbitrary action names, and JSON-encoded parameter maps. Updated examples to use the AzureRM provider's `steps` and `actions` blocks, capability `urn` values, and Terraform maps.
- The CPU pressure action targeted the service-direct selector and omitted required VMSS instance parameters. Updated it to target the agent selector and include `virtualMachineScaleSetInstances`.
- The VMSS shutdown action was modeled as a discrete action without a duration. Updated it to a continuous action with the `Shutdown-2.0` URN and duration.
- The network disconnect parameters used unsupported `destinationAddresses` and `direction` fields. Updated them to `destinationFilters` with a packet filter JSON value and VMSS instance IDs.
- The RBAC section only assigned permissions for service-direct VMSS shutdown. Added Reader permissions for agent-based faults and a Reader role assignment for the separate network experiment identity.
- The Azure CLI examples used `az chaos` commands that were not aligned with Microsoft Learn's Chaos Studio CLI examples. Replaced them with documented `az rest` calls for start, get, and execution listing.
- The GitHub Actions OIDC login example omitted required `permissions`. Added `id-token: write` and `contents: read`.

## Review Notes
- Terraform and Azure CLI binaries were not installed in the local environment, so validation was performed against official documentation rather than local `terraform validate` or `az --help` output.
- The examples assume a uniform VM scale set with instances `0`, `1`, and `2`; users should adjust `virtualMachineScaleSetInstances` for their actual VMSS instance IDs.
