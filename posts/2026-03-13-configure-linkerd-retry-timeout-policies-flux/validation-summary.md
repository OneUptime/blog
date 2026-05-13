# Validation Summary: How to Configure Linkerd Retry and Timeout Policies with Flux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Linkerd
- Linkerd ServiceProfile
- Kubernetes Gateway API HTTPRoute
- Flux CD v2
- Kustomize
- Kubernetes
- Prometheus

## Sources Consulted
- Linkerd Service Profiles reference: https://linkerd.io/2.19/reference/service-profiles/
- Linkerd Retries and Timeouts feature documentation: https://linkerd.io/2.19/features/retries-and-timeouts/
- Linkerd HTTPRoute reference: https://linkerd.io/2.19/reference/httproute/
- Linkerd Retries reference: https://linkerd.io/2-edge/reference/retries/
- Linkerd Timeouts reference: https://linkerd.io/2-edge/reference/timeouts/
- Linkerd Circuit Breaking reference: https://linkerd.io/2.19/reference/circuit-breaking/
- Linkerd Viz CLI reference: https://linkerd.io/2.19/reference/cli/viz/
- Linkerd Proxy Metrics reference: https://linkerd.io/2.19/reference/proxy-metrics/
- Kubernetes Gateway API HTTPRoute documentation: https://gateway-api.sigs.k8s.io/api-types/httproute/
- Kubernetes Gateway API specification: https://gateway-api.sigs.k8s.io/reference/spec/
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux CLI `reconcile kustomization` documentation: https://fluxcd.io/flux/cmd/flux_reconcile_kustomization/

## Issues Found
- The introduction presented ServiceProfile and Linkerd-specific HTTPRoute policy APIs as the primary current mechanisms. Updated the wording to note that HTTPRoute is the Gateway API configuration path and ServiceProfile is legacy/backwards-compatible.
- The prerequisites only mentioned the ServiceProfile CRD. Added Gateway API HTTPRoute CRDs as a requirement for the HTTPRoute timeout example.
- The HTTPRoute timeout example used `policy.linkerd.io/v1beta3` and an `idle` field under `rules.timeouts`. Updated the example to `gateway.networking.k8s.io/v1` and replaced `idle` with the valid `backendRequest` timeout field.
- The circuit-breaker section incorrectly implied Linkerd has no circuit breaker and that retry budgets are the circuit-breaking mechanism. Updated the section to describe fail-fast ServiceProfile behavior and note that Linkerd circuit breaking is endpoint-level failure accrual and incompatible with ServiceProfiles.
- The monitoring section claimed `linkerd viz routes` directly showed retry rates and used an invalid Prometheus query with `classification="retry"`. Updated it to use `linkerd viz routes ... --to ... -o wide` for effective versus actual request comparison and replaced the Prometheus example with a valid outbound `request_total` volume query.
- The `linkerd viz stat` command was described as a resilience checker. Updated the comment to describe it as aggregate traffic stats.
- The conclusion referred to "idempotency annotations"; ServiceProfile uses retryability fields rather than annotations. Updated this to "retryability settings."

## Review Notes
ServiceProfiles remain supported for backwards compatibility but are no longer the preferred path for new Linkerd retry and timeout configuration. A future rewrite could use HTTPRoute/GRPCRoute annotations for retries throughout instead of centering legacy ServiceProfiles.
