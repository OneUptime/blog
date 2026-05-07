# Validation Summary: How to Configure GitHub Authentication in Rancher

## Status
validated

## Post Type
Guide

## Technologies Covered
- Rancher Manager
- GitHub OAuth Apps
- GitHub Enterprise Server
- Kubernetes
- Rancher RBAC
- Rancher v3 Settings API

## Sources Consulted
- Rancher: Configure GitHub - https://ranchermanager.docs.rancher.com/how-to-guides/new-user-guides/authentication-permissions-and-global-configuration/authentication-config/configure-github
- Rancher: Configuring Authentication - https://ranchermanager.docs.rancher.com/v2.9/how-to-guides/new-user-guides/authentication-permissions-and-global-configuration/authentication-config
- Rancher: Users and Groups - https://ranchermanager.docs.rancher.com/how-to-guides/new-user-guides/authentication-permissions-and-global-configuration/authentication-config/manage-users-and-groups
- Rancher: Global Permissions - https://ranchermanager.docs.rancher.com/how-to-guides/new-user-guides/authentication-permissions-and-global-configuration/manage-role-based-access-control-rbac/global-permissions
- Rancher: Using API Tokens - https://ranchermanager.docs.rancher.com/v2.13/api/api-tokens
- GitHub Docs: Creating an OAuth app - https://docs.github.com/developers/apps/creating-an-oauth-app
- GitHub Docs: Approving OAuth apps for your organization - https://docs.github.com/en/organizations/managing-oauth-access-to-your-organizations-data/approving-oauth-apps-for-your-organization
- GitHub Docs: REST API endpoints for organizations - https://docs.github.com/en/rest/orgs/orgs
- GitHub Docs: Scopes for OAuth apps - https://docs.github.com/en/developers/apps/scopes-for-oauth-apps
- GitHub Docs: GitHub Enterprise Server REST API endpoint URLs - https://docs.github.com/en/enterprise-server%403.20/rest/enterprise-admin
- Kubernetes: kubectl exec reference - https://kubernetes.io/docs/reference/kubectl/generated/kubectl_exec/
- Kubernetes: kubectl logs reference - https://v1-34.docs.kubernetes.io/docs/reference/kubectl/generated/kubectl_logs/
- Rancher Dashboard source (official): `shell/edit/auth/github.vue`, `shell/components/auth/AllowedPrincipals.vue`, `shell/assets/translations/en-us.yaml`, `shell/store/auth.js` - https://github.com/rancher/dashboard
- Rancher source (official): `pkg/auth/providers/github/*.go` - https://github.com/rancher/rancher

## Issues Found
- The GitHub OAuth app creation path was inaccurate. The post said to start from the organization settings page, but GitHub documents OAuth app creation from `Settings > Developer settings > OAuth Apps`. I corrected the steps accordingly.
- The Rancher Site Access labels and authorized principal structure did not match current Rancher documentation/UI. I updated the access-mode labels to Rancher’s actual wording and changed the example from separate organization/team sections to the single `Authorized Users & Groups` list Rancher uses.
- The post referred to a `Test` button for GitHub auth. Rancher documents this step as `Authenticate with GitHub`, so I corrected the action and step title.
- The GitHub Enterprise Server configuration fields were overstated. Current Rancher UI/source supports selecting a private GitHub Enterprise installation and specifying the host; the post’s extra API URL, TLS toggle, and certificate field were not accurate for this auth provider. I removed those fields and corrected the GitHub Enterprise app creation instructions.
- The GitHub Enterprise connectivity check used `curl -k`, which bypasses certificate validation. I changed it to a TLS-validating request so the check can surface trust problems that would break authentication.
- The session-management command targeted `auth-token-max-ttl-minutes`, which controls API and kubeconfig token limits, not login session length. I corrected it to `auth-user-session-ttl-minutes`, which Rancher documents for user auth sessions.
- The revocation explanation was too absolute. Rancher documents that user/group information can change on logout, session expiry, or group membership refresh/resync, so I updated the wording to reflect that behavior more accurately.
- The troubleshooting row claiming users must be public organization members was inaccurate. GitHub documents organization/team access through `read:org`, and organization approval may also be required when OAuth app restrictions are enabled. I replaced that guidance with membership and app-approval troubleshooting.
- The troubleshooting row for GitHub Enterprise SSL errors implied a Rancher auth-provider UI certificate field. I corrected this to the actual requirement: Rancher must trust the GitHub Enterprise certificate chain.

## Review Notes
- No remaining technical issues were found after the fixes.
- The post remains relevant for the standard Rancher GitHub OAuth provider. Newer Rancher versions also document a separate GitHub App authentication provider, but that is a different setup path and does not invalidate this post.
