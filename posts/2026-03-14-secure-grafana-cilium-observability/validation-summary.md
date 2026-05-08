# Validation Summary: Securing Grafana Access for Cilium Observability

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Grafana
- Grafana Helm chart
- Grafana Generic OAuth
- Grafana teams, organizations, and dashboard permissions
- Grafana Enterprise/Grafana Cloud audit logging
- CiliumNetworkPolicy
- cert-manager Certificate resources
- Kubernetes Secrets and kubectl
- curl and jq

## Sources Consulted
- Grafana Helm chart documentation: https://grafana.com/docs/grafana/latest/setup-grafana/installation/helm/
- Grafana Helm chart values: https://github.com/grafana/helm-charts/blob/main/charts/grafana/values.yaml
- Grafana Generic OAuth documentation: https://grafana.com/docs/grafana/latest/setup-grafana/configure-access/configure-authentication/generic-oauth/
- Grafana HTTP API reference and X-Grafana-Org-Id header: https://grafana.com/docs/grafana/latest/developer-resources/api-reference/http-api/
- Grafana Organization HTTP API: https://grafana.com/docs/grafana/latest/developer-resources/api-reference/http-api/org/
- Grafana Team HTTP API: https://grafana.com/docs/grafana/latest/developer-resources/api-reference/http-api/api-legacy/team/
- Grafana Dashboard Permissions HTTP API: https://grafana.com/docs/grafana/latest/developer-resources/api-reference/http-api/api-legacy/dashboard_permissions/
- Grafana audit logging documentation: https://grafana.com/docs/grafana/latest/setup-grafana/configure-security/audit-grafana/
- Cilium DNS-based policy documentation: https://docs.cilium.io/en/stable/security/dns/
- cert-manager Certificate API reference: https://cert-manager.io/docs/reference/api-docs/
- Kubernetes kubectl secret reference: https://kubernetes.io/docs/reference/kubectl/kubectl-cmds/

## Issues Found
- The Grafana Helm values were incorrectly nested under a top-level `grafana:` key while the command uses the standalone `grafana/grafana` chart. Updated the authentication, TLS, and audit values to use the chart's top-level value keys.
- The OAuth secret was created but not injected into the Grafana pod, and the key name did not match the `${OAUTH_CLIENT_SECRET}` reference. Added `envFromSecret: grafana-oauth` and changed the secret key to `OAUTH_CLIENT_SECRET`.
- The admin password was shown as `security.admin_password` in `grafana.ini`, which is not how the Grafana Helm chart wires the initial admin credential. Replaced it with `admin.existingSecret`, `userKey`, and `passwordKey`.
- The Generic OAuth role mapping could return a non-role value when neither group matched. Added a valid `Viewer` fallback.
- The organization/team API examples created a new organization but then created teams in the current organization context and hard-coded team IDs. Captured `orgId` and `teamId` values and used the `X-Grafana-Org-Id` header for organization-scoped calls.
- The Cilium policy used same-namespace endpoint matching for an ingress controller and DNS labels that would not reliably match kube-dns in `kube-system`. Added Cilium namespace labels and DNS L7 rules with `protocol: ANY`, matching Cilium's FQDN policy guidance.
- The audit logging section configured ordinary Grafana server logs, not Grafana audit logs. Replaced it with the Enterprise/Cloud auditing configuration using the `logger` exporter and updated the log filters.
- The RBAC verification used `/api/datasources`, which is not a reliable 403 check for viewers. Changed it to `/api/admin/stats`, an admin API endpoint.
- The troubleshooting note suggested lowering the global log level to reduce audit verbosity, but console audit logs require debug-level logging. Replaced it with guidance to use file or Loki audit exporters or filtering.

## Review Notes
- `helm` and `kubectl` were not installed in the local environment, so those commands were verified against official documentation rather than executed.
- Grafana v13 documentation marks legacy `/api` endpoints as deprecated in favor of newer `/apis` endpoints, but the legacy endpoints used in this post remain available and are still documented.
