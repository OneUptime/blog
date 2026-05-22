# Validation Summary: How to Compare Istio Gateway vs NGINX Ingress Controller

## Status
validated

## Post Type
Technical comparison guide

## Technologies Covered
- Kubernetes Ingress
- ingress-nginx / NGINX Ingress Controller
- Istio Gateway
- Istio VirtualService
- Envoy xDS
- cert-manager
- Helm

## Sources Consulted
- Kubernetes Ingress documentation: https://kubernetes.io/docs/concepts/services-networking/ingress/
- ingress-nginx documentation: https://kubernetes.github.io/ingress-nginx/
- ingress-nginx installation guide: https://kubernetes.github.io/ingress-nginx/deploy/
- ingress-nginx annotations reference: https://kubernetes.github.io/ingress-nginx/user-guide/nginx-configuration/annotations/
- ingress-nginx canary deployment example: https://kubernetes.github.io/ingress-nginx/examples/canary/
- ingress-nginx how-it-works documentation: https://kubernetes.github.io/ingress-nginx/how-it-works/
- Istio install with istioctl: https://istio.io/latest/docs/setup/install/istioctl/
- Istio Gateway reference: https://istio.io/latest/docs/reference/config/networking/gateway/
- Istio VirtualService reference: https://istio.io/docs/reference/config/networking/virtual-service/
- Istio secure ingress gateway task: https://istio.io/latest/docs/tasks/traffic-management/ingress/secure-ingress/
- Istio traffic management documentation: https://istio.io/latest/docs/concepts/traffic-management/
- cert-manager Ingress usage documentation: https://cert-manager.io/docs/usage/ingress/

## Issues Found
- The ingress-nginx Helm command assumed the chart repository was already configured. Added the official `--repo https://kubernetes.github.io/ingress-nginx` flag so the command works as shown.
- The NGINX Ingress annotation example used `nginx.ingress.kubernetes.io/rate-limit` and `nginx.ingress.kubernetes.io/rate-limit-window`, which are not current ingress-nginx annotations. Replaced them with `nginx.ingress.kubernetes.io/limit-rpm`.
- The post described NGINX reloads as dropped-connection disruptions. Updated the wording to match ingress-nginx documentation: many configuration changes trigger reloads and can affect latency and load-balancing state, while endpoint-only changes can be updated dynamically.
- The Istio examples used `networking.istio.io/v1beta1`. Updated them to the current documented `networking.istio.io/v1` API version.
- The Istio weighted-routing example referenced subsets without stating that subsets must exist. Added a brief note that the `v1` and `v2` subsets must be defined in a DestinationRule.
- The NGINX canary Ingress examples did not specify `ingressClassName`. Added `ingressClassName: nginx` to make the examples target ingress-nginx explicitly.
- The post treated community ingress-nginx as a generally current default. Added a caveat that the community ingress-nginx project is retired as of March 2026 and distinguished it from supported NGINX ingress offerings.
- The feature list said Istio has several capabilities that NGINX does not, while the post itself later shows NGINX canary support through annotations. Reworded the heading to say Istio exposes these capabilities as first-class mesh traffic management.

## Review Notes
The post is technically relevant and accurate after the corrections. A future revision could compare the Kubernetes Gateway API more directly, since both Kubernetes and Istio documentation increasingly point readers toward Gateway API for new ingress traffic-management work.
