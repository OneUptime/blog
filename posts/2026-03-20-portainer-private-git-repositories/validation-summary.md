# Validation Summary: How to Use Private Git Repositories with Portainer

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer
- GitOps
- Docker Compose
- GitHub personal access tokens
- GitLab project access tokens
- HTTPS Git authentication
- Portainer API

## Sources Consulted
- Portainer Docs: Add a new stack — https://docs.portainer.io/sts/user/docker/stacks/add
- Portainer Docs: Add Git credentials — https://docs.portainer.io/admin/settings/credentials/git
- Portainer Docs: Shared credentials — https://docs.portainer.io/sts/admin/settings/credentials
- Portainer Docs: Accessing the Portainer API — https://docs.portainer.io/2.21/api/access
- Portainer API spec (CE 2.39.1) — https://api-docs.portainer.io/?edition=ce&version=2.39.1
- Portainer FAQ: Bitbucket GitOps authentication — https://docs.portainer.io/sts/faqs/troubleshooting/stacks-deployments-and-updates/how-do-i-configure-portainers-gitops-features-to-authenticate-to-a-bitbucket-repository
- Portainer Docs: Add SSH credentials — https://docs.portainer.io/admin/settings/credentials/ssh
- GitHub Docs: Managing your personal access tokens — https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/managing-your-personal-access-tokens
- GitHub Docs: Using a personal access token on the command line — https://docs.github.com/authentication/keeping-your-account-and-data-secure/creating-a-personal-access-token
- GitLab Docs: Project access tokens — https://docs.gitlab.com/user/project/settings/project_access_tokens/
- GitLab Docs: Personal access tokens — https://docs.gitlab.com/user/profile/personal_access_tokens/
- Portainer source: stack create handler — https://github.com/portainer/portainer/blob/develop/api/http/handler/stacks/create_compose_stack.go
- Portainer source: Git auth UI fieldset — https://github.com/portainer/portainer/blob/develop/app/react/portainer/gitops/AuthFieldset/CredentialsSection.tsx

## Issues Found
- The post claimed Portainer supports SSH key authentication and `git@host` SSH URLs for Git-based stack deployments. I removed that section because Portainer currently documents Git stack authentication over HTTPS, not SSH-key Git auth for stacks.
- The Portainer UI instructions used `Username/Password` and suggested `x-token` / `oauth2` style usernames. I corrected this to Portainer’s documented Git auth flow: enable authentication, use Basic auth when that option is shown, and provide a username plus personal access token.
- The Portainer API example used incorrect request field names such as `filePathInRepository` and lowercase payload keys. I updated the example to the documented stack-create payload fields: `Name`, `RepositoryURL`, `RepositoryReferenceName`, `ComposeFile`, `RepositoryAuthentication`, `RepositoryUsername`, `RepositoryPassword`, and `Env`.
- The API example used a generic bearer token header. I updated it to Portainer’s documented API-key flow with `X-API-Key`.
- The self-signed certificate section claimed there was a CA certificate option for Git stack sources. I corrected this to the documented `Skip TLS verification` option for Git-based stack deployment.
- The security section referred to PATs as deploy keys and used the invalid GitHub scope name `repo:read`. I corrected the guidance to read-only access tokens with minimal repository read permissions, and clarified that classic GitHub PATs use `repo` for private repositories.
- The stored-credentials section pointed to `Settings → Credentials`. I corrected this to `Settings → Shared credentials`.

## Review Notes
- GitHub currently recommends fine-grained personal access tokens over classic PATs whenever possible.
- On GitLab.com, project access tokens require Premium or Ultimate. Personal access tokens remain a valid alternative for Git over HTTPS.
- Portainer’s OpenAPI spec currently lists both API key and JWT auth for the stack-create endpoint, but the official API-access docs emphasize user API keys via `X-API-Key`.
