# Validation Summary: How to Add Custom Helm Repositories in Portainer

## Status
validated

## Post Type
Guide / Tutorial

## Technologies Covered
- Portainer
- Kubernetes
- Helm
- Portainer HTTP API
- ChartMuseum
- GitHub Pages

## Sources Consulted
- Portainer Documentation: Account settings - https://docs.portainer.io/user/account-settings
- Portainer Documentation: General settings - https://docs.portainer.io/admin/settings/general
- Portainer Documentation: Add a new application using code - https://docs.portainer.io/user/kubernetes/applications/manifest
- Portainer Documentation: Create an application from a Helm chart - https://docs.portainer.io/user/kubernetes/applications/manifest/helm
- Portainer Documentation: API documentation - https://docs.portainer.io/api/docs
- Portainer CE OpenAPI spec 2.39.1 - https://api-docs.portainer.io/versions/ce/2.39.1.yaml
- Portainer Release Notes - https://docs.portainer.io/release-notes?fallback=true
- ChartMuseum `helm-push` plugin README - https://github.com/chartmuseum/helm-push
- NGINX Documentation: Use Helm to Install NGINX Ingress Controller with NGINX Open Source - https://docs.nginx.com/nginx-ingress-controller/install/helm/open-source/
- cert-manager Documentation: Installing with Helm - https://cert-manager.io/docs/installation/helm/
- ExternalDNS chart documentation - https://kubernetes-sigs.github.io/external-dns/latest/charts/external-dns/

## Issues Found
- The Portainer navigation was incorrect. The post sent readers to a Kubernetes environment gear page, but current Portainer docs place user-scoped Helm repositories under `My account > Helm repositories`, while the admin-wide setting is under `Settings > General > Helm Repository`. I updated the navigation and clarified the difference.
- The prerequisites overstated the permission requirement. Admin access is not required to add user-scoped Helm repositories, so I changed this to a Portainer user account and noted that admin access is only needed for the global default repo setting.
- The repository management section incorrectly described per-repository username/password auth and CA upload. Current Portainer docs and the OpenAPI schema document user Helm repositories as URL-based entries, while private CA configuration is handled globally under `Settings > General` in BE. I removed the unsupported auth steps and corrected the CA guidance.
- The API examples used undocumented routes and payloads. I replaced `/api/endpoints/1/kubernetes/helm/repositories` and `/api/endpoints/1/kubernetes/helm/charts` with the documented `/api/users/{id}/helm/repositories`, `/api/users/me`, and `/api/templates/helm` endpoints, removed the unsupported `name` field, and changed the authentication payload keys to the documented `Username` and `Password`.
- The list of public repositories was fenced as `bash` even though it contained bare URLs rather than executable shell commands. I changed the fence to `text` so the snippet is syntactically accurate.
- The deployment flow was outdated. Current Portainer docs route Helm installs through `Applications > Create from code > Helm repository`, not a `Helm` page in the left sidebar. I updated the steps accordingly.
- The NGINX example repository URL was outdated. Current official NGINX Ingress Controller docs use OCI charts rather than `https://helm.nginx.com/stable`, so I replaced that example with a current HTTP Helm repository example.
- The ChartMuseum example was incomplete because `helm cm-push ... my-repo` requires a repo alias that has already been added to Helm. I added the missing `helm repo add my-repo https://chartmuseum.yourcompany.com` step.
- The conclusion implied generic private repository support, but the Portainer material I verified documents public HTTP Helm repositories plus a global CA setting rather than per-repo credential configuration. I narrowed the wording to internally hosted repositories that Portainer can reach.

## Review Notes
- Portainer's release notes describe the feature as support for "any public Helm repository". Based on the URL-only API and HTTP/HTTPS repository model, internally hosted repositories should also work if they are reachable from the Portainer instance, but Portainer's current user Helm repository API does not document per-repository credentials.
- Portainer Business Edition separately supports OCI registries for Helm charts. This post remains focused on HTTP/HTTPS Helm repositories.
- cert-manager still documents `https://charts.jetstack.io`, but their docs note that OCI charts are now the source of truth and the legacy HTTP repository can lag behind releases.
