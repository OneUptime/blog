# Validation Summary: How to Create Azure Communication Services with OpenTofu

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- OpenTofu
- Azure Resource Manager (`azurerm`) provider
- Azure Communication Services
- Azure Communication Services Email
- Azure Event Grid
- HCL

## Sources Consulted
- OpenTofu `plan` command: https://opentofu.org/docs/cli/commands/plan/
- OpenTofu `apply` command: https://opentofu.org/docs/cli/commands/apply/
- AzureRM provider README: https://github.com/hashicorp/terraform-provider-azurerm/blob/main/README.md
- AzureRM `azurerm_communication_service` resource: https://github.com/hashicorp/terraform-provider-azurerm/blob/main/website/docs/r/communication_service.html.markdown
- AzureRM `azurerm_email_communication_service` resource: https://github.com/hashicorp/terraform-provider-azurerm/blob/main/website/docs/r/email_communication_service.html.markdown
- AzureRM `azurerm_email_communication_service_domain` resource: https://github.com/hashicorp/terraform-provider-azurerm/blob/main/website/docs/r/email_communication_service_domain.html.markdown
- AzureRM `azurerm_communication_service_email_domain_association` resource: https://github.com/hashicorp/terraform-provider-azurerm/blob/main/website/docs/r/communication_service_email_domain_association.html.markdown
- AzureRM `azurerm_eventgrid_event_subscription` resource: https://github.com/hashicorp/terraform-provider-azurerm/blob/main/website/docs/r/eventgrid_event_subscription.html.markdown
- Azure Communication Services overview: https://learn.microsoft.com/en-us/azure/communication-services/overview
- Azure Communication Services as an Event Grid source: https://learn.microsoft.com/en-us/azure/event-grid/event-schema-communication-services
- Azure Communication Services SMS events: https://learn.microsoft.com/en-us/azure/event-grid/communication-services-telephony-sms-events
- Create and manage Email Communication Service resource: https://learn.microsoft.com/en-us/azure/communication-services/quickstarts/email/create-email-communication-resource
- Add custom verified email domains: https://learn.microsoft.com/en-us/azure/communication-services/quickstarts/email/add-custom-verified-domains

## Issues Found
- The post omitted the required AzureRM provider configuration. I added `provider "azurerm" { features {} }` because AzureRM examples require the `features {}` block and the deployment commands otherwise would not be complete as shown.
- The email-linking example used a second `azurerm_communication_service` resource with a non-existent `linked_email_service_ids` argument. I replaced it with the correct `azurerm_communication_service_email_domain_association` resource, which is the documented way to associate an email domain with a Communication Service.
- The custom-domain section implied the domain was already verified just by creating the domain resource. I corrected the wording to state that Azure returns DNS verification records that must be published before the domain can be used for email.
- The Event Grid prose mentioned “call ended” events, but the example subscribes only to SMS events (`Microsoft.Communication.SMSReceived` and `Microsoft.Communication.SMSDeliveryReportReceived`). I corrected the text to match the actual configuration.

## Review Notes
- The `tofu init`, `tofu plan -out=tfplan`, and `tofu apply tfplan` commands are current and match OpenTofu documentation.
- The HCL snippets parse successfully after the fixes.
- If this post is later expanded to subscribe to email engagement events, the email domain example should also enable `user_engagement_tracking_enabled` on the domain resource.
