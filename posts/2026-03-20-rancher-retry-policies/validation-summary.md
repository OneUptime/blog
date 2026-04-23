# Validation Summary: How to Configure Retry Policies with Service Mesh in Rancher

## Status
validated

## Post Type
Guide

## Technologies Covered
- Rancher
- Rancher Fleet
- Kubernetes
- Istio
- Envoy
- Prometheus
- `kubectl`

## Sources Consulted
- Istio VirtualService reference: https://istio.io/latest/docs/reference/config/networking/virtual-service/
- Istio DestinationRule reference: https://istio.io/latest/docs/reference/config/networking/destination-rule/
- Istio traffic management concepts: https://istio.io/latest/docs/concepts/traffic-management/
- Istio request timeouts task: https://istio.io/latest/docs/tasks/traffic-management/request-timeouts/
- Istio circuit breaking task: https://istio.io/latest/docs/tasks/traffic-management/circuit-breaking/
- Istio fault injection task: https://istio.io/latest/docs/tasks/traffic-management/fault-injection/
- Istio Envoy statistics documentation: https://istio.io/latest/docs/ops/configuration/telemetry/envoy-stats/
- Istio traffic management troubleshooting, including fault injection with retry/timeout limitations: https://istio.io/latest/docs/ops/common-problems/network-issues/
- Istio v1 APIs announcement: https://istio.io/latest/blog/2024/v1-apis/
- Rancher Istio integration overview: https://ranchermanager.docs.rancher.com/v2.10/integrations-in-rancher/istio
- Rancher Istio setup guide and Rancher-Istio deprecation note: https://ranchermanager.docs.rancher.com/v2.11/how-to-guides/advanced-user-guides/istio-setup-guide
- Rancher Fleet overview: https://ranchermanager.docs.rancher.com/integrations-in-rancher/fleet/overview
- Fleet Git repository contents: https://fleet.rancher.io/explanations/gitrepo-content
- Fleet `fleet.yaml` reference: https://fleet.rancher.io/reference/ref-fleet-yaml
- Envoy HTTP routing and request hedging: https://www.envoyproxy.io/docs/envoy/latest/intro/arch_overview/http/http_routing.html
- Envoy router retry policy reference: https://www.envoyproxy.io/docs/envoy/latest/configuration/http/http_filters/router_filter.html

## Issues Found
- The post used `networking.istio.io/v1beta1` throughout the examples. I updated the manifests to `networking.istio.io/v1`, which is the current stable Istio API version.
- The GET match in the advanced `VirtualService` example was incorrect. I changed it from `headers.method` to the documented top-level `method` matcher, because `method` is an `HTTPMatchRequest` field rather than an HTTP header matcher.
- The comment on `retryRemoteLocalities` was wrong. I corrected it to describe locality-aware retry behavior instead of retry tracking headers.
- The “hedging” section was technically inaccurate. Istio’s `VirtualService` retry API exposes retries and per-try timeouts, but not Envoy hedge policy, so I rewrote that section to describe low-latency sequential retries instead of parallel hedged requests.
- The outlier detection comment incorrectly described `consecutive5xxErrors: 5` as a 50% error-rate threshold. I corrected it to the documented behavior: ejection after five consecutive 5xx errors.
- The retry-testing section combined fault injection and retries in the same `VirtualService`, which Istio documents as unsupported. I replaced it with a valid retry test setup against a backend that intermittently returns 503 responses.
- The metrics section implied the raw Envoy retry counters were available by default. I added the required `proxyStatsMatcher` caveat and proxy-restart note because Istio records only a minimal Envoy stat set unless additional counters are enabled.
- The Fleet example labeled a plain manifest as `fleet-values.yaml`. I corrected the filename comment to reflect that Fleet can deploy raw Kubernetes manifests directly and that `fleet.yaml` is the bundle-options file.
- The best-practices formula for timeout budgeting was incorrect, and the `attempts` comment confused retries with total attempts. I corrected the guidance and adjusted the example timeout to leave room for the initial request plus retries.
- The retry-semantics explanation described gateway errors as connection resets. I corrected the terminology to distinguish gateway errors from reset failures.

## Review Notes
- The post is technically relevant and is suitable for publication after correction.
- Current Rancher documentation notes that Rancher-Istio is deprecated starting in Rancher v2.12.0 in favor of the SUSE Rancher Application Collection build of Istio. The post still works as a Rancher-managed Istio guide, but that product-direction caveat remains relevant for readers on newer Rancher releases.
- The Prometheus retry queries rely on Envoy retry stats rather than Istio standard service metrics, so clusters that have not enabled those Envoy counters will not return data for those queries.
