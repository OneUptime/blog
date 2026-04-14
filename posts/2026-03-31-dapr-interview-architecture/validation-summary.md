# Validation Summary: How to Explain Dapr Architecture in an Interview

## Status
validated

## Post Type
Guide

## Technologies Covered
- Dapr (Distributed Application Runtime)
- Kubernetes (sidecar injection, CRDs, control plane)
- Redis (state store backend example)
- gRPC and HTTP APIs
- mTLS / SPIFFE certificates

## Sources Consulted
- Dapr CLI reference (dapr run defaults): https://docs.dapr.io/reference/cli/dapr-run/
- Dapr building blocks concept overview: https://docs.dapr.io/concepts/building-blocks-concept/
- Dapr control plane services: https://docs.dapr.io/concepts/dapr-services/
- Dapr annotations reference: https://docs.dapr.io/reference/arguments-annotations-overview/
- Dapr State API reference: https://docs.dapr.io/reference/api/state_api/
- Dapr state key prefix / shared state docs: https://docs.dapr.io/developing-applications/building-blocks/state-management/howto-share-state/
- Dapr self-hosted overview: https://docs.dapr.io/operations/hosting/self-hosted/self-hosted-overview/
- Dapr Sentry / SPIFFE source code: https://github.com/dapr/dapr/blob/master/pkg/security/spiffe/spiffe.go
- Dapr Sidecar Injector docs: https://docs.dapr.io/concepts/dapr-services/sidecar-injector/

## Issues Found

1. **Redis key format incorrect**: The post stated the Redis key format is `dapr||orderservice||key123`. The actual default key format (using the `appid` key prefix strategy) is `orderservice||key123` — there is no `dapr` prefix. Fixed by removing the `dapr||` prefix.

2. **Self-hosted mode described as Docker Compose**: The post claimed `dapr init` uses Docker Compose. It actually runs Docker containers directly (Redis, Zipkin, etc.) without Docker Compose. Fixed "Docker Compose" to "Docker containers".

3. **Building blocks list incomplete (listed 10, should be 12)**: The post was missing two alpha building blocks: Jobs (scheduled and periodic tasks) and Conversations (LLM interaction abstraction). Added both with alpha annotations. Also added alpha annotations to Distributed Lock and Cryptography which are also in alpha status.

4. **Control plane missing Scheduler service**: The Scheduler is a core control plane component (manages jobs, actor reminders, and workflow reminders) that was not listed. Added to both the architecture diagram and the control plane components section.

5. **Dashboard listed as core control plane component**: Dashboard is an optional observability tool, not a core control plane service per official Dapr documentation. Removed from the architecture diagram and control plane section.

6. **Sidecar injection attributed to Operator**: The YAML comment and bash comment incorrectly said the Dapr Operator injects the sidecar. It is actually the Dapr Sidecar Injector (a separate service) that handles injection via a mutating webhook. Fixed both comments.

7. **Summary said "10 building blocks"**: Updated to "12 building blocks" to match the corrected list.

## Review Notes
- The Jobs and Conversations building blocks are currently in alpha status. If the post is intended to be a stable/evergreen reference, the author may want to note that the alpha APIs could change. The alpha status is indicated in the corrected list.
- The architecture diagram section uses a ```json code fence but contains ASCII art, not JSON. This is a stylistic choice and doesn't affect rendering, but ```text would be more semantically accurate.
- The post's claims about SPIFFE-based certificates, mTLS, the state management API path, default sidecar port (3500), and Kubernetes annotations were all verified as correct.
