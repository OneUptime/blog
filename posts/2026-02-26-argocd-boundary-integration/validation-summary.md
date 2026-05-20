# Validation Summary: How to Integrate ArgoCD with Boundary

## Status
validated

## Post Type
Tutorial / integration guide

## Technologies Covered
- ArgoCD
- Kubernetes
- HashiCorp Boundary
- HashiCorp Vault credential stores and credential libraries
- GitOps
- Zero Trust access patterns

## Sources Consulted
- HashiCorp Boundary self-managed deployment documentation: https://developer.hashicorp.com/boundary/docs/deploy/self-managed
- HashiCorp Boundary controller configuration documentation: https://developer.hashicorp.com/boundary/docs/deploy/self-managed/configure-controllers
- HashiCorp Boundary worker documentation: https://developer.hashicorp.com/boundary/docs/workers
- HashiCorp Boundary TCP targets documentation: https://developer.hashicorp.com/boundary/docs/targets/create/tcp
- HashiCorp Boundary CLI command docs for scopes, hosts, host sets, targets, roles, sessions, connect, and authenticate: https://developer.hashicorp.com/boundary/docs/commands
- HashiCorp Boundary credential store and credential library docs: https://developer.hashicorp.com/boundary/docs/commands/credential-stores/create and https://developer.hashicorp.com/boundary/docs/commands/credential-libraries/create
- HashiCorp Boundary credential source docs: https://developer.hashicorp.com/boundary/docs/commands/targets/add-credential-sources
- HashiCorp Boundary Vault integration docs: https://developer.hashicorp.com/boundary/docs/vault
- HashiCorp Helm repository index: https://helm.releases.hashicorp.com/index.yaml
- Argo CD Application specification and Helm source documentation: https://argo-cd.readthedocs.io/en/stable/user-guide/helm/
- Argo CD CLI command documentation for `argocd login`: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_login/
- Argo CD ingress documentation for HTTP/HTTPS and gRPC behavior: https://argo-cd.readthedocs.io/en/latest/operator-manual/ingress/

## Issues Found
- The original ArgoCD `Application` used `repoURL: https://helm.releases.hashicorp.com` with `chart: boundary` and `targetRevision: 0.6.x`. HashiCorp's Helm repository does not publish an official Boundary chart, so that Application would not resolve. I replaced it with a GitOps pattern that points to tested internal manifests and added a note to use HCP Boundary or a self-managed Boundary deployment following HashiCorp's supported installation path.
- The original Boundary Helm values included an incomplete Boundary controller/worker configuration. Current self-managed Boundary deployments require explicit controller and worker configuration with PostgreSQL, TLS, worker registration, and KMS considerations. Removing the invalid chart example avoids presenting an incomplete production deployment as usable.
- The post described Boundary as injecting Kubernetes API credentials for ArgoCD cluster management. Boundary credential brokering returns credentials to users when they connect to a target; it does not inject credentials into ArgoCD or modify the credentials ArgoCD uses to manage clusters. I corrected the description and changed the example to a generic Vault-brokered credential source.
- The post metadata described "credential injection" as part of the ArgoCD integration. I changed this to "credential brokering" to match the actual Boundary workflow shown.

## Review Notes
The Boundary CLI command shapes for scopes, host catalogs, hosts, host sets, targets, role grants, authentication, connection, credential stores, credential libraries, credential sources, and session listing match the current official command documentation. The `argocd login localhost:8444 --sso --insecure` example uses supported Argo CD flags, but real SSO deployments may also require ArgoCD URL and redirect URI configuration so the identity provider accepts the localhost tunnel workflow.
