# Validation Summary: How to Understand Istio's Virtual Service vs Kubernetes Ingress

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Kubernetes Ingress
- Kubernetes Ingress controllers
- Istio VirtualService
- Istio Gateway
- Istio traffic management
- Envoy proxy

## Sources Consulted
- Kubernetes Ingress documentation: https://kubernetes.io/docs/concepts/services-networking/ingress/
- Istio VirtualService reference: https://istio.io/latest/docs/reference/config/networking/virtual-service/
- Istio Gateway reference: https://istio.io/latest/docs/reference/config/networking/gateway/
- Istio traffic management concepts: https://istio.io/latest/docs/concepts/traffic-management/

## Issues Found
- The Istio Gateway and VirtualService examples used `networking.istio.io/v1beta1`. The current Istio documentation uses `networking.istio.io/v1` for these resources, so the examples were updated to the current API version.
- The initial VirtualService example attached both an external gateway and `mesh`, but only listed the internal service host. Added `app.example.com` to the `hosts` list so the example represents both external host routing and internal service routing.
- The routing capabilities list described source labels as "which service is making the request." Istio documents `sourceLabels` as source client workload labels and notes that it is a selector, not a runtime service-name match. The wording was corrected to "which client workloads the rule applies to."

## Review Notes
The post's main technical distinctions are accurate: standard Kubernetes Ingress is limited to edge HTTP(S) host/path routing implemented by an Ingress controller, while Istio VirtualService supports richer HTTP matching, weighted routing, retries, timeouts, fault injection, mirroring, and header operations for gateway and mesh traffic. Kubernetes Ingress controller annotations can add non-standard behavior, but those extensions are controller-specific and do not change the core Ingress API comparison.
