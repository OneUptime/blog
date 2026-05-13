# Validation Summary: How to Configure the Calico Ingress Gateway

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Calico Open Source
- Calico Enterprise / Calico Cloud Ingress Gateway
- Kubernetes Ingress
- Kubernetes Gateway API
- ingress-nginx
- Calico NetworkPolicy
- kubectl

## Sources Consulted
- Kubernetes Ingress documentation: https://kubernetes.io/docs/concepts/services-networking/ingress/
- Calico NetworkPolicy resource reference: https://docs.tigera.io/calico/latest/reference/resources/networkpolicy
- Calico Ingress Gateway overview: https://docs.tigera.io/calico-enterprise/latest/networking/ingress-gateway/about-calico-ingress-gateway
- Calico create ingress gateway guide: https://docs.tigera.io/calico-enterprise/latest/networking/ingress-gateway/create-ingress-gateway
- ingress-nginx annotations documentation: https://kubernetes.github.io/ingress-nginx/user-guide/nginx-configuration/annotations/
- ingress-nginx deployment documentation: https://kubernetes.github.io/ingress-nginx/deploy/

## Issues Found
- The introduction described Calico ingress gateway capabilities in a way that blurred standard Kubernetes Ingress controllers with Calico Ingress Gateway. Updated the wording to distinguish open-source Calico network policy enforcement with standard ingress controllers from Calico Enterprise / Calico Cloud Ingress Gateway, which is based on Envoy Gateway and the Kubernetes Gateway API.
- The Ingress resource did not specify the `production` namespace, while the Calico `NetworkPolicy` targeted workloads in `production`. Added `metadata.namespace: production` and made the `kubectl describe ingress` command namespace-aware.
- The Calico `NetworkPolicy` source selector would only match pods in the policy namespace unless a `namespaceSelector` was provided. Added `namespaceSelector: projectcalico.org/name == 'ingress-nginx'` so the rule can match the ingress controller in the `ingress-nginx` namespace.
- The source selector used a non-standard `app == 'ingress-nginx'` label for ingress-nginx controller pods. Updated it to match the labels used by the official ingress-nginx manifests: `app.kubernetes.io/name == 'ingress-nginx' && app.kubernetes.io/component == 'controller'`.
- The destination port in the Calico policy was `8080`, while the Ingress backend service example routes to service port `80`. Changed the allowed destination port to `80` to keep the example internally consistent.
- The verification `curl` command only handled load balancers that populate `.status.loadBalancer.ingress[0].ip`. Updated it to also work when the load balancer publishes a hostname.

## Review Notes
The post is technically valid as an example of using a standard Kubernetes Ingress controller with Calico policy enforcement. A future revision could add a separate Gateway API example for Calico Enterprise / Calico Cloud Ingress Gateway using `Gateway` and `HTTPRoute` resources.
