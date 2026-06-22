# Validation Summary: How to Install Kubernetes Dashboard on Ubuntu

## Status
validated

## Post Type
Tutorial / Guide (step-by-step installation and configuration walkthrough)

## Technologies Covered
- Kubernetes Dashboard (v2.7.0)
- kubectl (cluster-info, get, patch, proxy, create token, auth can-i, config)
- Helm 3.x (kubernetes-dashboard chart)
- Kubernetes RBAC (ServiceAccount, ClusterRole, ClusterRoleBinding)
- Kubernetes networking (NodePort Service, Ingress, NetworkPolicy)
- metrics-server
- Service account token Secrets (TokenRequest API)
- kubeconfig generation
- Alternative dashboards: Lens, Rancher, Headlamp

## Sources Consulted
- Kubernetes Dashboard — Web UI docs: https://kubernetes.io/docs/tasks/access-application-cluster/web-ui-dashboard/
- kubectl create token reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_create/kubectl_create_token/
- Service Accounts admin (token lifetime / `--service-account-max-token-expiration`): https://kubernetes.io/docs/reference/access-authn-authz/service-accounts-admin/
- kubernetes/dashboard repo and accessing-dashboard docs (Helm 7.x / Kong proxy change): https://github.com/kubernetes/dashboard/blob/master/docs/user/accessing-dashboard/README.md
- metrics-server releases: https://github.com/kubernetes-sigs/metrics-server
- Lens snap package: https://snapcraft.io/kontena-lens
- Headlamp Helm repo: https://headlamp-k8s.github.io/headlamp/

## Issues Found
1. **Incorrect default token expiration claim.** The Token-Based Login section stated `# Token expires in 24 hours by default`. This is wrong: `kubectl create token` does not have a fixed 24-hour client default. When `--duration` is omitted, the lifetime is determined by the API server, and the TokenRequest default is **1 hour**. Changed the comment to `# Token lifetime is set by the API server (1 hour by default)` to match the official `kubectl create token` documentation.

## Review Notes
- **Helm install (Method 2) is version-sensitive.** The post pins Method 1 to the v2.7.0 manifest (`aio/deploy/recommended.yaml`), and every downstream section (the `https:kubernetes-dashboard:` proxy URL, the NodePort patch on `svc/kubernetes-dashboard`, port 443 → targetPort 8443, the Ingress backend, the TLS-verify command) is correct and internally consistent with that v2.7.0 install. However, `helm repo add https://kubernetes.github.io/dashboard/` now serves chart **7.x**, which dropped manifest-style layout and bundles a **Kong gateway**. With the 7.x chart the access service is named `kubernetes-dashboard-kong-proxy` (not `kubernetes-dashboard`), and the custom `dashboard-values.yaml` keys (`metricsScraper`, top-level `resources`, top-level `service`) no longer match the chart schema. Readers who follow the Helm path instead of the v2.7.0 manifest will need to adjust the service name and values. This was left as-is because the post is explicitly framed around the v2.7.0 manifest and correcting it would require restructuring/adding a Kong explanation rather than a targeted fix; flagging here for a future refresh.
- The v2.7.0 manifest URL remains valid (immutable Git tag) and installs a working Dashboard; the post already advises checking for the latest version.
- `--duration=720h` (30 days) is valid syntax; note that a cluster may cap the issued lifetime via `--service-account-max-token-expiration` and return a shorter token with a warning. Not an error.
- RBAC manifests, the long-lived `kubernetes.io/service-account-token` Secret (with `kubernetes.io/service-account.name` annotation and auto-populated `token`/`ca.crt`), the metrics-server install + `--kubelet-insecure-tls` JSON patch, NetworkPolicy, audit-policy snippet, and the `kontena-lens --classic` snap / Headlamp Helm commands all verified correct and current.
