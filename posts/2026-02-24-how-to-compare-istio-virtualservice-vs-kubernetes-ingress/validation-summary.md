# Validation Summary: How to Compare Istio VirtualService vs Kubernetes Ingress

## Status
validated

## Post Type
Guide

## Technologies Covered
- Kubernetes Ingress
- Kubernetes Services
- Istio VirtualService
- Istio Gateway
- Istio traffic management
- kubectl

## Sources Consulted
- Kubernetes Ingress documentation: https://kubernetes.io/docs/concepts/services-networking/ingress/
- Kubernetes Virtual IPs and Service Proxies documentation: https://kubernetes.io/docs/reference/networking/virtual-ips/
- Istio VirtualService reference: https://istio.io/latest/docs/reference/config/networking/virtual-service/
- Istio Gateway reference: https://istio.io/latest/docs/reference/config/networking/gateway/
- Istio secure ingress gateway task: https://istio.io/latest/docs/tasks/traffic-management/ingress/secure-ingress/
- Istio v1 APIs announcement: https://istio.io/latest/blog/2024/v1-apis/

## Issues Found
- Istio examples used `apiVersion: networking.istio.io/v1beta1`. Updated Gateway and VirtualService examples to `networking.istio.io/v1`, matching the current promoted Istio networking API.
- The post said Kubernetes Ingress works with any Kubernetes cluster. Clarified that it requires an ingress controller.
- The post said Ingress defines the ingress controller and that the controller creates the load balancer. Updated this to say Ingress references an ingress class and that the controller typically provisions or configures the load balancer or frontend.
- The post described Kubernetes Service internal routing as round-robin by default. Replaced this with a more accurate description that internal routing is handled by Kubernetes Services and the cluster's service proxy or networking implementation.
- VirtualService examples used subsets without noting the required DestinationRule. Added concise notes that corresponding DestinationRule subsets must exist.
- The post described `sourceLabels` as the service making the request. Updated this to describe labels on the source workload, matching Istio's API semantics.

## Review Notes
- Kubernetes documentation now notes that the Ingress API is frozen and recommends Gateway API for new feature development, but Ingress remains stable and valid. This does not make the post incorrect.
