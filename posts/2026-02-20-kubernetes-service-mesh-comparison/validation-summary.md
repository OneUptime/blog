# Validation Summary: Comparing Kubernetes Service Meshes: Istio, Linkerd, and Consul Connect

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Kubernetes
- Istio
- Linkerd
- Consul service mesh / Consul Connect
- Envoy
- Helm
- Prometheus metrics
- Kubernetes Gateway API / HTTPRoute

## Sources Consulted
- Istio install with istioctl: https://istio.io/latest/docs/setup/install/istioctl/
- Istio sidecar injection: https://istio.io/latest/docs/setup/additional-setup/sidecar-injection/
- Istio VirtualService and DestinationRule references: https://istio.io/latest/docs/reference/config/networking/virtual-service/ and https://istio.io/latest/docs/reference/config/networking/destination-rule/
- Istio standard metrics: https://istio.io/latest/docs/reference/config/metrics/
- Linkerd install CLI reference: https://linkerd.io/2/reference/cli/install/
- Linkerd traffic shifting: https://linkerd.io/docs/tasks/traffic-shifting/
- Linkerd retries and timeouts: https://linkerd.io/2/features/retries-and-timeouts/
- Linkerd ServiceProfile reference: https://linkerd.io/2/reference/service-profiles/
- Linkerd circuit breaking reference: https://linkerd.io/2/reference/circuit-breaking/
- Linkerd rate limiting guide: https://linkerd.io/docs/tasks/configuring-rate-limiting/
- Linkerd Viz CLI reference: https://linkerd.io/2/reference/cli/viz/
- Consul Helm install docs: https://developer.hashicorp.com/consul/docs/deploy/server/k8s/helm
- Consul Helm chart reference: https://developer.hashicorp.com/consul/docs/k8s/helm
- Consul Kubernetes service mesh docs: https://developer.hashicorp.com/consul/docs/connect/k8s
- Consul ServiceIntentions reference: https://developer.hashicorp.com/consul/docs/reference/config-entry/service-intentions
- Consul rate limiting docs: https://developer.hashicorp.com/consul/docs/manage-traffic/rate-limit
- Consul Kubernetes observability docs: https://developer.hashicorp.com/consul/docs/k8s/connect/observability/metrics

## Issues Found
- The Istio examples used `networking.istio.io/v1beta1`. Updated the VirtualService and DestinationRule examples to the current `networking.istio.io/v1` API version used in the latest Istio docs.
- The Istio circuit-breaker example used `maxPendingRequests`, which is not the current DestinationRule HTTP connection pool field. Changed it to `http1MaxPendingRequests`.
- The Linkerd traffic splitting example used the SMI `TrafficSplit` API. Linkerd still supports it, but current docs recommend HTTPRoute-based traffic shifting because the SMI extension is not receiving further feature development. Replaced the snippet with a Linkerd `HTTPRoute` example using weighted `backendRefs`.
- The feature table said Linkerd has no circuit breaking and no rate limiting. Updated it to reflect Linkerd's endpoint-level circuit breaking and local HTTP rate limiting support.
- The feature table said Consul rate limiting is done via intentions. Intentions are for service-to-service authorization, while rate limiting is configured separately. Updated the table entry.
- The observability example used `linkerd stat`, but current Linkerd metrics commands are under the Viz extension. Updated it to `linkerd viz stat`.

## Review Notes
- Resource overhead numbers are approximate and deployment-dependent. They are acceptable as high-level guidance, but future revisions would be stronger if they tied these numbers to a benchmark environment and product versions.
- Linkerd ServiceProfiles are still supported, but newer retry and timeout examples often use HTTPRoute, GRPCRoute, or Service annotations in current Linkerd documentation.
