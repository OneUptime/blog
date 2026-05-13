# Validation Summary: How to Migrate to Ingress Gateway Canary Rollouts with Calico Safely

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Calico Ingress Gateway
- Kubernetes Gateway API
- Kubernetes HTTPRoute
- Calico NetworkPolicy
- kubectl
- Canary deployments

## Sources Consulted
- Calico documentation: Calico Ingress Gateway, https://docs.tigera.io/calico-cloud/networking/ingress-gateway/about-calico-ingress-gateway
- Calico documentation: Create an ingress gateway, https://docs.tigera.io/calico/latest/networking/ingress-gateway/create-ingress-gateway
- Calico documentation: Tutorial: Launch a canary deployment with Calico Ingress Gateway, https://docs.tigera.io/calico/latest/networking/ingress-gateway/tutorial-ingress-gateway-canary
- Calico documentation: NetworkPolicy resource, https://docs.tigera.io/calico/latest/reference/resources/networkpolicy
- Calico documentation: Automatic labels, https://docs.tigera.io/calico/latest/network-policy/get-started/calico-policy/calico-labels
- Kubernetes Gateway API documentation: HTTP traffic splitting, https://gateway-api.sigs.k8s.io/guides/traffic-splitting/
- Kubernetes documentation: kubectl logs, https://kubernetes.io/docs/reference/kubectl/generated/kubectl_logs/
- Kubernetes documentation: kubectl patch, https://kubernetes.io/docs/reference/kubectl/generated/kubectl_patch/
- Ingress-NGINX Controller documentation: Canary deployments, https://kubernetes.github.io/ingress-nginx/examples/canary/

## Issues Found
- The post described Calico Ingress Gateway but used NGINX Ingress Controller canary annotations on `Ingress` resources. Calico Ingress Gateway uses the Kubernetes Gateway API, so the example was changed to a weighted `HTTPRoute` with `backendRefs`.
- The prerequisites referenced generic ingress controller support and NGINX canary annotations. They were updated to require Calico installed with the Tigera Operator, Calico Ingress Gateway enabled, a `Gateway` using `tigera-gateway-class`, LoadBalancer support, and two backend Services.
- The Calico policy allowed traffic from pods labeled `app == 'ingress-nginx'`, which does not match Calico Ingress Gateway. It was changed to allow traffic from the `tigera-gateway` namespace using Calico's automatic namespace label.
- The command for increasing canary traffic used `kubectl annotate ingress` with an NGINX-specific annotation. It was replaced with a JSON patch that updates the two `HTTPRoute` backend weights.
- The rollout diagram referred to an `Ingress Controller`. It was updated to refer to `Calico Ingress Gateway`.

## Review Notes
The `kubectl logs` examples are syntactically valid, but in production they should usually be replaced or supplemented with metrics from an observability system so the rollout decision is not based only on ad hoc log counting.
