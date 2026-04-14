# Validation Summary: How to Learn Dapr Terminology and Key Concepts

## Status
validated

## Post Type
Reference / Glossary

## Technologies Covered
- Dapr (Distributed Application Runtime)
- daprd (Dapr sidecar runtime)
- Dapr Building Blocks (Service Invocation, State Management, Pub/Sub, Bindings, Secrets, Configuration, Actors, Workflow, Distributed Lock, Cryptography, Jobs, Conversation)
- Dapr Components (state.redis, pub/sub brokers, bindings)
- Dapr Control Plane (Operator, Sentry, Placement, Scheduler, Sidecar Injector)
- Dapr Actors (virtual actor model)
- Dapr Workflows (durable execution)
- SPIFFE / mTLS security
- Kubernetes (CRDs, namespaces, annotations)

## Sources Consulted
- Dapr Building Blocks overview: https://docs.dapr.io/developing-applications/building-blocks/
- Dapr Placement service overview: https://docs.dapr.io/concepts/dapr-services/placement/
- Dapr Actors overview: https://docs.dapr.io/developing-applications/building-blocks/actors/actors-overview/
- Dapr Security concepts: https://docs.dapr.io/concepts/security-concept/
- Dapr mTLS configuration: https://docs.dapr.io/operations/security/mtls/
- Dapr Sentry service overview: https://docs.dapr.io/concepts/dapr-services/sentry/
- Dapr Subscription spec: https://docs.dapr.io/reference/resource-specs/subscription-schema/
- Dapr Preview features: https://docs.dapr.io/operations/support/support-preview-features/
- Dapr Component updates (hot-reload): https://docs.dapr.io/operations/components/component-updates/

## Issues Found
1. **Building blocks count was incorrect**: The post listed 11 building blocks but Dapr currently has 12. The "Conversation" building block (for LLM prompting) was missing. Updated the count from 11 to 12 and added "Conversation" to the list.

2. **Placement Table description had two inaccuracies**: The post described it as a "distributed hash ring" but Dapr docs use the term "distributed hash table." Additionally, the post said it "maps actor IDs to their hosting sidecar" but the Placement Table maps actor types (not individual actor IDs) to hosting sidecars. Fixed both terms.

## Review Notes
- The Subscription apiVersion `dapr.io/v2alpha1` is correct and current — it has not yet graduated to a stable version.
- The `HotReload` feature flag claim is accurate — it remains in preview as of Dapr v1.17.
- The SPIFFE identity format `spiffe://<trust-domain>/ns/<namespace>/<app-id>` is correct per official docs.
- The default trust domain of `cluster.local` is confirmed correct.
- Some building block names use slightly different casing/wording than official docs (e.g., "Virtual Actors" vs "Actors", "Secrets Management" vs "Secrets"), but these are acceptable informal variations that don't constitute errors.
- The Jobs and Conversation building blocks are both in alpha status — the post may want to note this in a future update.
