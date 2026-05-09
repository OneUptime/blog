# Validation Summary: How to Troubleshoot the Calico Ingress Gateway

## Status
validated

## Post Type
Tutorial / troubleshooting guide

## Technologies Covered
- Calico Open Source network policy
- Calico Enterprise Ingress Gateway
- Kubernetes Ingress
- Kubernetes Gateway API
- ingress-nginx
- kubectl

## Sources Consulted
- Kubernetes Ingress documentation: https://kubernetes.io/docs/concepts/services-networking/ingress/
- Calico NetworkPolicy resource reference: https://docs.tigera.io/calico/latest/reference/resources/networkpolicy
- Calico automatic labels documentation: https://docs.tigera.io/calico/latest/network-policy/get-started/calico-policy/calico-labels
- Calico Enterprise Ingress Gateway overview: https://docs.tigera.io/calico-enterprise/latest/networking/ingress-gateway/about-calico-ingress-gateway
- Calico Enterprise create an ingress gateway documentation: https://docs.tigera.io/calico-enterprise/latest/networking/ingress-gateway/create-ingress-gateway
- ingress-nginx rewrite annotation documentation: https://kubernetes.github.io/ingress-nginx/examples/rewrite/
- ingress-nginx deployment documentation: https://kubernetes.github.io/ingress-nginx/deploy/

## Issues Found
- The introduction implied that open-source Calico has ingress gateway capabilities through standard Ingress controllers. Updated the wording to clarify that open-source Calico provides network policy enforcement while ingress traffic is handled by a Kubernetes Ingress controller, and that Calico Enterprise Ingress Gateway is based on Envoy Gateway and Gateway API.
- The prerequisites grouped Calico Enterprise Ingress Gateway with Kubernetes Ingress controllers. Updated the wording to distinguish the Ingress-controller example from Gateway API deployments.
- The Ingress example was implicitly in the `default` namespace while the Calico NetworkPolicy targeted pods in the `production` namespace. Added `namespace: production` to the Ingress and updated the verification command to describe the Ingress in that namespace.
- The Calico source selector only selected same-namespace endpoints by default and used a nonstandard `app == 'ingress-nginx'` label. Added a `namespaceSelector` for the `ingress-nginx` namespace and used the common ingress-nginx controller labels.
- The policy allowed destination port `8080` while the Ingress backend referenced service port `80` and no Service `targetPort` was shown. Changed the policy destination port to `80` so the example is internally consistent.

## Review Notes
The post uses the stable Kubernetes `networking.k8s.io/v1` Ingress API. Kubernetes documentation notes that Ingress is frozen and recommends Gateway API for new feature development, but Ingress remains generally available and is not planned for removal.
