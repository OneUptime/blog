# Validation Summary: How to Configure Istiod Push Throttling

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Istio
- Istiod / Pilot
- Envoy xDS
- IstioOperator configuration
- Kubernetes kubectl
- Prometheus metrics and PromQL

## Sources Consulted
- Istio pilot-discovery command reference and environment variables: https://istio.io/latest/docs/reference/commands/pilot-discovery/
- Istio pilot-discovery exported metrics reference: https://istio.io/latest/docs/reference/commands/pilot-discovery/#exported-metrics
- Istio installation customization and Kubernetes settings: https://istio.io/latest/docs/setup/additional-setup/customize-installation/
- IstioOperator API reference: https://istio.io/latest/docs/reference/config/istio.operator.v1alpha1/
- Kubernetes kubectl create deployment reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_create/kubectl_create_deployment/

## Issues Found
- The post said `PILOT_PUSH_THROTTLE=0` means no limit. Current Istio documentation says `0` or unset means the max is automatically determined based on machine size. Updated the text to reflect auto-sizing.
- The post used `pilot_xds_pushes` as a push-rate metric. Current Istio documentation describes `pilot_xds_pushes` as Pilot build and send errors for xDS pushes. Replaced the push-rate query with `pilot_push_triggers`.
- The post described `pilot_push_triggers` as push queue size. Current Istio documentation describes it as a push trigger counter labeled by reason. Replaced that example with `pilot_proxy_queue_time_bucket` for proxy queue latency.
- The post referenced `pilot_debounce_send` and `pilot_debounce_max`, which are not listed in the current Istio exported metrics reference. Replaced them with `pilot_debounce_time_bucket`.
- Clarified that push throttling and debouncing together control batching and rate limiting; push throttling alone is concurrency limiting.

## Review Notes
The cluster-size tuning values are workload-dependent examples rather than official universal recommendations. They are plausible starting points, but production values should be validated with istiod CPU, memory, push trigger rate, proxy queue latency, and proxy convergence time.
