# Validation Summary: How to Build a Shopify Backend Integration with Azure Functions

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Azure Functions
- Azure CLI
- Azure Service Bus
- Azure Cosmos DB
- Shopify Admin GraphQL API
- Shopify webhooks
- Node.js
- JavaScript

## Sources Consulted
- Azure Functions Node.js developer guide: https://learn.microsoft.com/en-us/azure/azure-functions/functions-reference-node
- Azure Functions supported languages: https://learn.microsoft.com/en-us/azure/azure-functions/supported-languages
- Azure Functions runtime versions: https://learn.microsoft.com/en-us/azure/azure-functions/functions-versions
- Azure Functions triggers and bindings: https://learn.microsoft.com/en-us/azure/azure-functions/functions-triggers-bindings
- Shopify API versioning: https://shopify.dev/docs/api/usage/versioning
- Shopify REST Admin API versioning and legacy status: https://shopify.dev/docs/api/admin-rest/usage/versioning
- Shopify webhook HTTPS delivery and HMAC verification: https://shopify.dev/docs/apps/build/webhooks/subscribe/https
- Shopify webhook subscription management: https://shopify.dev/docs/apps/build/webhooks/subscribe
- Shopify GraphQL Admin API WebhookSubscriptionTopic enum: https://shopify.dev/docs/api/admin-graphql/latest/enums/WebhookSubscriptionTopic
- Shopify GraphQL Admin API WebhookSubscriptionInput: https://shopify.dev/docs/api/admin-graphql/latest/input-objects/WebhookSubscriptionInput
- Shopify GraphQL Admin API fulfillmentCreate mutation: https://shopify.dev/docs/api/admin-graphql/latest/mutations/fulfillmentCreate
- Shopify GraphQL Admin API Order fulfillmentOrders field: https://shopify.dev/docs/api/admin-graphql/latest/objects/Order
- Shopify GraphQL Admin API ProductVariant object and productVariants query: https://shopify.dev/docs/api/admin-graphql/latest/objects/ProductVariant
- Shopify GraphQL Admin API inventorySetQuantities mutation: https://shopify.dev/docs/api/admin-graphql/latest/mutations/inventorySetQuantities

## Issues Found
- The Azure Function App command used Node.js 20. As of the review date, Azure Functions lists Node.js 20 support ending on April 30, 2026, so the command was updated to Node.js 22.
- The Azure storage account and Function App names were fixed literal examples that could fail because those names must be globally unique. Added a shell suffix and reused it consistently in the commands.
- The webhook registration example used an outdated `@shopify/shopify-api` REST client style and REST topics. Replaced it with a current Shopify GraphQL Admin API `webhookSubscriptionCreate` example using 2026-04 and GraphQL webhook topic enum values.
- The HMAC verification helper could throw when the header was missing or when compared buffers had different lengths. Added missing-value checks, base64 buffer decoding, length comparison, and timing-safe comparison.
- The order handler called `notifyInternalSystems(order)` without defining it. Added a small placeholder implementation so the snippet is syntactically complete and executable.
- The fulfillment callback used the retired 2024-01 API version and the old order fulfillment REST endpoint shape. Replaced it with a GraphQL flow that queries fulfillment orders for the order and calls `fulfillmentCreate` with tracking details.
- The inventory sync used the retired 2024-01 API version and a REST variant lookup by `sku` that is not the current recommended approach. Replaced it with a GraphQL `productVariants` query and `inventorySetQuantities` mutation.

## Review Notes
The JavaScript snippets were checked with `node --check` after editing. The Azure CLI was not installed in the local environment, so CLI validation was performed against Microsoft Learn documentation rather than local `az --help` output.
