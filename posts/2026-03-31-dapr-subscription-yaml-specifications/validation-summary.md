# Validation Summary: How to Write Dapr Subscription YAML Specifications

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- Dapr (Distributed Application Runtime)
- Dapr Pub/Sub building block
- Dapr declarative subscriptions (v2alpha1)
- Common Expression Language (CEL) for content-based routing
- Kubernetes CRDs
- JavaScript / Node.js (Express handler example)
- YAML

## Sources Consulted
- Dapr declarative subscriptions documentation: https://docs.dapr.io/developing-applications/building-blocks/pubsub/subscription-methods/
- Dapr subscription schema reference: https://docs.dapr.io/reference/resource-specs/subscription-schema/
- Dapr bulk subscribe documentation: https://docs.dapr.io/developing-applications/building-blocks/pubsub/pubsub-bulk/
- Dapr pub/sub how-to guide: https://docs.dapr.io/developing-applications/building-blocks/pubsub/howto-publish-subscribe/
- Dapr CLI reference for `dapr run` flags

## Issues Found
No technical issues found.

## Review Notes
- The `apiVersion: dapr.io/v2alpha1` and all field names (`pubsubname`, `topic`, `routes`, `deadLetterTopic`, `bulkSubscribe`) are correct for the current Dapr subscription spec.
- `scopes` is correctly placed at the top level (same level as `spec`), not nested inside `spec`.
- CEL expression syntax (`event.data.priority == "urgent"`) is valid. The official docs recommend using `has()` guards (e.g., `has(event.data.priority) && event.data.priority == "urgent"`) when the field may not exist in all messages, but the blog's syntax is correct and functional.
- `--resources-path` is the current CLI flag; the older `--components-path` is deprecated, so the blog correctly uses the modern flag.
- The bulk subscribe handler JavaScript code correctly shows the `entries` request format and `statuses` response format with valid status value `"SUCCESS"`.
- Default components path `~/.dapr/components/` is correct for self-hosted mode.
- `kubectl get subscriptions` follows standard Kubernetes CRD patterns and is a valid command for listing Dapr subscription resources.
