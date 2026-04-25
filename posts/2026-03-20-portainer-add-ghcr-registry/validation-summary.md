# Validation Summary: How to Add GitHub Container Registry (GHCR) to Portainer - A Practical Guide

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer
- GitHub Container Registry (GHCR)
- GitHub Packages
- GitHub Actions
- Docker images
- Docker Compose / Portainer stacks

## Sources Consulted
- GitHub Docs: Working with the Container registry - https://docs.github.com/en/packages/working-with-a-github-packages-registry/working-with-the-container-registry
- GitHub Docs: About permissions for GitHub Packages - https://docs.github.com/en/packages/learn-github-packages/about-permissions-for-github-packages
- GitHub Docs: Configuring a package's access control and visibility - https://docs.github.com/en/packages/learn-github-packages/configuring-a-packages-access-control-and-visibility
- GitHub Docs: Publishing and installing a package with GitHub Actions - https://docs.github.com/en/packages/managing-github-packages-using-github-actions-workflows/publishing-and-installing-a-package-with-github-actions
- GitHub Docs: Managing your personal access tokens - https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/managing-your-personal-access-tokens
- GitHub Docs: Authorizing a personal access token for use with single sign-on - https://docs.github.com/github/authenticating-to-github/authorizing-a-personal-access-token-for-use-with-saml-single-sign-on
- Portainer Docs: Add a custom registry - https://docs.portainer.io/admin/registries/add/custom
- Portainer Docs: Add a GitHub registry - https://docs.portainer.io/admin/registries/add/ghcr
- Portainer Docs: Add a new stack - https://docs.portainer.io/sts/user/docker/stacks/add
- Portainer Docs: Stack webhooks - https://docs.portainer.io/sts/user/docker/stacks/webhooks
- actions/checkout README - https://github.com/actions/checkout
- docker/login-action README - https://github.com/docker/login-action
- docker/metadata-action README - https://github.com/docker/metadata-action
- docker/build-push-action README - https://github.com/docker/build-push-action

## Issues Found
- The post said GHCR images inherit repository visibility by default. GitHub's container registry documentation distinguishes visibility from inherited access permissions: newly published container packages are private by default, and linked repositories affect access permissions, not visibility. I corrected Step 4 to reflect that.
- The workflow examples used older major versions of `actions/checkout`, `docker/login-action`, `docker/metadata-action`, and `docker/build-push-action`. I updated them to the current major versions shown in the official action READMEs at validation time.
- The post implied Portainer webhook-based redeploys were generally available with Portainer CE or BE. Portainer's stack webhook documentation states this functionality is available only in Business Edition and only on non-Edge environments, so I added that caveat in the prerequisites and the workflow example.
- The post said Portainer needs a PAT to pull images in general. For GHCR, public container packages can be pulled anonymously. I corrected the wording so the PAT requirement is scoped to private images.
- The post recommended creating an "organization-level PAT" from organization settings. GitHub PATs are user-owned, not organization-owned. I replaced that with correct guidance: use a PAT owned by a user with package access, and authorize it for the organization when SAML SSO is in use.
- The 403 troubleshooting section did not mention SAML SSO authorization for organization access. I added that because GitHub requires classic PATs to be explicitly authorized for SSO-enabled organizations.

## Review Notes
- The Portainer registry setup itself is technically valid with a custom registry entry using `ghcr.io` and username/PAT authentication.
- The webhook example remains valid as an optional deployment trigger, but it depends on a Portainer stack webhook being configured and on a non-Edge Portainer environment.
- GitHub Packages still requires a personal access token (classic) for registry authentication outside GitHub Actions; fine-grained PATs are not documented as supported for GHCR registry auth.
