# Validation Summary: How to Use Dapr with IPv6 Networks

## Status
validated

## Post Type
Tutorial / Configuration Guide

## Technologies Covered
- Dapr (sidecar architecture, components, service invocation)
- Kubernetes (dual-stack networking, CoreDNS, Deployments, annotations)
- IPv6 (addressing, bracket notation, loopback, dual-stack)
- Redis (state store component with IPv6)
- Apache Kafka (pub/sub component with IPv6)
- Node.js (HTTP client IPv6 support)
- gRPC / grpcurl

## Sources Consulted
- Dapr arguments and annotations reference: https://docs.dapr.io/reference/arguments-annotations-overview/
- Dapr environment variable reference: https://docs.dapr.io/reference/environment/
- Dapr Health API reference: https://docs.dapr.io/reference/api/health_api/
- Dapr sidecar health checks: https://docs.dapr.io/operations/resiliency/health-checks/sidecar-health/
- Dapr Apache Kafka pub/sub component: https://docs.dapr.io/reference/components-reference/supported-pubsub/setup-apache-kafka/
- Dapr Redis state store component: https://docs.dapr.io/reference/components-reference/supported-state-stores/setup-redis/
- Kubernetes dual-stack networking documentation: https://kubernetes.io/docs/concepts/services-networking/dual-stack/

## Issues Found

### Issue 1: Incorrect default sidecar listen address
- **What was wrong:** The post stated "By default, the Dapr sidecar binds to `0.0.0.0` (IPv4)." In Kubernetes, the default listen address is `[::1],127.0.0.1` (both IPv6 and IPv4 loopback), not `0.0.0.0`. The `0.0.0.0` default only applies to standalone mode.
- **What was changed:** Corrected the text to state that in Kubernetes, the sidecar listens on `[::1],127.0.0.1` by default, and mentioned the `dapr.io/sidecar-listen-addresses` annotation for customization.
- **Why:** Readers deploying on Kubernetes (the post's target audience) would get incorrect information about the sidecar's default behavior and might make unnecessary configuration changes.

### Issue 2: `DAPR_HOST` is not a standard Dapr environment variable
- **What was wrong:** The post used `DAPR_HOST` as an environment variable to configure sidecar communication. This is not listed in the official Dapr environment variable reference. The standard SDK-level variable is `DAPR_HTTP_ENDPOINT`.
- **What was changed:** Replaced `DAPR_HOST` with `DAPR_HTTP_ENDPOINT` set to `http://[::1]:3500`, which is the correct way to tell Dapr SDKs to connect to the sidecar via IPv6 loopback. Also added the `dapr.io/sidecar-listen-addresses` annotation to the Deployment YAML.
- **Why:** Using a non-standard environment variable could confuse readers and would not work with official Dapr SDKs.

### Issue 3: Node.js HTTP agent created but never used
- **What was wrong:** The code created `new http.Agent({ family: 6 })` but never passed it to any HTTP request. Additionally, the URL used `[::1]` directly, making the `family: 6` option redundant (it only affects DNS hostname resolution).
- **What was changed:** Updated the example to use `localhost` as the hostname (where `family: 6` meaningfully forces IPv6 resolution) and added an `http.get()` call that actually uses the agent.
- **Why:** The original example was incomplete and misleading — readers would create an agent that has no effect without being passed to a request.

## Review Notes
- The `ss -6tlnp` command in the "Testing IPv6 Connectivity" section targets the `daprd` container, which uses a distroless base image in standard Dapr deployments. The `ss` tool is unlikely to be available in this container. Readers may need to use `kubectl debug` with an ephemeral container instead. This is an operational caveat rather than a code error, so the command was left as-is.
- The CoreDNS Corefile shown is a standard configuration that already ships with most Kubernetes distributions. The section is accurate but readers should know they likely don't need to modify CoreDNS unless their cluster has a non-standard configuration.
- The `grpcurl` command in the testing section is also unlikely to be available in the app container by default, but the command syntax itself is correct.
- The Deployment YAML is shown as a partial snippet (missing `spec.selector` and `spec.replicas`), which is acceptable for a tutorial-style blog post.
