# Validation Summary: How to Implement Content-Based Routing with Dapr

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Dapr Pub/Sub with content-based routing
- CloudEvents 1.0 specification
- CEL (Common Expression Language) for routing expressions
- Node.js with Express
- Python with Flask
- Dapr Subscription YAML (Kubernetes)
- Dapr HTTP publish API

## Sources Consulted
- Dapr documentation on pub/sub routing: https://docs.dapr.io/developing-applications/building-blocks/pubsub/howto-route-messages/
- Dapr Subscription spec (v2alpha1 for routing rules): https://docs.dapr.io/reference/resource-specs/subscription-schema/
- Dapr publish API reference: https://docs.dapr.io/reference/api/pubsub_api/
- CloudEvents specification: https://github.com/cloudevents/spec/blob/v1.0/spec.md
- CEL specification: https://github.com/google/cel-spec

## Issues Found
1. **Subscription YAML apiVersion was incorrect (line 191)**: The declarative Subscription YAML used `apiVersion: dapr.io/v1alpha1`, but the `v1alpha1` schema only supports a single `route` field. The `routes` object with `rules` and `default` requires `apiVersion: dapr.io/v2alpha1`. Changed to `dapr.io/v2alpha1`.

## Review Notes
- The CEL expression syntax used throughout (`event.data.*`, `event.type`, `&&`, `startsWith`, `in` operator) is correct for Dapr's routing rule engine.
- The CloudEvent envelope structure shown is accurate per the CloudEvents 1.0 spec.
- The programmatic subscription API (`/dapr/subscribe`) examples in both Node.js and Python are correct.
- Publishing with `Content-Type: application/cloudevents+json` and a full CloudEvents envelope is the correct approach for sending pre-constructed CloudEvents to Dapr.
- The publish API endpoint `/v1.0/publish/{pubsubname}/{topic}` is correct.
- Routing rules are evaluated in order, with the first match winning and unmatched messages going to the default route -- this behavior is correctly implied in the post.
