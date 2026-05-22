# Validation Summary: How to Benchmark Istio Authorization Policy Impact

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Istio AuthorizationPolicy
- Envoy RBAC authorization
- Kubernetes
- Fortio load testing
- HTTP benchmarking

## Sources Consulted
- Istio AuthorizationPolicy reference: https://istio.io/latest/docs/reference/config/security/authorization-policy/
- Istio HTTP authorization task: https://istio.io/latest/docs/tasks/security/authorization/authz-http/
- Istio external authorization task: https://istio.io/latest/docs/tasks/security/authorization/authz-custom/
- Istio RequestAuthentication reference: https://istio.io/latest/docs/reference/config/security/request_authentication/
- Istio Envoy statistics documentation: https://istio.io/latest/docs/ops/configuration/telemetry/envoy-stats/
- Istio sidecar injection documentation: https://istio.io/latest/docs/setup/additional-setup/sidecar-injection/
- Istio supported releases documentation: https://istio.io/latest/docs/releases/supported-releases/
- Kubernetes ServiceAccount documentation: https://kubernetes.io/docs/concepts/security/service-accounts/
- Kubernetes kubectl wait reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_wait/
- Fortio usage documentation: https://fortio.github.io/fortio-website/docs/getting-started/usage

## Issues Found
- The httpbin sample URL used Istio `release-1.22`, which is end-of-life as of January 22, 2025. Updated the sample URL to `release-1.30`, the current Istio release line on the validation date.
- The benchmark scenarios did not remove previously applied AuthorizationPolicy resources, so later tests would measure accumulated policies rather than the named scenario. Added `kubectl delete authorizationpolicy --all -n authz-bench --ignore-not-found` before each scenario.
- The simple ALLOW policy text said it allowed traffic from the Fortio service account, but the Deployment does not set `serviceAccountName`, so Kubernetes uses the namespace `default` service account. Updated the text to match the configured principal.
- The DENY-all example matched source namespaces with `namespaces: ["*"]`, which depends on a derived source namespace. Replaced it with an empty DENY rule (`- {}`) so it directly matches all requests to the selected workload.
- The key takeaway stated a blanket under-1ms overhead claim and described Envoy as compiling rules into an unspecified internal representation. Reworded it to a less absolute benchmark expectation and to refer specifically to locally evaluated Envoy RBAC configuration.
- The JWT overhead note attributed overhead mainly to JWKS fetching. Reworded it to include per-request token parsing and signature verification, with JWKS fetch or refresh as an additional factor.

## Review Notes
- The Fortio commands and flags (`load`, `-c`, `-qps`, `-t`, `-json`, `-allow-initial-errors`, and `report -data-dir`) match current Fortio documentation.
- The Istio `AuthorizationPolicy` API version and fields used in the examples (`security.istio.io/v1`, `selector`, `action`, `rules`, `from`, `to`, `operation`, `principals`, `namespaces`, `methods`, `paths`, `when`, and `notValues`) match current Istio documentation.
- The principal and namespace matches require peer identity information from mTLS, as documented by Istio. In the tutorial's sidecar-injected same-namespace setup this is a reasonable assumption, but production benchmarks should explicitly confirm mTLS mode.
- The post uses `fortio/fortio:latest`, which is valid but less reproducible than pinning a Fortio image tag.
