# Validation Summary: How to Configure Istio Gateway Selector Labels

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Istio Gateway
- IstioOperator
- Istio ingress and egress gateways
- Kubernetes labels and selectors
- kubectl
- istioctl
- Kubernetes Gateway API

## Sources Consulted
- Istio Gateway reference: https://istio.io/latest/docs/reference/config/networking/gateway/
- Istio Installing Gateways documentation: https://istio.io/latest/docs/setup/additional-setup/gateway/
- Istio Workload Selector reference: https://istio.io/latest/docs/reference/config/type/workload-selector/
- Istio Kubernetes Gateway API task: https://istio.io/latest/docs/tasks/traffic-management/ingress/gateway-api/
- Istio Egress Gateways task: https://istio.io/latest/docs/tasks/traffic-management/egress/egress-gateway/
- Istio istioctl command reference: https://istio.io/latest/docs/reference/commands/istioctl/
- Kubernetes kubectl get reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/

## Issues Found
- The Gateway API comparison incorrectly said Kubernetes Gateway API references gateway deployments directly by name and namespace. Updated it to state that Gateway API does not use the Istio Gateway `selector` field, and that Istio can either automatically provision gateway Deployment and Service resources from the Gateway API resource or link to manually deployed infrastructure using Gateway API fields such as `addresses`.

## Review Notes
The Istio Gateway selector examples, multi-label selector behavior, default ingress and egress gateway label usage, IstioOperator `label` examples, `kubectl get` usage, and `istioctl proxy-config` commands are consistent with current official documentation. Istio's documentation notes that native Gateway selector matching searches workloads across namespaces by default, unless `PILOT_SCOPE_GATEWAY_TO_NAMESPACE` is enabled.
