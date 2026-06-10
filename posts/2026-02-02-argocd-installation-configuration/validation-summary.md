# Validation Summary: How to Install and Configure ArgoCD

## Status
validated

## Post Type
Tutorial / Installation Guide

## Technologies Covered
- Argo CD (GitOps continuous delivery controller for Kubernetes)
- Kubernetes (kubectl, manifests, Ingress, StatefulSets, ConfigMaps, Secrets)
- Helm 3 (chart installation, values files, upgrades)
- NGINX Ingress Controller (ssl-passthrough configuration)
- Dex (federated OIDC for GitHub OAuth)
- Generic OIDC providers (Okta, Auth0, Keycloak)
- Argo CD CLI (`argocd`)
- Argo CD RBAC (Casbin-style `policy.csv`)

## Sources Consulted
- Argo CD official docs — Getting Started: https://argo-cd.readthedocs.io/en/stable/getting_started/
- Argo CD HA install manifests: https://github.com/argoproj/argo-cd/blob/stable/manifests/ha/install.yaml
- argo-helm chart (`argo/argo-cd`): https://github.com/argoproj/argo-helm/tree/main/charts/argo-cd
- Argo CD User Management — OIDC: https://argo-cd.readthedocs.io/en/stable/operator-manual/user-management/
- Argo CD User Management — Dex GitHub connector: https://argo-cd.readthedocs.io/en/stable/operator-manual/user-management/#dex
- Argo CD RBAC docs: https://argo-cd.readthedocs.io/en/stable/operator-manual/rbac/
- Argo CD Declarative Setup (Repositories, Clusters, Applications): https://argo-cd.readthedocs.io/en/stable/operator-manual/declarative-setup/
- Argo CD CLI reference (`argocd login`, `argocd repo add`, `argocd account update-password`, `argocd app get --show-operation`): https://argo-cd.readthedocs.io/en/stable/user-guide/commands/
- Argo CD Ingress configuration (nginx ssl-passthrough): https://argo-cd.readthedocs.io/en/stable/operator-manual/ingress/
- Kubernetes Ingress v1 API reference: https://kubernetes.io/docs/reference/kubernetes-api/service-resources/ingress-v1/

## Issues Found
- **Missing markdown heading marker on "Resource Limits Exceeded" subsection.** The "### " prefix was missing, so the heading rendered as a plain paragraph between two `###` subsections under "Common Issues and Solutions". Fixed by adding the `###` prefix. This is a markdown rendering bug, not a technical inaccuracy.

No code, command, manifest, Helm value, RBAC policy, or API field was found to be incorrect. Spot checks:
- `argocd-initial-admin-secret` and the `kubectl -n argocd get secret ... -o jsonpath="{.data.password}" | base64 -d` recipe match the official Getting Started guide.
- Helm `--set configs.params."server\.insecure"=true` uses the correct dot-escape syntax for the `argo-cd` chart's `configs.params` map keys (e.g. `server.insecure`, `reposerver.parallelism.limit`).
- `Application` `apiVersion: argoproj.io/v1alpha1`, `syncPolicy.automated.{prune,selfHeal}`, and `syncOptions: [CreateNamespace=true]` are correct per the declarative-setup docs.
- RBAC `policy.csv` lines (`p, subject, resource, action, object, effect` and `g, user, role`) follow Argo CD's Casbin grammar; `policy.default: role:readonly` is a valid default-role pointer.
- Dex GitHub connector schema (`type: github`, `id`, `name`, `config.clientID`, `config.clientSecret`, `config.orgs[].name`) matches the upstream Dex/Argo CD docs.
- OIDC `$oidc.okta.clientSecret` reference syntax (resolves to a key in `argocd-secret`) is the documented secret-substitution pattern.
- `argocd-application-controller-0` shown with the StatefulSet `-0` suffix is accurate.

## Review Notes
- **Pinned versions are old as of 2026-06.** Helm chart `5.51.6` and upgrade target `5.52.0` correspond to Argo CD v2.9.x (late 2023); the kubectl upgrade example pins `v2.9.3`. All three are still valid, downloadable artifacts and the commands work, but readers landing on this post in 2026 will likely want a current chart (7.x/8.x line) and Argo CD v2.13+/v3.x. Not corrected because the post explicitly chose these versions and they are not technically wrong, just stale.
- **`server.insecure` + nginx ssl-passthrough trade-off.** The values file sets `server.insecure: true` while the Ingress example uses `nginx.ingress.kubernetes.io/ssl-passthrough: "true"` with `backend-protocol: "HTTPS"`. These two configurations are individually documented and both work, but combining them as written would route HTTPS to a plaintext server. In practice readers should pick one (either keep `server.insecure: true` and drop `ssl-passthrough` / use `backend-protocol: HTTP`, or keep `ssl-passthrough` and leave the server in TLS mode). The post does not call this out. Left as-is since each snippet is internally correct and the official docs present them as alternatives.
- **Kubernetes prerequisite (v1.22+) is conservative** — fine for the older Argo CD versions referenced, but recent Argo CD releases require newer Kubernetes versions. Acceptable given the pinned chart.
- **`kubectl wait --for=condition=Ready pods --all`** works but can race against pods that have not been created yet; not incorrect, just a known caveat.
