# Validation Summary: How to Handle Upstream Connection Errors in Istio

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Istio
- Envoy
- Kubernetes
- kubectl
- istioctl
- Istio VirtualService
- Istio DestinationRule

## Sources Consulted
- Envoy access log response flags: https://www.envoyproxy.io/docs/envoy/latest/configuration/observability/access_log/usage.html
- Envoy retry policy reference: https://www.envoyproxy.io/docs/envoy/latest/configuration/http/http_filters/router_filter.html
- Istio DestinationRule reference: https://istio.io/latest/docs/reference/config/networking/destination-rule/
- Istio VirtualService reference: https://istio.io/latest/docs/reference/config/networking/virtual-service/
- Istio istioctl command reference: https://istio.io/latest/docs/reference/commands/istioctl/
- Istio proxy-config diagnostic guide: https://istio.io/latest/docs/ops/diagnostic-tools/proxy-cmd/
- Istio istioctl describe diagnostic guide: https://istio.io/latest/docs/ops/diagnostic-tools/istioctl-describe/

## Issues Found
- The post described `UH` as meaning all endpoints are ejected by outlier detection. Envoy defines `UH` as no healthy upstream hosts, which can also happen with no ready endpoints or failed health checks. Updated the definition, troubleshooting section, and summary to use the broader accurate meaning.
- The post said to "enable access logging" but only showed a log-reading command. Updated the wording to say access logging should be enabled before checking logs.
- The NetworkPolicy guidance referred to traffic from the Envoy sidecar and source ports. Kubernetes NetworkPolicy is normally expressed with pod and namespace selectors plus destination ports, so the guidance was changed to allow traffic from the calling workload namespace or pod labels to the application port.
- The `maxEjectionPercent: 30` explanation said it ensures at least 70% of pods are always in the pool. Istio documents it as the maximum percentage that can be ejected, so the wording was changed to describe it as a cap, with a replica-count caveat.
- The pod termination note said `preStop` gives Envoy time to stop routing before shutdown. Updated it to the more accurate behavior: keeping the application alive while Kubernetes and Istio propagate endpoint removal.
- The retry section said `connect-failure` and `reset` are always safe because the request never reached the application. Envoy retry semantics do not guarantee that for every reset case, especially for non-idempotent operations, so the guidance now warns to use retries only when the operation is safe to retry.

## Review Notes
The Istio configuration examples use supported `networking.istio.io/v1beta1` fields, and the `istioctl proxy-config` and `istioctl x describe pod` commands match current Istio command documentation. A future update could mention revision-based sidecar injection labels for multi-revision Istio installations, but the existing `istio-injection=enabled` example is still a valid common setup.
