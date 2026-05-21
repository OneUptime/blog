# Validation Summary: How to Install Istio Gateways Separately from the Control Plane

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Istio
- Istio gateways
- IstioOperator
- istioctl
- Helm
- Kubernetes
- AWS Network Load Balancer service annotations

## Sources Consulted
- Istio official documentation: Installing Gateways, https://istio.io/latest/docs/setup/additional-setup/gateway/
- Istio official documentation: Install with Helm, https://istio.io/latest/docs/setup/install/helm/
- Istio official command reference: istioctl, https://istio.io/latest/docs/reference/commands/istioctl/
- Istio official API reference: Gateway, https://istio.io/latest/docs/reference/config/networking/gateway/
- Istio official Gateway Helm chart values and templates, https://github.com/istio/istio/tree/master/manifests/charts/gateway
- Istio 1.24.0 Gateway Helm chart values and templates, https://github.com/istio/istio/tree/1.24.0/manifests/charts/gateway
- AWS Load Balancer Controller documentation: Network Load Balancer service annotations, https://kubernetes-sigs.github.io/aws-load-balancer-controller/latest/guide/service/annotations/

## Issues Found
- The gateway namespace examples labeled namespaces with `istio-injection=enabled`. Current Istio gateway installation guidance for Helm-created gateways only requires that the namespace must not have `istio-injection=disabled`; the Helm chart sets the gateway pod injection labels and template annotations itself. Removed the namespace labeling commands and updated the explanatory text.
- The public ingress gateway Helm release was named `istio-ingress`, which would default the workload selector label to `istio: ingress`, while the later `Gateway` resource selected `istio: ingressgateway`. Added `labels.istio: ingressgateway` to the values file so the selector, anti-affinity, and topology spread constraints match the gateway pods.
- The egress gateway values did not set an explicit gateway label. Added `labels.istio: egressgateway` so egress gateway configuration can reliably target the expected workload label.
- The custom `service.ports` arrays replaced the chart defaults and omitted the default `status-port` on port 15021. Added `status-port` back to the ingress, egress, and internal gateway values to preserve the chart's health/status service port while still exposing ports 80 and 443.

## Review Notes
The Istio Gateway API can now auto-provision gateway deployments for Kubernetes Gateway API resources, but the post is specifically about manually managing Istio gateway Helm chart deployments, which remains supported and documented. The upgrade example pins Istio 1.24.0 as an example version; operators should choose a currently supported Istio version for real deployments.
