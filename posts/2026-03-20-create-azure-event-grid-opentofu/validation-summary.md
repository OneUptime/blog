# Validation Summary: How to Create Azure Event Grid Topics with OpenTofu

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- OpenTofu / Terraform
- Azure Event Grid (custom topics, system topics, event subscriptions)
- HashiCorp azurerm provider (~> 3.0)
- Azure Functions (as event handler endpoint)
- Azure Storage Queue and Blob Storage (as event destinations and dead letter targets)
- Azure Event Hubs (as event destination)
- HCL configuration syntax

## Sources Consulted
- Terraform azurerm provider docs for `azurerm_eventgrid_event_subscription`: https://github.com/hashicorp/terraform-provider-azurerm/blob/main/website/docs/r/eventgrid_event_subscription.html.markdown
- Terraform azurerm provider docs for `azurerm_eventgrid_topic` (input_schema values: EventGridSchema, CloudEventSchemaV1_0, CustomEventSchema)
- Terraform azurerm provider docs for `azurerm_eventgrid_system_topic` and `azurerm_eventgrid_system_topic_event_subscription`

## Issues Found
- **Incorrect dead letter destination syntax.** The original post used a `dead_letter_destination` block with a nested `storage_blob_container_endpoint` sub-block containing `storage_account_id` and `container_name`. This is not a valid argument for `azurerm_eventgrid_event_subscription`. The provider exposes a top-level block named `storage_blob_dead_letter_destination` with the attributes `storage_account_id` and `storage_blob_container_name`. Updated the example in the "Event Subscription to Storage Queue" section to use the correct block name and attribute names.

## Review Notes
- The `azurerm` provider pin (`~> 3.0`) is valid; provider 4.x exists but the post's examples remain compatible with the 3.x line. No version-specific changes were required.
- All `advanced_filter` operator names used (`number_greater_than_or_equals`) are valid per the provider schema.
- `retry_policy` constraints are correct: `max_delivery_attempts` (1-30) and `event_time_to_live` (1-1440 minutes).
- `input_schema` accepted values listed in the comment are correct: `EventGridSchema`, `CloudEventSchemaV1_0`, `CustomEventSchema`.
- The system topic example correctly uses the resource name (not ID) for the `system_topic` field on `azurerm_eventgrid_system_topic_event_subscription`.
