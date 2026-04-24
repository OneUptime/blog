# Validation Summary: How to Configure GitHub OAuth with Portainer - A Practical Guide

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Portainer
- GitHub OAuth Apps
- GitHub Enterprise Server
- OAuth 2.0
- GitHub REST API
- Portainer API
- `curl`
- JSON

## Sources Consulted
- Portainer authentication / OAuth documentation: https://docs.portainer.io/admin/settings/authentication/oauth
- Portainer API documentation: https://docs.portainer.io/api/docs
- Portainer CE 2.39.1 OpenAPI spec: https://api-docs.portainer.io/versions/ce/2.39.1.yaml
- Portainer CLI configuration options: https://docs.portainer.io/sts/advanced
- Portainer release notes (`--trusted-origins` / reverse-proxy guidance): https://docs.portainer.io/release-notes?fallback=true
- GitHub Docs, creating an OAuth app: https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/creating-an-oauth-app
- GitHub Docs, authorizing OAuth apps: https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/authorizing-oauth-apps
- GitHub Docs, scopes for OAuth apps: https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/scopes-for-oauth-apps
- GitHub Docs, REST API users endpoints: https://docs.github.com/en/rest/users/users
- GitHub Docs, REST API emails endpoints: https://docs.github.com/en/rest/users/emails
- GitHub Docs, about OAuth app access restrictions: https://docs.github.com/en/organizations/managing-oauth-access-to-your-organizations-data/about-oauth-app-access-restrictions
- GitHub Docs, enabling OAuth app access restrictions: https://docs.github.com/en/organizations/managing-oauth-access-to-your-organizations-data/enabling-oauth-app-access-restrictions-for-your-organization
- GitHub Docs, approving OAuth apps for your organization: https://docs.github.com/en/organizations/managing-oauth-access-to-your-organizations-data/approving-oauth-apps-for-your-organization
- GitHub Enterprise Server Docs, creating an OAuth app: https://docs.github.com/en/enterprise-server%403.20/apps/oauth-apps/building-oauth-apps/creating-an-oauth-app
- GitHub Enterprise Server Docs, authorizing OAuth apps: https://docs.github.com/en/enterprise-server%403.20/apps/oauth-apps/building-oauth-apps/authorizing-oauth-apps

## Issues Found
- The post said GitHub uses a "non-standard OAuth flow." GitHub documents OAuth Apps as standard OAuth 2.0 authorization-code flow, distinct from OIDC. I corrected that wording.
- The Portainer UI instructions implied you manually fill every GitHub field in the standard GitHub provider flow. Portainer documents GitHub as a preconfigured provider where Client ID and Client secret are the primary required inputs, with advanced fields available only when overriding defaults. I corrected the step to reflect that behavior.
- The example scopes (`user:email read:org`) were presented as the standard GitHub setup. For the documented `https://api.github.com/user` resource and `login` identifier, those scopes are not the right default example. I replaced them with a valid GitHub scope (`read:user`) and clarified that `email` only works when the user has a public email address.
- The API example used the lowercase object key `oauthsettings`. Portainer’s current OpenAPI schema and handler expect the canonical `OAuthSettings` field name. I corrected the payload example and aligned the scopes there as well.
- The organization-restriction section referenced nonexistent `allow_organizations` / `allowed_organizations` authorization parameters. GitHub’s documented OAuth authorize parameters do not include either parameter. I removed that guidance.
- The post claimed GitHub org-level OAuth app restrictions are the way to restrict Portainer sign-ins to org members. GitHub documents those controls as restrictions on the app’s access to organization resources, not as a direct sign-in gate for Portainer. I corrected that explanation and updated the menu path to GitHub’s current `OAuth app policy` UI.
- The GitHub Enterprise registration note referred readers to the instance admin panel. GitHub Enterprise Server documents OAuth app registration under a personal account or an organization you administer, so I corrected that guidance.
- The manual verification command used `Authorization: token ...` and omitted GitHub’s current recommended REST headers. I updated it to `Authorization: Bearer ...` and added the current recommended `Accept` and `X-GitHub-Api-Version` headers.
- The troubleshooting section said missing `--trusted-origins` causes a 404 after login. Portainer documents `--trusted-origins` for reverse-proxy `"Origin invalid"` / CSRF-style failures, not a generic 404. I corrected that troubleshooting note.

## Review Notes
- Portainer’s GitHub provider prepopulates the GitHub.com endpoints. For GitHub Enterprise Server, the post should use Portainer’s override/default-configuration path, which is now reflected by the corrected endpoint section.
- GitHub OAuth app access restrictions are useful for protecting organization resources, but they should not be described as equivalent to org-membership-based authorization for Portainer itself.
