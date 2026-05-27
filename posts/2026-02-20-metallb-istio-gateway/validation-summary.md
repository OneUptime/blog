# Validation Summary: How to Use MetalLB with Istio Ingress Gateway

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Kubernetes
- MetalLB
- Istio
- Istio Ingress Gateway
- Istio Gateway and VirtualService APIs
- Envoy sidecar injection
- Istio traffic management

## Sources Consulted
- MetalLB usage documentation: https://metallb.io/usage/
- MetalLB release notes: https://metallb.io/release-notes/
- MetalLB concepts documentation: https://metallb.io/concepts/
- Istio install with istioctl documentation: https://istio.io/latest/docs/setup/install/istioctl/
- Istio istioctl command reference: https://istio.io/latest/docs/reference/commands/istioctl/
- Istio installing gateways documentation: https://istio.io/latest/docs/setup/additional-setup/gateway/
- Istio Gateway API reference: https://istio.io/latest/docs/reference/config/networking/gateway/
- Istio Ingress Gateway task documentation: https://istio.io/latest/docs/tasks/traffic-management/ingress/ingress-control/
- Istio secure ingress gateway documentation: https://istio.io/latest/docs/tasks/traffic-management/ingress/secure-ingress/
- Istio sidecar injection documentation: https://istio.io/latest/docs/setup/additional-setup/sidecar-injection/
- Istio Bookinfo application documentation: https://istio.io/latest/docs/examples/bookinfo/
- Istio Bookinfo sample manifest: https://raw.githubusercontent.com/istio/istio/release-1.29/samples/bookinfo/platform/kube/bookinfo.yaml

## Issues Found
- The MetalLB annotation for requesting a specific load balancer IP used the deprecated `metallb.universe.tf/loadBalancerIPs` prefix. Changed it to the current `metallb.io/loadBalancerIPs` annotation documented by MetalLB.
- The Istio verification step used `istioctl verify-install`, which is not listed in the current Istio command reference. Changed the install command to use the current `--verify` flag on `istioctl install`.
- The HTTPS gateway comment did not specify where the TLS secret should live for the default ingress gateway. Clarified that the referenced Kubernetes TLS secret should be in `istio-system`, matching Istio's secure ingress guidance for the default ingress gateway.

## Review Notes
- The sample `productpage` deployment uses a single-service subset of Bookinfo, so the page can render but may show unavailable details or reviews unless the other Bookinfo services are also deployed.
- The Bookinfo image tag in the post is older than the current Istio sample manifest tag, but it is version-pinned and not technically incorrect.
