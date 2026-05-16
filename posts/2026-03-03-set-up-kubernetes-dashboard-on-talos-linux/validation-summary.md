# Validation Summary: How to Set Up Kubernetes Dashboard on Talos Linux

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Talos Linux
- Kubernetes Dashboard
- Kubernetes RBAC
- Kubernetes ServiceAccount tokens
- Helm
- ingress-nginx
- Metrics Server
- oauth2-proxy

## Sources Consulted
- Kubernetes documentation: Deploy and Access the Kubernetes Dashboard - https://kubernetes.io/docs/tasks/access-application-cluster/web-ui-dashboard/
- Kubernetes Dashboard archived repository and chart values - https://github.com/kubernetes-retired/dashboard
- Kubernetes service account token administration - https://kubernetes.io/docs/reference/access-authn-authz/service-accounts-admin/
- Kubernetes RBAC authorization reference - https://kubernetes.io/docs/reference/access-authn-authz/rbac/
- ingress-nginx annotations reference - https://kubernetes.github.io/ingress-nginx/user-guide/nginx-configuration/annotations/
- oauth2-proxy configuration reference - https://oauth2-proxy.github.io/oauth2-proxy/configuration/overview/

## Issues Found
- The Helm repository URL `https://kubernetes.github.io/dashboard/` now returns 404 after the Dashboard project was archived. Updated the post to use `https://kubernetes-retired.github.io/dashboard/` and noted that Dashboard is archived and no longer actively maintained.
- The text described the current Dashboard as `v3+`, but the archived chart is Dashboard 7.x. Updated the wording to refer to Kubernetes Dashboard 7.x.
- The Helm values example used incorrect settings keys for Dashboard 7.x. Moved `itemsPerPage`, `defaultNamespace`, and the refresh interval under `app.settings.global`, and changed `autoRefreshTimeInterval` to `resourceAutoRefreshTimeInterval`.
- The values example implied `metrics-server.enabled` enables the Dashboard metrics scraper. Added the correct `metricsScraper.enabled: true` key and kept `metrics-server.enabled: false` as the bundled Metrics Server setting.
- The ingress example combined `nginx.ingress.kubernetes.io/ssl-passthrough: "true"` with other ingress-nginx annotations. ingress-nginx documents that SSL passthrough disables other annotations, so the example would not reliably enforce the IP whitelist. Removed SSL passthrough and kept `backend-protocol: "HTTPS"`.
- The namespace-scoped RBAC example grouped resources from core, `apps`, and `batch` API groups in one rule. Split the rules by API group so the permissions match the Kubernetes API resource groups precisely.
- The troubleshooting log selector used `app.kubernetes.io/name=kubernetes-dashboard`, which does not match Dashboard 7.x chart labels. Updated it to select `app.kubernetes.io/part-of=kubernetes-dashboard`.

## Review Notes
Dashboard is technically usable but deprecated and unmaintained as of the current Kubernetes documentation. Future revisions should consider covering Headlamp for new in-cluster web UI deployments.
