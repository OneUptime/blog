# Validation Summary: How to Configure Redis with Istio Service Mesh

## Status
validated

## Post Type
Tutorial / Configuration Guide

## Technologies Covered
- Redis 7.2
- Istio Service Mesh (Envoy proxy, mTLS, AuthorizationPolicy, DestinationRule, PeerAuthentication)
- Kubernetes (Deployments, Services, Namespaces, Secrets)
- Kiali (Istio dashboard)
- Prometheus (TCP metrics)

## Sources Consulted
- Istio Resource Annotations reference: https://istio.io/latest/docs/reference/config/annotations/
- Istio PeerAuthentication API: https://istio.io/latest/docs/reference/config/security/peer_authentication/
- Istio DestinationRule API: https://istio.io/latest/docs/reference/config/networking/destination-rule/
- Istio AuthorizationPolicy API: https://istio.io/latest/docs/reference/config/security/authorization-policy/
- Istio ServiceEntry API: https://istio.io/latest/docs/reference/config/networking/service-entry/
- Istio Protocol Selection documentation: https://istio.io/latest/docs/ops/configuration/traffic-management/protocol-selection/
- Kubernetes API reference for Deployments and Services

## Issues Found

### Issue 1 (Critical): Port exclusion annotations bypass all Istio features for Redis
**What was wrong:** The Redis Deployment included `traffic.sidecar.istio.io/excludeInboundPorts: "6379"` and `traffic.sidecar.istio.io/excludeOutboundPorts: "6379"` annotations. These tell Istio's Envoy proxy to completely skip interception of traffic on port 6379, which means mTLS, AuthorizationPolicy, DestinationRule connection pooling, and TCP metrics would NOT apply to Redis traffic. This contradicts the entire purpose of the article.

**What was changed:** Removed both `excludeInboundPorts` and `excludeOutboundPorts` annotations. The Kubernetes Service already names the port `tcp-redis`, which follows Istio's naming convention to identify the protocol as TCP. No port exclusion is needed for Istio to handle Redis TCP traffic correctly.

**Why:** Without this fix, every subsequent section of the article (DestinationRule, PeerAuthentication, AuthorizationPolicy, metrics) would have no effect on Redis traffic, making the tutorial fundamentally broken.

### Issue 2 (Moderate): PeerAuthentication incorrectly disables mTLS on Redis port
**What was wrong:** The PeerAuthentication resource included `portLevelMtls: { 6379: { mode: DISABLE } }` with a comment "handled by app-level TLS." However, the Redis deployment in this tutorial does not configure TLS at all (no TLS certificates, no `--tls-port` flag). Disabling mTLS on port 6379 would leave Redis traffic completely unencrypted.

**What was changed:** Removed the `portLevelMtls` section so that STRICT mTLS applies to all ports including 6379. Istio's mTLS is transparent to Redis — encryption/decryption happens at the Envoy sidecar layer, so Redis continues to see plain TCP.

**Why:** The article's stated goal is to use Istio for mTLS on Redis. Disabling mTLS on the Redis port defeats that purpose, and the stated reason (app-level TLS) was incorrect.

### Issue 3 (Minor): Summary text referenced removed configuration
**What was wrong:** The summary mentioned "portLevelMtls to disable redundant encryption on the Redis port," which no longer applies after the PeerAuthentication fix.

**What was changed:** Updated the summary to accurately describe the corrected configuration approach: using `tcp-` port naming, DestinationRules for connection management, PeerAuthentication for mTLS, and AuthorizationPolicy for access control.

## Review Notes
- The ServiceEntry for `redis.data-stores.svc.cluster.local` is unnecessary since the Kubernetes Service is already in the mesh and auto-discovered by Istio. The `tcp-redis` port name on the Kubernetes Service is sufficient for protocol detection. The ServiceEntry won't cause harm but adds complexity without benefit. A future revision could remove it and simplify the tutorial.
- The API version `networking.istio.io/v1alpha3` used for ServiceEntry and DestinationRule is deprecated in favor of `networking.istio.io/v1beta1` (or `v1` in Istio 1.22+). The v1alpha3 version still works but should be updated in a future revision.
- The `sidecar.istio.io/inject: "true"` annotation is redundant when the namespace already has the `istio-injection: enabled` label. It's harmless and can serve as explicit documentation, but could be noted as optional.
- The `consecutive5xxErrors` field in OutlierDetection is valid for TCP — Istio maps TCP connection failures to 5xx errors for outlier detection purposes.
