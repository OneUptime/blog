# Validation Summary: How to Create Azure Communication Services in Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform
- HashiCorp AzureRM provider
- Azure Communication Services
- Azure Email Communication Services
- Azure Event Grid
- Azure Functions
- Azure Key Vault
- Azure Monitor diagnostic settings

## Sources Consulted
- AzureRM `azurerm_communication_service` resource: https://github.com/hashicorp/terraform-provider-azurerm/blob/main/website/docs/r/communication_service.html.markdown
- AzureRM `azurerm_email_communication_service` resource: https://github.com/hashicorp/terraform-provider-azurerm/blob/main/website/docs/r/email_communication_service.html.markdown
- AzureRM `azurerm_email_communication_service_domain` resource: https://github.com/hashicorp/terraform-provider-azurerm/blob/main/website/docs/r/email_communication_service_domain.html.markdown
- AzureRM `azurerm_communication_service_email_domain_association` resource: https://github.com/hashicorp/terraform-provider-azurerm/blob/main/website/docs/r/communication_service_email_domain_association.html.markdown
- AzureRM `azurerm_eventgrid_system_topic` resource: https://github.com/hashicorp/terraform-provider-azurerm/blob/main/website/docs/r/eventgrid_system_topic.html.markdown
- AzureRM `azurerm_eventgrid_system_topic_event_subscription` resource: https://github.com/hashicorp/terraform-provider-azurerm/blob/main/website/docs/r/eventgrid_system_topic_event_subscription.html.markdown
- AzureRM `azurerm_linux_function_app` resource: https://github.com/hashicorp/terraform-provider-azurerm/blob/main/website/docs/r/linux_function_app.html.markdown
- AzureRM `azurerm_monitor_diagnostic_setting` resource: https://github.com/hashicorp/terraform-provider-azurerm/blob/main/website/docs/r/monitor_diagnostic_setting.html.markdown
- Azure Communication Services resource creation: https://learn.microsoft.com/en-us/azure/communication-services/quickstarts/create-communication-resource
- Azure Communication Services Event Grid source and event types: https://learn.microsoft.com/en-us/azure/event-grid/event-schema-communication-services
- Azure Communication Services SMS events: https://learn.microsoft.com/en-us/azure/event-grid/communication-services-telephony-sms-events
- Azure Communication Services email custom domains: https://learn.microsoft.com/en-us/azure/communication-services/quickstarts/email/add-custom-verified-domains
- Azure Functions Node.js supported versions: https://learn.microsoft.com/en-us/azure/azure-functions/functions-versions
- Azure App Service and Azure Functions Key Vault references: https://learn.microsoft.com/en-us/azure/app-service/app-service-key-vault-references
- Azure Communication Services supported diagnostic log categories: https://learn.microsoft.com/en-us/azure/azure-monitor/reference/supported-logs/microsoft-communication-communicationservices-logs

## Issues Found
- The Terraform examples pinned AzureRM `~> 3.80`, which is outdated for a current 2026 tutorial. I updated the pin to `~> 4.0`.
- The Event Grid system topic example used `source_arm_resource_id`, which is the AzureRM v3 argument. I changed it to `source_resource_id` for AzureRM v4.
- The diagnostic setting example used the v3 `metric` block. I changed it to `enabled_metric`, which is the current AzureRM v4 block name.
- The Azure Functions example used `node_version = "18"`, which is no longer a current supported Azure Functions Node.js runtime. I changed it to `node_version = "22"`.
- The custom email domain DNS list omitted the domain ownership TXT record and DKIM2 record, and described DMARC as a required verification record. I updated the list to include domain ownership, SPF, DKIM/DKIM2, and describe DMARC as a deliverability best practice.
- The Key Vault section did not mention that storing a generated connection string in `azurerm_key_vault_secret` still places the value in Terraform state. I added a warning to protect the Terraform state backend.

## Review Notes
- The ACS, Email Communication Service, Azure-managed email domain, custom domain, email domain association, Event Grid subscription, and Key Vault reference patterns are valid after the updates.
- The Event Grid event type names shown for SMS received and email delivery reports match Microsoft documentation.
- The diagnostic categories `ChatOperational`, `SMSOperational`, and `AuthOperational` are valid for `Microsoft.Communication/CommunicationServices`.
