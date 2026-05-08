# Validation Summary: How to Validate the Calico Ingress Gateway

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Calico Open Source network policy
- Calico Enterprise and Calico Cloud Ingress Gateway
- Kubernetes Ingress
- ingress-nginx
- kubectl
- Envoy Gateway / Kubernetes Gateway API

## Sources Consulted
- Kubernetes Ingress documentation: https://kubernetes.io/docs/concepts/services-networking/ingress/
- Kubernetes kubectl describe reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_describe/
- Calico NetworkPolicy resource reference: https://docs.tigera.io/calico/latest/reference/resources/networkpolicy
- Calico Ingress Gateway overview: https://docs.tigera.io/calico-enterprise/latest/networking/ingress-gateway/about-calico-ingress-gateway
- Calico Ingress Gateway creation guide: https://docs.tigera.io/calico-enterprise/latest/networking/ingress-gateway/create-ingress-gateway
- ingress-nginx deployment guide: https://kubernetes.github.io/ingress-nginx/deploy/
- ingress-nginx annotations reference: https://kubernetes.github.io/ingress-nginx/user-guide/nginx-configuration/annotations/

## Issues Found
- The introduction blurred the distinction between Calico Ingress Gateway and standard Kubernetes Ingress controllers. Updated it to state that Calico Enterprise and Calico Cloud provide Calico Ingress Gateway based on Envoy Gateway and Gateway API, while open-source Calico enforces policy under a separate Ingress controller.
- The prerequisites implied that the same example applied to a Calico Enterprise gateway. Updated the prerequisite to clarify that the YAML examples use a Kubernetes Ingress controller such as ingress-nginx.
- The Ingress example omitted the `production` namespace while the Calico policy was namespaced to `production`. Added `metadata.namespace: production` so the Ingress and backend service reference are in the same namespace context.
- The Calico policy source selector used `app == 'ingress-nginx'`, which would not usually match ingress-nginx controller pods and would not match across namespaces without a namespace selector. Updated it to use the ingress-nginx namespace label and the controller component label documented by ingress-nginx.
- The Calico policy allowed destination port `8080` while the Ingress backend referenced service port `80`. Changed the allowed destination port to `80` to match the example backend.
- The curl command only read `.status.loadBalancer.ingress[0].ip`, but Kubernetes LoadBalancer status can expose either an IP address or hostname. Updated the jsonpath to include both IP and hostname.
- The `kubectl describe ingress` command did not specify the `production` namespace. Added `-n production`.

## Review Notes
The example remains an ingress-nginx-based Kubernetes Ingress validation workflow, not a full Calico Ingress Gateway Gateway API workflow. A future post could add separate Gateway and HTTPRoute examples for Calico Enterprise or Calico Cloud.
