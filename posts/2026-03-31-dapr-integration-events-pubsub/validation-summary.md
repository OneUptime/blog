# Validation Summary: How to Use Integration Events with Dapr Pub/Sub

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Dapr Pub/Sub building block
- Dapr .NET SDK (`Dapr.Client`)
- C# 9+ records with init-only properties
- Python Flask (subscriber endpoint)
- Dapr declarative Subscription CRD (v1alpha1)
- Domain-Driven Design (Integration Events, Anti-Corruption Layer)

## Sources Consulted
- Dapr .NET SDK source code and API reference (https://github.com/dapr/dotnet-sdk)
- Dapr Pub/Sub documentation (https://docs.dapr.io/developing-applications/building-blocks/pubsub/)
- Dapr Subscription schema reference (https://docs.dapr.io/reference/resource-specs/subscription-schema/)
- Dapr .NET SDK DaprClient usage and serialization docs (https://docs.dapr.io/developing-applications/sdks/dotnet/dotnet-client/dotnet-daprclient-usage/)
- CloudEvents specification (https://cloudevents.io/)

## Issues Found

### 1. `scopes` incorrectly nested inside `spec` in Subscription YAML
**What was wrong:** The `scopes` field was indented under `spec`, making it a child of `spec`. In the Dapr Subscription CRD schema, `scopes` is a top-level field (sibling of `spec` and `metadata`), not nested inside `spec`.
**What was changed:** Moved `scopes` and its list items out of `spec` to the top level of the YAML document.
**Why:** With `scopes` nested inside `spec`, the subscription would not correctly limit which app IDs can use the subscription. The Dapr runtime reads `scopes` from the top level of the resource.

### 2. Unused `import json` in Python code
**What was wrong:** The Python subscriber code imported `json` but never used it (Flask's `request.json` and `jsonify` handle JSON parsing/serialization).
**What was changed:** Removed the unused `import json` line.
**Why:** Unused imports are unnecessary and could confuse readers into thinking `json` is needed for the implementation.

## Review Notes
- The Subscription CRD uses `apiVersion: dapr.io/v1alpha1`, which is deprecated in favor of `dapr.io/v2alpha1` (introduced in Dapr 1.11+). The v1alpha1 API still functions but new projects should use v2alpha1, which changes `route` to `routes` (an object with `rules` and `default` fields). This was not changed since v1alpha1 is still supported and the post's concepts remain valid.
- The Dapr .NET SDK uses `JsonSerializerDefaults.Web` by default, which serializes properties as camelCase. The Python consumer code correctly uses camelCase field names (`orderId`, `customerEmail`, etc.) to match this behavior. This cross-language serialization detail is handled correctly.
- The CloudEvents envelope handling in the Python subscriber (`envelope.get("data", {})`) is correct for how Dapr delivers pub/sub messages.
- The C# `PublishEventAsync` call uses correct parameter names (`pubsubName`, `topicName`, `data`) matching the Dapr .NET SDK method signature.
- The schema registry YAML is a custom documentation convention (not a Dapr-specific resource), which is a reasonable approach for managing integration event contracts.
