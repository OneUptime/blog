# Validation Summary: How to Secure Dapr Dashboard Access

## Status
validated

## Post Type
Guide

## Technologies Covered
- Dapr Dashboard
- Kubernetes (Ingress, NetworkPolicy, RBAC)
- Helm
- NGINX Ingress Controller
- OAuth2 Proxy

## Sources Consulted
- Dapr v1.11 Release Notes — https://github.com/dapr/dapr/releases/tag/v1.11.0
- Dapr Dashboard Helm chart values.yaml — https://github.com/dapr/dashboard/blob/master/chart/dapr-dashboard/values.yaml
- Dapr Dashboard deployment template — https://github.com/dapr/dashboard/blob/master/chart/dapr-dashboard/templates/dapr_dashboard_deployment.yaml
- Dapr Kubernetes deployment docs — https://docs.dapr.io/operations/hosting/kubernetes/kubernetes-deploy/
- Dapr main Helm chart values.yaml — https://github.com/dapr/dapr/blob/master/charts/dapr/values.yaml
- Kubernetes NetworkPolicy API reference — https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.28/#networkpolicy-v1-networking-k8s-io
- NGINX Ingress external auth annotations — https://kubernetes.github.io/ingress-nginx/examples/auth/oauth-external-auth/

## Issues Found

### 1. Dashboard installation command incorrect (HIGH severity)
**What was wrong:** The post stated the Dapr Dashboard is installed as part of the `dapr/dapr` Helm chart (`helm install dapr dapr/dapr`). Since Dapr 1.11 (June 2023), the dashboard is a separate Helm chart (`dapr/dapr-dashboard`).
**What was changed:** Updated the installation section to reference the separate `dapr/dapr-dashboard` Helm chart with the correct install command (`helm install dapr-dashboard dapr/dapr-dashboard --namespace dapr-system`).

### 2. Dashboard disable flag no longer exists (HIGH severity)
**What was wrong:** The post used `--set dapr_dashboard.enabled=false` on the `dapr/dapr` chart to disable the dashboard. This flag existed only in Dapr v1.9–v1.10. Since v1.11, the dashboard is a separate chart, so this flag does not exist.
**What was changed:** Replaced the section with instructions to simply not install the `dapr-dashboard` chart, or to uninstall it with `helm uninstall dapr-dashboard --namespace dapr-system`.

### 3. Namespace flag on cluster-scoped resources (LOW severity)
**What was wrong:** The kubectl commands `kubectl get clusterrolebinding -n dapr-system` and `kubectl describe clusterrole dapr-dashboard -n dapr-system` included the `-n dapr-system` flag. ClusterRoleBindings and ClusterRoles are cluster-scoped resources — the namespace flag is ignored and misleading.
**What was changed:** Removed the `-n dapr-system` flag from both commands.

## Review Notes
- The NetworkPolicy uses `app.kubernetes.io/name: dapr-dashboard` as the pod selector. This label is applied by the Helm chart's k8sLabels, so it works. However, the primary service selector label is `app: dapr-dashboard`. Both should work, but readers should verify the labels match their deployment.
- The Ingress YAML, NetworkPolicy YAML, and RBAC Role YAML are all syntactically correct and use valid Kubernetes API versions.
- The OAuth2 Proxy annotations follow the standard NGINX Ingress external auth pattern and are correct.
- The overall security recommendations (port-forward in production, OAuth2 for shared access, NetworkPolicy restrictions, RBAC scoping) are sound and follow Kubernetes security best practices.
