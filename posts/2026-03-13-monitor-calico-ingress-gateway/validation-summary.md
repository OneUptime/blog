# Validation Summary: How to Monitor the Calico Ingress Gateway

## Status
validated

## Post Type
Guide

## Technologies Covered
- Calico
- Calico NetworkPolicy
- Calico Ingress Gateway
- Kubernetes Ingress
- Kubernetes Gateway API
- ingress-nginx
- kubectl
- curl

## Sources Consulted
- Calico Open Source 3.32 documentation: Calico Ingress Gateway: https://docs.tigera.io/calico/latest/networking/ingress-gateway/create-ingress-gateway
- Calico Open Source 3.32 documentation: NetworkPolicy resource: https://docs.tigera.io/calico/latest/reference/resources/networkpolicy
- Calico Open Source 3.32 documentation: Migrating from NGINX Ingress: https://docs.tigera.io/calico/latest/networking/ingress-gateway/migrate-from-nginx
- Kubernetes documentation: Ingress: https://kubernetes.io/docs/concepts/services-networking/ingress/
- ingress-nginx documentation: rewrite-target annotation: https://kubernetes.github.io/ingress-nginx/examples/rewrite/

## Issues Found
- The introduction described open-source Calico ingress gateway functionality as typically being implemented through NGINX or another ingress controller. Current Calico documentation describes Calico Ingress Gateway as based on Envoy Gateway and the Kubernetes Gateway API, while Calico can also enforce policy for standard ingress controllers. Updated the wording to distinguish these cases.
- The prerequisites implied that NGINX, Envoy-based ingress controllers, and Calico Enterprise gateway were interchangeable for the same example. Updated the prerequisite to clarify that the shown Kubernetes Ingress example uses an ingress controller such as NGINX, while Calico Ingress Gateway uses Gateway API deployments.
- The Ingress resource had no namespace, but the Calico NetworkPolicy selected application pods in the `production` namespace. Added `namespace: production` to the Ingress metadata and updated the `kubectl describe ingress` command to use `-n production`.
- The Calico NetworkPolicy used only `source.selector: app == 'ingress-nginx'`. Calico namespaced NetworkPolicy selectors are scoped to the policy namespace unless `namespaceSelector` is provided, so this would not select ingress controller pods in the `ingress-nginx` namespace. Added `namespaceSelector: projectcalico.org/name == 'ingress-nginx'` and changed the selector to common ingress-nginx controller labels.
- The test command only read `.status.loadBalancer.ingress[0].ip`, but Kubernetes LoadBalancer services may expose either an IP or a hostname. Updated the jsonpath to read both `.ip` and `.hostname`.
- The description claimed the post used Prometheus and Grafana to monitor ingress health, request rates, latency, and errors, but the post does not include Prometheus or Grafana configuration. Updated the description to match the actual ingress and policy configuration content.

## Review Notes
The post is technically valid as a Kubernetes Ingress plus Calico policy enforcement guide. It does not yet show a full Calico Ingress Gateway Gateway API manifest or actual Prometheus/Grafana monitoring configuration, so a future revision should either add those examples or retitle the post to better match the current scope.
