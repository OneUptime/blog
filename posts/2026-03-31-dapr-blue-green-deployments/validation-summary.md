# Validation Summary: How to Implement Dapr Blue-Green Deployments

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Dapr (service invocation, pub/sub, sidecar annotations)
- Kubernetes (Deployments, Services, selectors, endpoints)
- kubectl CLI (patch, port-forward, scale, get endpoints)

## Sources Consulted
- [Dapr Kubernetes DNS name resolution spec](https://docs.dapr.io/reference/components-reference/supported-name-resolution/nr-kubernetes/) — confirms Dapr resolves app IDs via `{app-id}-dapr.{namespace}.svc.cluster.local`, not user-defined Kubernetes Services
- [Dapr service invocation overview](https://docs.dapr.io/developing-applications/building-blocks/service-invocation/service-invocation-overview/) — confirms sidecar-to-sidecar routing uses Dapr's own name resolution
- [Dapr GitHub Issue #6855 — Guidance for Blue Green deployments](https://github.com/dapr/dapr/issues/6855) — community discussion confirming blue-green with same app-id is not straightforward
- [Dapr name resolution provider specs](https://docs.dapr.io/reference/components-reference/supported-name-resolution/) — lists supported name resolution components and default behavior on Kubernetes
- [How-To: Invoke services using HTTP (Dapr Docs)](https://docs.dapr.io/developing-applications/building-blocks/service-invocation/howto-invoke-discover-services/) — service invocation API reference

## Issues Found

### 1. Incorrect claim: Dapr routes through user-defined Kubernetes Service
- **What was wrong:** The opening paragraph stated "Dapr's service invocation and pub/sub work seamlessly with this pattern since routing is handled at the Kubernetes Service level." This is incorrect. Dapr service invocation on Kubernetes uses its own name resolution mechanism, resolving app IDs via a Dapr-operator-created Kubernetes Service named `{app-id}-dapr`, not the user-defined Kubernetes Service. Switching the user's Service selector has no effect on Dapr-to-Dapr traffic.
- **What was changed:** Corrected the opening paragraph to explain that the Kubernetes Service selector controls external traffic, while Dapr service invocation uses its own name resolution (`{app-id}-dapr.{namespace}.svc.cluster.local`). Noted that both versions receive Dapr traffic while both are running, and full cutover happens when the old deployment is scaled down.

### 2. Incorrect claim: Dapr routes to pods behind the Kubernetes Service
- **What was wrong:** The "Dapr App ID Considerations" section stated "Dapr routes to whichever pods are currently behind the Kubernetes Service." This is incorrect for the same reason — Dapr resolves app IDs through its own service, not the user-defined one.
- **What was changed:** Corrected to explain that Dapr service invocation distributes calls across all pods with the matching app ID via the `{app-id}-dapr` service created by the Dapr operator, and that complete Dapr traffic cutover requires scaling down the old deployment.

### 3. Misleading summary about routing
- **What was wrong:** The summary stated "routing is controlled at the Kubernetes Service level while Dapr uses the app ID abstraction" and implied the Service selector switch provides "instant rollback capability" for all traffic including Dapr.
- **What was changed:** Corrected to distinguish between external traffic (controlled by Kubernetes Service selector) and Dapr service invocation (uses app-ID-based name resolution). Updated to note that the cutover involves scaling down the old deployment rather than just switching a selector.

## Review Notes
- All Kubernetes YAML manifests (Deployment, Service) are syntactically correct and use valid `apps/v1` API versions.
- All `kubectl` commands (`patch`, `port-forward`, `scale`, `get endpoints`) use correct syntax and flags. The strategic merge patch for the Service selector correctly preserves the `app` key while updating the `version` key.
- The `curl` commands for smoke testing are correct.
- The pub/sub behavior described (both versions share subscriptions during the transition window) is accurate.
- The Dapr annotations (`dapr.io/enabled`, `dapr.io/app-id`, `dapr.io/app-port`) are correct and current.
- The overall deployment pattern (two deployments, validate new version, scale down old) is a valid approach for Dapr services, but the mechanism of traffic control differs from what was originally described.
- Dapr GitHub Issue #6855 ("Guidance for Blue Green deployments") was closed as not planned, indicating this is a known gap in Dapr's documentation and deployment guidance.
