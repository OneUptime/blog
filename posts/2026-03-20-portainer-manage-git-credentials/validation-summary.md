# Validation Summary: How to Manage Git Credentials in Portainer Business Edition

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer Business Edition
- Portainer API
- Git
- GitHub personal access tokens
- GitLab personal access tokens
- GitOps stack deployments
- `curl`

## Sources Consulted
- Portainer account settings documentation: https://docs.portainer.io/user/account-settings
- Portainer shared Git credentials documentation: https://docs.portainer.io/admin/settings/credentials/git
- Portainer shared credentials documentation: https://docs.portainer.io/sts/admin/settings/credentials
- Portainer stack deployment from Git documentation: https://docs.portainer.io/sts/user/docker/stacks/add
- Portainer token scope FAQ: https://docs.portainer.io/faqs/getting-started/what-scopes-are-required-for-github-gitlab-and-bitbucket-tokens
- Portainer API documentation index: https://docs.portainer.io/api/docs
- Portainer BE API spec: https://api-docs.portainer.io/versions/ee/2.39.1.yaml
- Portainer API example for JWT authentication: https://docs.portainer.io/admin/environments/add/api
- GitHub personal access token documentation: https://docs.github.com/authentication/keeping-your-account-and-data-secure/creating-a-personal-access-token
- GitLab personal access token documentation: https://docs.gitlab.com/user/profile/personal_access_tokens/

## Issues Found
- The post described Git authentication types as username/PAT, username/password, and SSH key. Current Portainer documentation and source use Basic and Token authorization types for Git repository access, and the post was corrected to match that model.
- The GitHub PAT section pointed readers to fine-grained tokens and `Contents: Read`. The post was corrected to a classic PAT flow with `repo` scope for private repository access, which matches GitHub's documented HTTPS Git usage and avoids overstating Portainer support for fine-grained tokens.
- The GitLab PAT navigation path was outdated. It was updated to the current GitLab profile path: `Edit profile` → `Access` → `Personal access tokens`.
- The Portainer UI path for saved credentials was inaccurate. The post now distinguishes personal credentials under `My account` → `Git credentials` from shared credentials under `Settings` → `Shared credentials`.
- The saved-credential creation example omitted the authorization type field. The example was updated to include `Authorization type: Basic`, matching current Portainer Git deployment docs for GitHub-style HTTPS authentication.
- The stack deployment steps referred to `Use saved credentials`, which is not the current Portainer UI wording. The post was updated to use the current `Authentication` toggle and `Git Credentials` selector flow.
- The API examples used `/api/gitcredentials`, which does not match the current documented Portainer BE API. They were corrected to the per-user saved-credential endpoints under `/api/users/{id}/gitcredentials`, with a preceding `/api/users/me` call to obtain the current user ID.
- The shared-credential visibility section incorrectly said shared credentials are visible to admins and team members. Current Portainer docs state shared Git credentials are available to admin-level users, and currently only administrators can select shared Git credentials during deployment. The table and explanation were corrected.
- The security guidance recommended fine-grained PATs generically. Because current Portainer documentation for Git providers is provider-specific and not consistently aligned on fine-grained support, the guidance was corrected to recommend the minimum scopes or permissions required by the provider and Portainer.

## Review Notes
- Portainer's current official documentation is internally inconsistent on API authentication: some docs emphasize per-user access tokens in the `X-API-Key` header, while the API spec and Portainer API examples also document JWT bearer authentication via `/api/auth`. The post's API examples were left on the documented JWT bearer flow because it remains officially documented and compatible with the corrected endpoints.
- Portainer's current token-scope FAQ for GitHub is also internally inconsistent: it lists `repo` for classic tokens, but later adds a note about classic-token requirements that appears to reflect registry access wording. The post was adjusted to avoid relying on GitHub fine-grained token instructions that may not hold across Portainer flows.
