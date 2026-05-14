# Validation Summary: How to Manage Linkerd Traffic Policies with Flux CD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Linkerd
- Linkerd SMI TrafficSplit
- Linkerd authorization policy resources
- Linkerd HTTPRoute, retry, timeout, and rate limiting policy
- Flux CD GitRepository, Kustomization, and Alert resources
- Kubernetes Services, Deployments, and Namespaces

## Sources Consulted
- Linkerd 2.19 Authorization Policy reference: https://linkerd.io/2.19/reference/authorization-policy/
- Linkerd 2.19 HTTPRoute reference: https://linkerd.io/2.19/reference/httproute/
- Linkerd 2.19 Retries reference: https://linkerd.io/2.19/reference/retries/
- Linkerd 2.19 Timeouts reference: https://linkerd.io/2.19/reference/timeouts/
- Linkerd 2.19 Rate Limiting reference: https://linkerd.io/2.19/reference/rate-limiting/
- Linkerd 2.19 Configuring Rate Limiting task: https://linkerd.io/2.19/tasks/configuring-rate-limiting/
- Linkerd 2.19 Viz CLI reference: https://linkerd.io/2.19/reference/cli/viz/
- Linkerd Traffic Split feature documentation: https://linkerd.io/2.19/features/traffic-split/
- Linkerd protocol detection and opaque ports documentation: https://linkerd.io/2.10/features/protocol-detection/
- Flux GitRepository documentation: https://fluxcd.io/flux/components/source/gitrepositories/
- Flux Kustomization v1 API reference: https://fluxcd.io/flux/components/kustomize/api/v1/
- Flux Alert documentation: https://fluxcd.io/flux/components/notification/alerts/
- Flux CLI kustomizations command reference: https://v2-6.docs.fluxcd.io/flux/cmd/flux_get_kustomizations/

## Issues Found
- The post described ServiceProfiles as the current mechanism for retries and timeouts. Linkerd 2.16+ recommends Gateway API routes and annotations for these policies, while ServiceProfiles are legacy and take precedence if present. Replaced the ServiceProfile example with a Gateway API HTTPRoute using Linkerd retry and timeout annotations.
- The original retry example included a POST route marked as not retryable, but a route-level retry annotation would apply to all matching routes in that HTTPRoute. Limited the retry/timeout example to idempotent GET routes.
- The authorization example used ServerAuthorization, which Linkerd documents as less flexible and planned for future deprecation. Replaced it with AuthorizationPolicy plus MeshTLSAuthentication.
- The rate limiting section used HTTPRoute and AuthorizationPolicy but did not configure rate limiting. Replaced it with a Server plus HTTPLocalRateLimitPolicy.
- The HTTPRoute examples used the Linkerd-specific policy.linkerd.io HTTPRoute API. Current Linkerd documentation encourages the canonical Gateway API HTTPRoute resource, so the examples now use gateway.networking.k8s.io/v1.
- The opaque ports example placed Linkerd annotations on a ConfigMap. Linkerd reads opaque port annotations from namespaces, services, and workloads, so the namespace-wide example now annotates the Namespace.
- The TrafficSplit prerequisite omitted the Linkerd SMI extension. Added it as a prerequisite for using SMI TrafficSplit.
- The progressive rollout section showed several same-name TrafficSplit resources together without warning. Added guidance that only one stage should be applied at a time.
- The Flux Kustomization example combined wait and healthChecks in a way where healthChecks would be ignored when wait is enabled. Removed the explicit health check block to avoid misleading behavior.
- Verification commands were updated to check HTTPRoutes and HTTPLocalRateLimitPolicies instead of legacy ServiceProfiles and ServerAuthorizations, and to use `linkerd viz stat` for HTTPRoute statistics.
- Best practices and conclusion text were updated to match the corrected APIs.

## Review Notes
The remaining examples are illustrative and still assume the relevant CRDs are installed, including Gateway API resources and the Linkerd SMI extension for TrafficSplit. For production use, route and rate-limit values should be tuned to actual service behavior and latency targets.
