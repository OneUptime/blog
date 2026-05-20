# Validation Summary: How to Configure Dex Connector for GitHub Organization in ArgoCD

## Status
validated

## Post Type
Tutorial / configuration guide

## Technologies Covered
- Argo CD
- Dex
- GitHub OAuth Apps
- GitHub organizations and teams
- Kubernetes ConfigMaps and kubectl
- Argo CD RBAC
- Argo CD CLI

## Sources Consulted
- Dex GitHub connector documentation: https://dexidp.io/docs/connectors/github/
- Dex connectors overview: https://dexidp.io/docs/connectors/
- Argo CD user management / Dex documentation: https://argo-cd.readthedocs.io/en/latest/operator-manual/user-management/
- Argo CD RBAC documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/rbac/
- Argo CD account command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_account/
- Argo CD account get-user-info command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_account_get-user-info/
- Argo CD account delete-token command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_account_delete-token/
- Argo CD login command reference: https://argo-cd.readthedocs.io/en/release-2.10/user-guide/commands/argocd_login/
- GitHub Docs, creating an OAuth app: https://docs.github.com/en/developers/apps/creating-an-oauth-app
- GitHub Docs, scopes for OAuth apps: https://docs.github.com/en/developers/apps/scopes-for-oauth-apps

## Issues Found
- The post used `loadAllGroups: true` together with `orgs`. Dex documents `loadAllGroups` as only working when neither `org` nor `orgs` is configured, so I replaced those examples with `teamNameField: slug` and corrected the explanation to use `orgs` / `orgs.teams` for organization-restricted access.
- The post said `loadAllGroups` controls whether Dex fetches all teams or only listed teams. Dex documentation says `orgs.teams` controls returned team claims for configured organizations; I updated Step 6 accordingly.
- The post described team groups as `organization:team-slug` but did not configure slug-based team names. Dex defaults to team names unless `teamNameField: slug` is set, so I added `teamNameField: slug` to the relevant connector examples.
- The `argocd account delete-token --account <username>` command was incomplete. The official command requires a token ID argument, and this applies to generated Argo CD account tokens, so I updated the example to `argocd account delete-token --account <account-name> <token-id>`.
- The troubleshooting guidance said to verify `loadAllGroups: true` and that the OAuth app has `read:org`. I corrected this to verify `orgs.teams` filtering and the user's OAuth authorization / organization approval for `read:org`.
- The rate-limit guidance suggested using a GitHub App instead of an OAuth App. Dex's GitHub connector is documented around GitHub OAuth, so I removed that unsupported recommendation.
- The self-signed certificate note referenced an LDAP guide without giving applicable Dex GitHub instructions. I changed it to the concrete requirement: mount the CA so the configured `rootCA` path exists in the Dex container.

## Review Notes
The Argo CD documentation notes that `redirectURI` does not need to be set in Argo CD Dex connector configuration because Argo CD automatically uses the correct callback URL. The value shown in the post is still the correct callback URL, so no change was required.
