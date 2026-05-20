# Validation Summary: How to Configure SSO with GitHub OAuth in ArgoCD

## Status
validated

## Post Type
Tutorial / Configuration Guide

## Technologies Covered
- Argo CD SSO and RBAC
- Dex GitHub connector
- GitHub OAuth Apps
- GitHub Enterprise Server OAuth configuration
- Kubernetes ConfigMaps, Secrets, and kubectl commands
- Argo CD CLI SSO login

## Sources Consulted
- Argo CD User Management / SSO documentation: https://argo-cd.readthedocs.io/en/latest/operator-manual/user-management/
- Argo CD RBAC documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/rbac/
- Argo CD `argocd login` command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_login/
- Argo CD `argocd account` command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_account/
- Dex GitHub connector documentation: https://dexidp.io/docs/connectors/github/
- GitHub OAuth App creation documentation: https://docs.github.com/en/developers/apps/creating-an-oauth-app
- GitHub OAuth authorization documentation: https://docs.github.com/apps/oauth-apps/building-oauth-apps/authorizing-oauth-apps
- Kubernetes `kubectl patch` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_patch/

## Issues Found
- The initial Dex example used `loadAllGroups: true` together with `orgs`. Dex documents that `loadAllGroups` only works when neither `org` nor `orgs` is configured. I replaced it with `teamNameField: slug` so the RBAC examples using team slugs such as `platform-team` match the emitted group claims.
- The troubleshooting section advised setting `loadAllGroups: true` when teams do not appear. I changed this to advise checking that `teamNameField` matches the RBAC identifiers, because the guide uses organization-restricted login with `orgs`.

## Review Notes
- Argo CD documentation says `redirectURI` does not need to be set in Dex connector configuration because Argo CD automatically uses the correct `/api/dex/callback` URL for OAuth2 connectors. The examples use the same callback URL, so this is redundant rather than incorrect.
- Local `kubectl` was not installed in the review environment, so `kubectl patch` syntax was checked against the official Kubernetes command reference instead of local CLI help.
