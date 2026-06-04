# Validation Summary: How to Use Ambassador Ingress Controller Host and Mapping CRDs for Multi-Tenancy

## Status
validated

## Post Type
Tutorial / guide

## Technologies Covered
- Kubernetes
- Ambassador Edge Stack / Emissary-ingress CRDs
- Host, Mapping, Filter, FilterPolicy, RateLimitService, RateLimit, and Module resources
- cert-manager Certificate resources
- Flask
- kubectl, curl, and ApacheBench

## Sources Consulted
- Ambassador Edge Stack 3.12.10 official CRD manifest: https://app.getambassador.io/yaml/edge-stack/3.12.10/aes-crds.yaml
- Ambassador Edge Stack quick start and CRD references: https://www.getambassador.io/docs/edge-stack/latest/
- Emissary-ingress add request headers documentation: https://emissary-ingress.dev/docs/4.0/topics/using/headers/add-request-headers/
- Emissary-ingress basic rate limiting documentation: https://emissary-ingress.dev/docs/4.0/topics/using/base-rate-limiting/
- Emissary-ingress load balancing documentation: https://emissary-ingress.dev/docs/4.0/topics/running/load-balancer/
- Emissary-ingress Ambassador Module / Lua documentation: https://emissary-ingress.dev/docs/3.6/topics/running/ambassador/
- Kubernetes kubectl generated reference: https://kubernetes.io/docs/reference/generated/kubectl/kubectl-commands
- cert-manager Certificate documentation: https://cert-manager.io/docs/usage/certificate/
- ApacheBench official documentation: https://httpd.apache.org/docs/current/en/programs/ab.html

## Issues Found
- The wildcard tenant example used `%REQ(:authority)%` in `add_request_headers`, but current Emissary documentation only documents a limited set of dynamic values for that field. I removed the unsupported header injection and changed the Flask example to use `request.host`, which is available from the incoming Host/authority value.
- The wildcard section said it could support unlimited tenants. I changed this to "many tenants" because wildcard routing still depends on DNS, certificate, backend, and operational limits.
- The rate-limit example put `requests_per_unit` and `unit` directly under `Mapping.spec.labels`, but Mapping labels attach descriptors; they do not define limits. I added a `RateLimit` resource with `rate` and `unit`, added `protocol_version: v3` and `domain` to the `RateLimitService`, and changed Mapping labels to valid generic-key descriptors.
- The circuit breaker examples used `circuit_breakers` as a single object, but the CRD defines it as an array of breaker objects. I changed both examples to list syntax.
- The tenant provisioning script defined an unused `NAMESPACE` variable. I removed it to avoid suggesting it affected the script.
- The monitoring example claimed to collect metrics but only logged via Lua, and the Lua hook checked response headers even though tenant headers are added to upstream requests. I changed the section to tenant request logs and updated the Lua hook to `envoy_on_request`.
- The testing example tried to verify `x-tenant-id` with `curl` against the client response. Since `add_request_headers` sends the header upstream, I changed the check to backend logs.

## Review Notes
The post now validates against the current Ambassador Edge Stack v3alpha1 CRD shapes. Some examples remain illustrative and assume supporting services, TLS secrets, cert-manager issuers, and tenant backends already exist.
