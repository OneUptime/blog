# Validation Summary: How to Secure Dapr Pub/Sub Topics with Scoping

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Dapr (Distributed Application Runtime)
- Dapr Pub/Sub building block
- Dapr pub/sub topic scoping (publishingScopes, subscriptionScopes, allowedTopics, protectedTopics)
- Redis Streams pub/sub component (`pubsub.redis`)
- Kubernetes (namespace-level isolation example)

## Sources Consulted
- Dapr Pub/Sub Scoping documentation: https://docs.dapr.io/developing-applications/building-blocks/pubsub/pubsub-scopes/
- Dapr Redis Pub/Sub component reference: https://docs.dapr.io/reference/components-reference/supported-pubsub/setup-redis-pubsub/
- Dapr Pub/Sub API reference: https://docs.dapr.io/reference/api/pubsub_api/

## Issues Found

### 1. Text said "two metadata fields" but listed three
- **What was wrong:** Line 17 stated "Scoping is configured at the component level using two metadata fields" but then listed three fields (`publishingScopes`, `subscriptionScopes`, `allowedTopics`).
- **What was changed:** Changed "two metadata fields" to "these metadata fields".

### 2. Missing `protectedTopics` field and incorrect default-deny implication (CRITICAL)
- **What was wrong:** The blog omitted the `protectedTopics` metadata field and, more critically, implied that apps not listed in `publishingScopes` are denied access (e.g., "Only `checkout-service` can publish to the `orders` topic"). In reality, Dapr's scoping is **default-allow**: apps NOT listed in `publishingScopes`/`subscriptionScopes` have unrestricted access to all topics. Only apps that ARE listed are restricted to their specified topics. This is a significant factual error in a security-focused article.
- **What was changed:** Added `protectedTopics` to the list of metadata fields. Added a note explaining the default-allow behavior. Corrected the "In this example" bullet points to accurately describe what scoping does (restricts listed apps, not unlisted ones). Added notes about unlisted apps retaining full access by default.

### 3. Incorrect test example for unauthorized publishing
- **What was wrong:** The test example used `inventory-service` as an unauthorized publisher, claiming it would get a 403 because it's "not in publishingScopes for orders." However, since `inventory-service` is not listed in `publishingScopes` at all, it actually has **unrestricted** publish access and would succeed with 204.
- **What was changed:** Changed the example to use `payment-service` (which IS listed in `publishingScopes` but only for the `payments` topic), making the 403 response for publishing to `orders` correct.

## Review Notes
- The `pubsub.redis` component type, `redisHost` metadata field, API endpoint format (`/v1.0/publish/<pubsubname>/<topic>`), and HTTP response codes (204 for success, 403 for forbidden) are all correct per official Dapr documentation.
- The namespace-level isolation section with `kubectl apply` commands is correct and a reasonable recommendation.
- Users following this guide for security purposes should be strongly advised to use `protectedTopics` for any topics that require default-deny semantics, as the basic scoping fields alone only restrict apps that are explicitly listed.
