# Validation Summary: How to Migrate to the Calico Ingress Gateway Safely

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Calico Open Source
- Calico Enterprise Ingress Gateway
- Kubernetes Ingress
- Kubernetes Gateway API
- NGINX Ingress Controller
- Envoy Gateway
- Calico NetworkPolicy
- kubectl

## Sources Consulted
- Calico Enterprise documentation: Calico Ingress Gateway, https://docs.tigera.io/calico-enterprise/latest/networking/ingress-gateway/about-calico-ingress-gateway
- Calico Enterprise documentation: Create an ingress gateway, https://docs.tigera.io/calico-enterprise/latest/networking/ingress-gateway/create-ingress-gateway
- Calico Open Source documentation: NetworkPolicy resource, https://docs.tigera.io/calico/latest/reference/resources/networkpolicy
- Calico Open Source documentation: Namespace rules in policy, https://docs.tigera.io/calico/latest/network-policy/policy-rules/namespace-policy
- Calico Open Source documentation: Calico automatic labels, https://docs.tigera.io/calico/latest/network-policy/get-started/calico-policy/calico-labels
- Kubernetes documentation: Ingress, https://kubernetes.io/docs/concepts/services-networking/ingress/

## Issues Found
- The post implied that open-source Calico provides ingress gateway functionality through standard ingress controllers. Updated the wording to clarify that open-source Calico secures standard Kubernetes ingress controllers with network policy, while Calico Enterprise provides a Gateway API-based Calico Ingress Gateway built on Envoy Gateway.
- The description referenced blue-green cutover, but the post did not contain blue-green migration steps. Updated the description to match the actual content.
- The Ingress example had no namespace while the Calico NetworkPolicy targeted the `production` namespace. Added `namespace: production` to the Ingress and updated the `kubectl describe ingress` command to use `-n production`.
- The Calico NetworkPolicy source selector would only match endpoints in the policy namespace by default, so it would not match an ingress controller running in the `ingress-nginx` namespace. Added a `namespaceSelector` using the documented `projectcalico.org/name` namespace label and used common ingress-nginx controller labels.
- The NetworkPolicy allowed destination port `8080` while the Ingress backend referenced service port `80`. Updated the policy destination port to `80` for consistency with the example.
- The `curl` verification command only handled LoadBalancer IPs. Updated it to fall back to the LoadBalancer hostname, which is common in cloud environments.
- The conclusion described the example as the Calico ingress gateway. Updated it to describe the Calico-secured Kubernetes ingress pattern shown in the post.

## Review Notes
The post is technically valid after these corrections, but it still focuses on securing a Kubernetes Ingress controller with Calico policy rather than demonstrating a full Calico Enterprise Gateway API migration. A future revision could add Gateway, HTTPRoute, and traffic-splitting examples if the intent is specifically Calico Enterprise Ingress Gateway blue-green migration.
