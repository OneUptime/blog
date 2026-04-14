# Validation Summary: How to Use Dapr with Modular Monolith Architecture

## Status
validated

## Post Type
Tutorial / Architectural Guide

## Technologies Covered
- Dapr (Distributed Application Runtime)
- Dapr .NET SDK (DaprClient, Dapr.AspNetCore)
- Dapr pub/sub building block
- Dapr state store component (Redis)
- ASP.NET Core (Minimal hosting model)
- Kubernetes (kubectl for Dapr subscription management)
- C#

## Sources Consulted
- Dapr .NET SDK source code (DaprClient.PublishEventAsync overloads) — https://github.com/dapr/dotnet-sdk
- Dapr pub/sub documentation — https://docs.dapr.io/developing-applications/building-blocks/pubsub/
- Dapr ASP.NET Core integration (Topic attribute, AddDapr, UseCloudEvents, MapSubscribeHandler) — https://docs.dapr.io/developing-applications/sdks/dotnet/dotnet-aspnetcore/
- Dapr Redis state store component reference — https://docs.dapr.io/reference/components-reference/supported-state-stores/setup-redis/
- Dapr state store keyPrefix configuration — https://docs.dapr.io/developing-applications/building-blocks/state-management/howto-share-state/
- Dapr Subscription CRD (v1alpha1 vs v2alpha1) — https://docs.dapr.io/reference/api/pubsub_api/

## Issues Found

### Issue 1: Invalid `keyPrefix` value in Redis state store component YAML (High severity)
- **What was wrong:** The `keyPrefix` metadata field was set to `orders`, which is an arbitrary string. The `keyPrefix` field only accepts predefined strategy values: `appid` (default), `name`, `namespace`, or `none`.
- **What was changed:** Changed `value: orders` to `value: name`, which uses the component name (`orders-statestore`) as the key prefix — achieving the intended scoping behavior.
- **Why:** Using an invalid value would cause unexpected behavior or a runtime error. The `name` strategy prefixes keys with the component name, which aligns with the post's intent of module-scoped state stores.

### Issue 2: Deprecated v1alpha1 subscription `route` field in kubectl patch command (Medium severity)
- **What was wrong:** The `kubectl patch` command used `{"spec":{"route":"/inventory/on-order-created"}}`, which is the v1alpha1 subscription schema. The current Dapr subscription CRD (v2alpha1) uses `spec.routes.default` instead of `spec.route`.
- **What was changed:** Updated to `{"spec":{"routes":{"default":"/inventory/on-order-created"}}}` to match the v2alpha1 schema.
- **Why:** The v1alpha1 subscription schema is deprecated. New Dapr installations default to v2alpha1, and using the old field structure would not work with current Dapr versions.

## Review Notes
- The `builder.Services.AddDaprClient()` call in Program.cs is technically redundant because `AddControllers().AddDapr()` already registers the DaprClient internally. This is not an error (AddDaprClient uses TryAddSingleton, so it won't double-register), but readers may wonder if both calls are required. Left as-is since removing it could confuse the tutorial flow.
- The post uses `"pubsub"` as the pub/sub component name, which is valid but not a built-in default — it must match the `metadata.name` in the corresponding pub/sub component YAML. The post doesn't show the pub/sub component YAML definition, which could confuse readers who are new to Dapr.
- The overall architectural pattern described (using Dapr pub/sub for inter-module communication in a modular monolith) is sound and well-explained. The extraction path to microservices is a genuine advantage of this approach.
