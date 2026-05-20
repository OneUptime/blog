# Validation Summary: How to Integrate ArgoCD with Teleport

## Status
validated

## Post Type
Tutorial / Integration guide

## Technologies Covered
- Argo CD
- Argo CD Dex SSO
- Teleport Application Access
- Teleport OIDC connectors
- Teleport role-based access control and Access Requests
- Kubernetes Deployments and Secrets
- PrometheusRule monitoring

## Sources Consulted
- Teleport Application Access documentation: https://goteleport.com/docs/enroll-resources/application-access/
- Teleport Application Service reference: https://goteleport.com/docs/enroll-resources/application-access/reference/
- Teleport `teleport` CLI reference: https://goteleport.com/docs/reference/cli/teleport/
- Teleport `tsh` CLI reference: https://goteleport.com/docs/reference/cli/tsh/
- Teleport `tctl` CLI reference: https://goteleport.com/docs/reference/cli/tctl/
- Teleport session recording architecture: https://goteleport.com/docs/reference/architecture/session-recording/
- Teleport role reference: https://goteleport.com/docs/reference/access-controls/roles/
- Teleport Access Request role request documentation: https://goteleport.com/docs/identity-governance/access-requests/role-requests/
- Teleport OIDC authentication documentation: https://goteleport.com/docs/zero-trust-access/sso/integrate-idp/oidc/
- Argo CD user management and Dex documentation: https://argo-cd.readthedocs.io/en/latest/operator-manual/user-management/
- Argo CD CLI command reference: https://argo-cd.readthedocs.io/en/release-3.2/user-guide/commands/argocd_app/
- Dex SAML/OIDC connector documentation: https://dexidp.io/docs/connectors/

## Issues Found
- The post described Teleport as an OIDC provider for Argo CD. Teleport OIDC connector resources configure Teleport as an OIDC client to an external identity provider, so the post now describes using a shared IdP for both Teleport and Argo CD Dex.
- The post claimed full web session recording for Argo CD Application Access. Teleport records application access as app session request audit events, not a full browser video/session replay, so the wording and commands were corrected.
- The Teleport agent example used `teleport start --roles=app --app-name --app-uri`. Current Teleport CLI documentation uses `teleport app start --name --uri`, so the Kubernetes Deployment args were updated and app labels were added for RBAC matching.
- Role examples matched `app_labels.name=argocd` even though the app resource did not set that label. The app and roles now use explicit `app=argocd` and `env=production` labels.
- Access Request examples were inconsistent: the developer role requested `argocd-admin` while the CLI requested `argocd-jit-admin`, and approval used the wrong `tsh request approve` command. The roles and commands now use `argocd-jit-admin`, `tsh request review --approve`, and `tsh login --request-id`.
- Audit and recording commands used unsupported or misleading forms such as `tsh recordings ls --type=app` and `tctl get events`. These were replaced with current `tsh recordings ls` and `tsh play --format=json` examples for app session events.
- The Argo CD CLI example assumed Teleport login alone authenticated the user to Argo CD. It now shows Teleport client certificate flags plus a separate Argo CD SSO login.
- The Teleport image tag was updated from the outdated major version 14 to 18 to match current Teleport documentation.

## Review Notes
The examples still use placeholder domains and a simplified identity-provider setup. In a production deployment, users should align Teleport agent, proxy, and client versions, configure the IdP client secrets in Kubernetes Secrets, and verify whether their Argo CD CLI path needs `--grpc-web` based on the proxy and ingress behavior.
