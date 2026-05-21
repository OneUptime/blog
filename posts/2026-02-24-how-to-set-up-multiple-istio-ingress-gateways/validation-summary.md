# Validation Summary: How to Set Up Multiple Istio Ingress Gateways

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Istio ingress gateways
- IstioOperator
- Istio Gateway and VirtualService resources
- Kubernetes Services
- Kubernetes HorizontalPodAutoscaler
- AWS Load Balancer Controller service annotations
- istioctl and kubectl

## Sources Consulted
- Istio Installing Gateways: https://istio.io/latest/docs/setup/additional-setup/gateway/
- IstioOperator Options reference: https://istio.io/latest/docs/reference/config/istio.operator.v1alpha1/
- Istio Gateway reference: https://istio.io/latest/docs/reference/config/networking/gateway/
- Istio VirtualService reference: https://istio.io/latest/docs/reference/config/networking/virtual-service/
- Istio istioctl command reference: https://istio.io/latest/docs/reference/commands/istioctl/
- Kubernetes Service documentation: https://kubernetes.io/docs/concepts/services-networking/service/
- AWS Load Balancer Controller NLB documentation: https://kubernetes-sigs.github.io/aws-load-balancer-controller/v2.4/guide/service/nlb/

## Issues Found
- The "Gateway in a Different Namespace" section said VirtualServices could reference the deployed gateway workload directly. In Istio, `VirtualService.spec.gateways` references Istio `Gateway` resources, and the `Gateway` resource uses a selector to target the gateway workload labels. I added a `Gateway` resource for `team-a-gw` that selects `istio: team-a-gateway`, then kept the VirtualService reference to `team-a/team-a-gw`.

## Review Notes
- The IstioOperator gateway labels, Kubernetes Service type examples, Gateway selectors, VirtualService gateway references, TLS settings, HPA manifests, and `istioctl proxy-config` commands were checked against current official documentation and are technically valid.
- Istio's current gateway installation guide recommends deploying gateways in a namespace separate from the control plane as a security best practice. The post still uses `istio-system` for the main example, which is common in older/simple examples but may not be the preferred production topology.
