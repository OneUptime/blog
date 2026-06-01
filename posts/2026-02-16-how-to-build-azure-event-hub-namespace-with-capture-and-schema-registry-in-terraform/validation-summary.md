# Validation Summary: How to Build Azure Event Hub Namespace with Capture and Schema Registry

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Terraform
- HashiCorp AzureRM provider
- Azure Event Hubs
- Event Hubs Capture
- Azure Event Hubs Schema Registry
- Azure Storage
- Azure CLI

## Sources Consulted
- HashiCorp Terraform AzureRM provider documentation: `azurerm_eventhub` - https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/eventhub
- HashiCorp Terraform AzureRM provider documentation: `azurerm_eventhub_namespace` - https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/eventhub_namespace
- HashiCorp Terraform AzureRM provider documentation: `azurerm_eventhub_namespace_schema_group` - https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/eventhub_namespace_schema_group
- HashiCorp Terraform AzureRM provider documentation: `azurerm_eventhub_authorization_rule` - https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/eventhub_authorization_rule
- HashiCorp Terraform AzureRM provider documentation: `azurerm_storage_container` - https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/storage_container
- Microsoft Learn: Schema Registry in Azure Event Hubs - https://learn.microsoft.com/en-us/azure/event-hubs/schema-registry-concepts
- Microsoft Learn: Compare Azure Event Hubs tiers - https://learn.microsoft.com/en-us/azure/event-hubs/compare-tiers
- Microsoft Learn: Capture events through Azure Event Hubs - https://learn.microsoft.com/en-us/azure/event-hubs/event-hubs-capture-overview
- Microsoft Learn: Automatically scale up Azure Event Hubs throughput units - https://learn.microsoft.com/en-us/azure/event-hubs/event-hubs-auto-inflate
- Microsoft Learn: Azure CLI `az storage blob list` reference - https://learn.microsoft.com/en-us/cli/azure/storage/blob?view=azure-cli-latest#az-storage-blob-list

## Issues Found
- The storage container example used the deprecated `storage_account_name` argument. Changed it to `storage_account_id`, which is the current AzureRM provider argument.
- The Event Hub examples used older parent reference arguments. Changed `azurerm_eventhub` examples to use `namespace_id`, matching current provider examples.
- The Premium tier description incorrectly said Premium adds dedicated clusters and larger message sizes. Updated it to describe Premium resource isolation and higher limits, and moved dedicated clusters and larger message sizes to the Dedicated tier.
- The Schema Registry compatibility explanations for Forward and Backward were inaccurate, and the post listed `Full`, which Azure Event Hubs Schema Registry does not document as a supported compatibility mode. Corrected the Forward and Backward descriptions and removed `Full`.
- The cost section said auto-inflate means you only pay for throughput units actually used. Updated it to state that auto-inflate scales Standard tier throughput units up and billing is hourly based on the maximum selected during the hour.
- The Capture cost description said Capture adds a per-event cost. Updated it to state that Standard tier Capture is billed separately based on namespace throughput units.

## Review Notes
The Azure CLI command is syntactically valid, but in many environments it should include `--auth-mode login`, an account key, a SAS token, or a connection string depending on how Azure Storage authentication is configured.
