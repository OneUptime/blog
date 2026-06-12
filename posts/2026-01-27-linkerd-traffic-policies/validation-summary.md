# Validation Summary: How to Configure Linkerd Traffic Policies

## Status
validated

## Post Type
Technical guide / tutorial

## Technologies Covered
- Linkerd authorization policy
- Linkerd Server, HTTPRoute, AuthorizationPolicy, MeshTLSAuthentication, and HTTPLocalRateLimitPolicy CRDs
- Linkerd SMI TrafficSplit
- Linkerd CLI diagnostics and Viz extension
- Kubernetes Services, Deployments, Ingress, probes, and annotations
- Flagger canary deployments
- NGINX Ingress rate limiting

## Sources Consulted
- Linkerd Authorization Policy reference: https://linkerd.io/2-edge/reference/authorization-policy/
- Linkerd HTTPRoute reference: https://linkerd.io/2-edge/reference/httproute/
- Linkerd per-route authorization guide: https://linkerd.io/2-edge/tasks/configuring-per-route-policy/
- Linkerd Gateway API support reference: https://linkerd.io/docs/features/gateway-api/
- Linkerd Traffic Shifting guide: https://linkerd.io/2-edge/tasks/traffic-shifting/
- Linkerd SMI extension guide: https://linkerd.io/2-edge/tasks/linkerd-smi/
- Linkerd Rate Limiting reference: https://linkerd.io/2-edge/reference/rate-limiting/
- Linkerd Configuring Rate Limiting guide: https://linkerd.io/2-edge/tasks/configuring-rate-limiting/
- Linkerd Circuit Breaking reference: https://linkerd.io/2-edge/reference/circuit-breaking/
- Linkerd Circuit Breakers guide: https://linkerd.io/2-edge/tasks/circuit-breakers/
- Linkerd diagnostics CLI reference: https://linkerd.io/2-edge/reference/cli/diagnostics/
- Flagger Linkerd progressive delivery guide: https://docs.flagger.app/tutorials/linkerd-progressive-delivery

## Issues Found
- Server examples used `policy.linkerd.io/v1beta2` and `proxyProtocol: HTTP/2` for generic HTTP API services. Updated Server examples to `policy.linkerd.io/v1beta3` and `proxyProtocol: HTTP/1`, matching current Linkerd examples for ordinary HTTP/1 services.
- ServerAuthorization was described as already deprecated. Linkerd documentation says AuthorizationPolicy is preferred and ServerAuthorization will be deprecated in future releases, so the wording was corrected.
- TrafficSplit was presented as the current Linkerd traffic-shifting mechanism without caveat. Added that Linkerd SMI TrafficSplit is deprecated and that new traffic-shifting work should use Gateway API HTTPRoute or GRPCRoute.
- The basic HTTPRoute comments implied routes themselves allow or restrict traffic. Updated the comments because authorization requires AuthorizationPolicy resources targeting the Server or HTTPRoute.
- The method-based routing example targeted one HTTPRoute containing read and write rules, which would not create separate read/write authorization. Changed it to a write-only HTTPRoute with a matching AuthorizationPolicy and MeshTLSAuthentication.
- The rate limiting section incorrectly said Linkerd has no built-in rate limiting and used ServiceProfile response classes as the rate-limiting example. Replaced it with Linkerd's current HTTPLocalRateLimitPolicy resource.
- The circuit breaking section incorrectly described retry budgets in ServiceProfiles as circuit breaking. Replaced it with Linkerd's current Service annotation-based consecutive failure accrual configuration.
- The diagnostics commands used `linkerd diagnostics policy` against a deployment and `linkerd edges`. Updated them to `linkerd viz authz`, `linkerd diagnostics policy` against a service and port, and `linkerd viz edges`.

## Review Notes
The post still uses Linkerd-specific `policy.linkerd.io` HTTPRoute examples, which Linkerd continues to support, but current Linkerd documentation encourages standard Gateway API resources for newer routing work. The YAML snippets were parsed successfully after correction.
