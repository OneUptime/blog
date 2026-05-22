# Validation Summary: How to Configure Ingress Network Policies with Istio

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Istio Gateway
- Istio VirtualService
- Istio AuthorizationPolicy
- Istio RequestAuthentication
- Istio EnvoyFilter
- Kubernetes Services and TLS secrets
- Envoy local rate limiting
- Prometheus metrics

## Sources Consulted
- Istio Gateway reference: https://istio.io/latest/docs/reference/config/networking/gateway/
- Istio VirtualService reference: https://istio.io/docs/reference/config/networking/virtual-service/
- Istio ingress access control task: https://istio.io/latest/docs/tasks/security/authorization/authz-ingress/
- Istio AuthorizationPolicy reference: https://istio.io/latest/docs/reference/config/security/authorization-policy/
- Istio RequestAuthentication reference: https://istio.io/latest/docs/reference/config/security/request_authentication/
- Istio rate limiting with Envoy task: https://istio.io/latest/docs/tasks/policy-enforcement/rate-limit/
- Istio standard metrics reference: https://istio.io/latest/docs/reference/config/metrics/
- Istio istioctl command reference: https://istio.io/latest/docs/reference/commands/istioctl/
- Kubernetes kubectl create secret tls reference: https://kubernetes.io/docs/reference/generated/kubectl/kubectl-commands
- Kubernetes source IP documentation: https://kubernetes.io/docs/tutorials/services/source-ip/
- Envoy HTTP local rate limit filter reference: https://www.envoyproxy.io/docs/envoy/latest/configuration/http/http_filters/local_rate_limit_filter
- Envoy HTTP local rate limit API reference: https://www.envoyproxy.io/docs/envoy/latest/api-v3/extensions/filters/http/local_ratelimit/v3/local_rate_limit.proto

## Issues Found
- The source IP guidance said to use `externalTrafficPolicy: Local` or proxy protocol with the same `ipBlocks` policy. Istio distinguishes packet source IP matching (`ipBlocks`) from original client IP derived from `X-Forwarded-For` or proxy protocol (`remoteIpBlocks`), so the text now explains when to use each option.
- The Envoy local rate limit example omitted `filter_enabled` and `filter_enforced`. Envoy's HTTP local rate limit filter defaults both fractions to 0% for safety, so the example now explicitly enables and enforces the filter for 100% of requests.
- The Prometheus query used `reporter="destination"` for ingress gateway metrics. Istio documents gateway-emitted metrics as `reporter="source"`, so the query now filters on `reporter="source"` and `source_workload="istio-ingressgateway"`.

## Review Notes
The examples use current Istio `networking.istio.io/v1` and `security.istio.io/v1` APIs where available. `EnvoyFilter` remains `networking.istio.io/v1alpha3` and is valid, but Istio cautions that EnvoyFilter exposes implementation details that require careful review during proxy upgrades. Local `kubectl` and `istioctl` binaries were not installed in the review environment, so command validation was performed against official command references instead.
