# Validation Summary: How to Set Up Kubernetes Dashboard Securely

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes Dashboard
- Kubernetes RBAC
- ServiceAccounts and ServiceAccount tokens
- kubectl
- Helm
- Kubernetes Ingress
- ingress-nginx
- cert-manager
- OAuth2 Proxy
- Kubernetes NetworkPolicy
- Kubernetes audit policy

## Sources Consulted
- Kubernetes Dashboard task documentation: https://kubernetes.io/docs/tasks/access-application-cluster/web-ui-dashboard/
- Kubernetes Dashboard archived repository and Helm chart: https://github.com/kubernetes-retired/dashboard
- Kubernetes Dashboard chart repository index: https://kubernetes-retired.github.io/dashboard/index.yaml
- Kubernetes Dashboard chart templates: https://github.com/kubernetes-retired/dashboard/tree/master/charts/kubernetes-dashboard
- kubectl create token reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_create/kubectl_create_token/
- Kubernetes ServiceAccount administration: https://kubernetes.io/docs/reference/access-authn-authz/service-accounts-admin/
- Kubernetes RBAC documentation: https://kubernetes.io/docs/reference/access-authn-authz/rbac/
- Kubernetes NetworkPolicy documentation: https://kubernetes.io/docs/concepts/services-networking/network-policies/
- Kubernetes Ingress documentation: https://kubernetes.io/docs/concepts/services-networking/ingress/
- ingress-nginx basic authentication documentation: https://kubernetes.github.io/ingress-nginx/examples/auth/basic/
- cert-manager Ingress documentation: https://cert-manager.io/docs/usage/ingress/
- OAuth2 Proxy releases/documentation: https://github.com/oauth2-proxy/oauth2-proxy/releases

## Issues Found
- The installation section used the legacy Kubernetes Dashboard v2.7.0 manifest while calling it the recommended/latest stable install path. Updated it to use the archived Dashboard Helm chart repository and Helm install command.
- The post did not mention that Kubernetes Dashboard is now archived and no longer actively maintained. Added a short caveat near the introduction.
- Access examples still targeted the old `kubernetes-dashboard` service. Updated kubectl proxy, port-forward, Ingress, OAuth2 Proxy, LoadBalancer warning, and endpoint troubleshooting examples to use `kubernetes-dashboard-kong-proxy`.
- Expected pod names reflected the old monolithic Dashboard deployment. Updated the example output to reflect the Helm chart's API, auth, web, metrics scraper, and Kong pods.
- The read-only ClusterRole allowed reading Secrets. Removed `secrets` from the read-only role because read access to Secrets exposes sensitive data and conflicts with least-privilege guidance.
- The NetworkPolicy selected `app.kubernetes.io/name: kubernetes-dashboard`, which does not match the current Helm chart's ingress-facing Kong pods. Updated the selector to match the default Kong labels used by the chart.
- Troubleshooting logs used a label selector that does not match the current Helm deployment. Updated it to select the Helm release instance.

## Review Notes
The local environment did not have `kubectl` or `helm`, so CLI behavior and rendered chart output were verified against official documentation, reachable release artifacts, and chart templates rather than local command execution. The ingress-nginx and cert-manager install commands remain pinned examples; future maintenance should periodically update those pinned versions.
