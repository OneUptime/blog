# Validation Summary: How to Implement API Caching with Dapr and API Gateway

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Kong API Gateway (proxy-cache and proxy-cache-advanced plugins)
- Kong Kubernetes Ingress Controller (KongPlugin CRD)
- Dapr JavaScript SDK (`@dapr/dapr`)
- Dapr State Management API (with Redis state store)
- Dapr Pub/Sub API
- Kubernetes Ingress
- Redis
- Express.js

## Sources Consulted
- Kong Proxy Cache Plugin Reference: https://developer.konghq.com/plugins/proxy-cache/reference/
- Kong Proxy Cache Advanced Plugin Reference: https://developer.konghq.com/plugins/proxy-cache-advanced/reference/
- Kong Ingress Controller Proxy Caching Guide: https://developer.konghq.com/kubernetes-ingress-controller/get-started/proxy-caching/
- Dapr JavaScript Client SDK docs: https://docs.dapr.io/developing-applications/sdks/js/js-client/
- Dapr State Management Quickstart: https://docs.dapr.io/getting-started/quickstarts/statemanagement-quickstart/
- Dapr State Store TTL docs: https://docs.dapr.io/developing-applications/building-blocks/state-management/state-store-ttl/
- Dapr State API Reference: https://docs.dapr.io/reference/api/state_api/
- Dapr JS SDK source (GitHub): https://github.com/dapr/js-sdk

## Issues Found
1. **Redis strategy requires `proxy-cache-advanced` plugin (not `proxy-cache`)**: The Redis-backed caching section originally showed only a `config:` block with `strategy: redis`, implying it was a drop-in change from the earlier `proxy-cache` plugin config. However, the open-source `proxy-cache` plugin only supports the `memory` strategy. The `redis` strategy requires the `proxy-cache-advanced` plugin, which is part of Kong Enterprise. Fixed by: adding a clarifying note, expanding the YAML to a full KongPlugin resource, and changing the plugin name to `proxy-cache-advanced`.

## Review Notes
- The Dapr state code uses `JSON.stringify()`/`JSON.parse()` when saving and retrieving from the state store. This is technically functional but not idiomatic — the Dapr JS SDK handles serialization automatically, so you can save/retrieve objects directly. Not a bug, but a future improvement opportunity.
- The pub/sub subscriber section shows the handler endpoint but does not show how the subscription is registered (via a Dapr subscription YAML or programmatic registration). This is fine for a focused example but readers may need to consult Dapr docs to wire up the full subscription.
- The `X-Cache-Status` header can also return `Refresh` and `Bypass` values beyond the `Miss` and `Hit` shown — acceptable simplification for the post's scope.
- The per-item `metadata: { ttlInSeconds: '300' }` format in `state.save()` is valid but the official Dapr JS SDK examples more commonly show TTL set at the request level (third argument to `save()`). Both approaches work.
