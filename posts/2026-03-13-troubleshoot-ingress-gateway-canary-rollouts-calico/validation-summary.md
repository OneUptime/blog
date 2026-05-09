# Validation Summary: How to Troubleshoot Ingress Gateway Canary Rollouts with Calico

## Status
validated

## Post Type
Tutorial / troubleshooting guide

## Technologies Covered
- Calico Ingress Gateway
- Calico NetworkPolicy
- Kubernetes Gateway API
- Kubernetes Gateway and HTTPRoute resources
- Kubernetes kubectl
- Canary deployments

## Sources Consulted
- Calico Ingress Gateway documentation: https://docs.tigera.io/calico/latest/networking/ingress-gateway/create-ingress-gateway
- Calico NetworkPolicy reference: https://docs.tigera.io/calico/latest/reference/resources/networkpolicy
- Calico automatic labels documentation: https://docs.tigera.io/calico/latest/network-policy/get-started/calico-policy/calico-labels
- Kubernetes Gateway API HTTP traffic splitting guide: https://gateway-api.sigs.k8s.io/guides/traffic-splitting/
- Kubernetes Gateway API HTTPRoute reference: https://gateway-api.sigs.k8s.io/api-types/httproute/
- Envoy Gateway generated resource label examples: https://gateway.envoyproxy.io/docs/tasks/traffic/gateway-address/
- Kubernetes kubectl logs reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_logs/
- Kubernetes kubectl annotate reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_annotate/
- ingress-nginx canary annotation documentation, used to verify the original example's controller-specific behavior: https://kubernetes.github.io/ingress-nginx/user-guide/nginx-configuration/annotations/

## Issues Found
- The post described Calico Ingress Gateway but used standard Kubernetes Ingress resources with ingress-nginx canary annotations. Calico Ingress Gateway is based on Envoy Gateway and uses Kubernetes Gateway API resources. I replaced the Ingress examples with a Gateway and HTTPRoute using weighted backendRefs.
- The prerequisites referenced NGINX Ingress Controller canary annotations, which do not apply to Calico Ingress Gateway. I changed this to require Calico Ingress Gateway with Gateway API support enabled.
- The Calico NetworkPolicy source selector matched an `ingress-nginx` pod in the same namespace by default. Calico namespaced NetworkPolicy source selectors need a namespaceSelector when matching gateway pods in another namespace. I updated the source to match the generated Envoy gateway pods in the `tigera-gateway` namespace using Envoy Gateway ownership labels.
- The canary weight update command used `kubectl annotate ingress` to change an ingress-nginx annotation. I replaced it with a JSON patch that updates the HTTPRoute backendRef weights.
- The conclusion referred to traffic splitting at the ingress layer. I changed this to the gateway layer to match Calico Ingress Gateway and Gateway API terminology.

## Review Notes
- The `kubectl logs -l ... --prefix=true` commands use valid kubectl options, but they are basic log-count checks rather than production-grade rollout validation. In a real environment, metrics from the ingress gateway and application telemetry would give more reliable error-rate comparisons.
- The policy assumes the Calico-managed Envoy data plane runs in the `tigera-gateway` namespace and carries Envoy Gateway ownership labels for the Gateway. If a cluster customizes the gateway deployment namespace or labels, the policy selector must be adjusted.
