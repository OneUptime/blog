# Validation Summary: How to Build a Transactable SaaS Offer on Azure Marketplace

## Status
validated

## Post Type
Tutorial / Implementation guide

## Technologies Covered
- Azure Marketplace / Microsoft commercial marketplace
- SaaS transactable offers
- SaaS Fulfillment APIs v2
- ASP.NET Core MVC
- Microsoft Entra ID authentication
- Marketplace webhooks
- C# HttpClient
- curl

## Sources Consulted
- Microsoft Learn: Build the landing page for your transactable SaaS offer in Microsoft Marketplace - https://learn.microsoft.com/en-us/partner-center/marketplace-offers/azure-ad-transactable-saas-landing-page
- Microsoft Learn: SaaS fulfillment Subscription APIs v2 in Microsoft Marketplace - https://learn.microsoft.com/en-us/partner-center/marketplace-offers/pc-saas-fulfillment-subscription-api
- Microsoft Learn: SaaS fulfillment Operations APIs v2 in Microsoft Marketplace - https://learn.microsoft.com/en-us/partner-center/marketplace-offers/pc-saas-fulfillment-operations-api
- Microsoft Learn: Implementing a webhook on the SaaS service - https://learn.microsoft.com/en-us/partner-center/marketplace-offers/pc-saas-fulfillment-webhook
- Microsoft Learn: Managing the SaaS subscription life cycle - https://learn.microsoft.com/en-us/partner-center/marketplace-offers/pc-saas-fulfillment-life-cycle

## Issues Found
- The post described token resolution and activation as always required. Microsoft documents an auto-activation mode where the publisher does not call Resolve or Activate and receives a Subscribe webhook instead, so the flow was scoped to manually activated plans.
- The lifecycle diagram activated the Marketplace subscription before provisioning the SaaS tenant. Microsoft documents activation as occurring after the SaaS account is configured, so the diagram was corrected to provision first and then call Activate.
- The landing page code treated the Resolve API response as if it were the Get Subscription response. The Resolve API returns top-level fields such as `subscriptionName` plus a nested `subscription` object, so the sample was updated to use a `MarketplaceResolveResponse` shape and read purchaser details from the nested subscription.
- The Resolve token from the landing page URL was used directly. Microsoft notes that the URL token is encoded and should be decoded before being sent in the `x-ms-marketplace-token` header, so the sample now decodes it before resolving.
- The Activate API sample sent a `planId` JSON body. Microsoft documents the Activate call as a POST to the activation endpoint without a request payload, so the client and controller were updated to call activation without a plan body.
- The webhook code called `UpdateOperationStatusAsync`, but the client wrapper did not include that method. Added a matching Operations API PATCH wrapper using the documented `/operations/{operationId}` endpoint and `status` payload.
- The webhook cancellation handler acknowledged `Unsubscribe` with an operation status PATCH. Microsoft documents `Unsubscribe` as a notify-only webhook event, so that operation acknowledgement was removed.
- The quantity-change webhook updated the local tenant quantity but did not acknowledge the operation. Added an operation status update for `ChangeQuantity`.
- The Partner Center configuration text used the older "Azure AD" name and implied a generic permission. Updated it to Microsoft Entra terminology and tied the app registration to the SaaS offer and SaaS Fulfillment API token resource.
- The sandbox `curl` comment said it generated a test token. The command resolves a marketplace token; the comment was corrected.

## Review Notes
The code remains illustrative and omits full model definitions, dependency injection setup, and the actual Microsoft Entra JWT validation implementation for webhooks. The post now calls out token validation in the webhook path, but a production implementation should show a complete validation example.
