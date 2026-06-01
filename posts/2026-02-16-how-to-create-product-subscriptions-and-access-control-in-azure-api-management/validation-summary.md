# Validation Summary: How to Create Product Subscriptions and Access Control in Azure API Management

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Azure API Management
- API Management products
- API Management subscriptions and subscription keys
- API Management policies
- Azure CLI and Azure Resource Manager REST API
- Microsoft Entra ID groups
- Azure Functions
- Application Insights / Kusto Query Language

## Sources Consulted
- Microsoft Learn: Subscriptions in Azure API Management: https://learn.microsoft.com/en-us/azure/api-management/api-management-subscriptions
- Microsoft Learn: Tutorial - Create and publish a product in Azure API Management: https://learn.microsoft.com/en-us/azure/api-management/api-management-howto-add-products
- Microsoft Learn: Azure API Management policy reference - rate-limit: https://learn.microsoft.com/en-us/azure/api-management/rate-limit-policy
- Microsoft Learn: Azure API Management policy reference - quota: https://learn.microsoft.com/en-us/azure/api-management/quota-policy
- Microsoft Learn: Policies in Azure API Management: https://learn.microsoft.com/en-us/azure/api-management/api-management-howto-policies
- Microsoft Learn: Azure CLI az apim product reference: https://learn.microsoft.com/en-us/cli/azure/apim/product
- Microsoft Learn: Subscription - Create Or Update REST API: https://learn.microsoft.com/en-us/rest/api/apimanagement/subscription/create-or-update
- Microsoft Learn: How to create and use groups to manage developer accounts in Azure API Management: https://learn.microsoft.com/en-us/azure/api-management/api-management-howto-create-groups
- Microsoft Learn: Authorize developer accounts by using Microsoft Entra ID in Azure API Management: https://learn.microsoft.com/en-us/azure/api-management/api-management-howto-aad
- Microsoft Learn: Send events from API Management to Event Grid: https://learn.microsoft.com/en-us/azure/api-management/how-to-event-grid
- Microsoft Learn: API Management as an Event Grid source: https://learn.microsoft.com/en-us/azure/event-grid/event-schema-api-management

## Issues Found
- The product policy XML snippets used `inbound` and `outbound` as separate top-level elements, which is not a valid standalone APIM policy document. Wrapped both snippets in the required `policies` root element.
- The subscription scope section said scopes are configured under instance subscription settings. Updated it to state that the scope is selected when creating a subscription, while product/API settings control whether a subscription key is required.
- The post showed `az apim subscription create`, but the current official Azure CLI reference does not provide that command group. Replaced it with an `az rest` example that calls the current API Management Subscription Create Or Update ARM REST API.
- The built-in Administrators group was described as having full access to the APIM instance. Updated this to developer portal administration, matching the APIM group model and avoiding confusion with Azure RBAC permissions.
- The Azure AD group section used older naming and portal language. Updated it to Microsoft Entra ID / Microsoft Entra group terminology and clarified that synchronization happens when users sign in or groups synchronize.
- The Azure Function approval example claimed APIM emits an Event Grid event for subscription approval requests. APIM Event Grid events cover supported control-plane and selected data-plane events, not subscription request approval. Changed the example to a scheduled function that checks submitted subscriptions through the APIM REST API.
- The product lifecycle section listed Draft, Deprecated, and Retired as APIM product states. APIM products have `notPublished` and `published` states. Rewrote the section to distinguish built-in product states from an operational deprecation/retirement process.

## Review Notes
The remaining examples are intentionally illustrative. The Azure Function snippet assumes helper methods such as `GetSubmittedSubscriptions` and `ApproveSubscription` are implemented against the APIM REST API.
