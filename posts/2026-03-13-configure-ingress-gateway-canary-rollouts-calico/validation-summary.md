# Validation Summary: How to Configure Ingress Gateway Canary Rollouts with Calico

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Calico Ingress Gateway
- Calico NetworkPolicy
- Kubernetes Gateway API
- Kubernetes HTTPRoute traffic splitting
- kubectl

## Sources Consulted
- Calico Ingress Gateway overview: https://docs.tigera.io/calico-cloud/networking/ingress-gateway/about-calico-ingress-gateway
- Calico create ingress gateway documentation: https://docs.tigera.io/calico/latest/networking/ingress-gateway/create-ingress-gateway
- Calico canary deployment tutorial: https://docs.tigera.io/calico/latest/networking/ingress-gateway/tutorial-ingress-gateway-canary
- Calico NetworkPolicy resource reference: https://docs.tigera.io/calico/latest/reference/resources/networkpolicy
- Calico namespace selector documentation: https://docs.tigera.io/calico/latest/network-policy/policy-rules/namespace-policy
- Kubernetes Gateway API HTTP traffic splitting guide: https://gateway-api.sigs.k8s.io/guides/traffic-splitting/
- Kubernetes kubectl patch reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_patch/
- Kubernetes kubectl logs reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_logs/

## Issues Found
- The post described Calico Ingress Gateway but used Kubernetes Ingress resources with NGINX-specific canary annotations. Replaced the example with Gateway API `Gateway` and `HTTPRoute` resources using weighted `backendRefs`, which is the model used by Calico Ingress Gateway.
- The prerequisites referenced generic ingress controller support and NGINX canary annotations. Updated them to require Calico Ingress Gateway via the Tigera Operator and Gateway API resources.
- The Calico policy allowed traffic from pods labeled `app == 'ingress-nginx'`, which does not match Calico Ingress Gateway. Updated the rule to allow ingress from the `tigera-gateway` namespace using Calico's `projectcalico.org/name` namespace label.
- The rollout command used `kubectl annotate ingress` to change an NGINX canary weight. Replaced it with a JSON patch against the `HTTPRoute` backend weights.
- The rollout diagram referred to a generic Ingress Controller. Updated it to identify Calico Ingress Gateway.

## Review Notes
The weighted values in `HTTPRoute` are proportional weights; using `90` and `10` produces a 90/10 split because the sum is 100. Local executable YAML validation could not be run because Ruby, `yaml`, and `js-yaml` were unavailable in the environment, so the snippets were checked manually against the official Gateway API and Calico examples.
