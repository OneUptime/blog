# Validation Summary: How to Pull Modules from OCI Registries with OpenTofu

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTofu modules
- OCI registries
- ORAS CLI
- Docker CLI authentication
- GitHub Container Registry (GHCR)
- GitHub Actions
- Amazon ECR
- Azure Container Registry

## Sources Consulted
- OpenTofu docs: What's new in OpenTofu 1.10? https://opentofu.org/docs/v1.10/intro/whats-new/
- OpenTofu docs: Module Packages in OCI Registries https://opentofu.org/docs/cli/oci_registries/module-package/
- OpenTofu docs: OCI Registry Credentials https://opentofu.org/docs/cli/oci_registries/credentials/
- OpenTofu docs: CLI Configuration File https://opentofu.org/docs/v1.11/cli/config/config-file/
- OpenTofu docs: Initializing Working Directories https://opentofu.org/docs/cli/init/
- ORAS docs: `oras manifest fetch` https://oras.land/docs/commands/oras_manifest_fetch/
- ORAS docs: `oras repo tags` https://oras.land/docs/commands/oras_repo_tags/
- ORAS docs: `oras pull` https://oras.land/docs/commands/oras_pull/
- GitHub Docs: Working with the Container registry https://docs.github.com/en/packages/working-with-a-github-packages-registry/working-with-the-container-registry
- GitHub Docs: Use `GITHUB_TOKEN` for authentication in workflows https://docs.github.com/en/actions/how-tos/security-for-github-actions/security-guides/automatic-token-authentication
- GitHub `actions/checkout` README https://github.com/actions/checkout
- `opentofu/setup-opentofu` README https://github.com/opentofu/setup-opentofu
- AWS CLI docs: `aws ecr get-login-password` https://docs.aws.amazon.com/cli/latest/reference/ecr/get-login-password.html
- Azure CLI docs: `az acr login` https://learn.microsoft.com/en-us/cli/azure/acr?view=azure-cli-latest#az-acr-login
- Docker docs: `docker login` https://docs.docker.com/reference/cli/docker/login/

## Issues Found
- The post said OCI module support started in OpenTofu 1.8+ and referred to an `oci::` prefix. OpenTofu introduced OCI module source support in 1.10, and the source address uses `oci://`. I corrected the description, introduction, and related wording.
- The module source examples used Docker-style `:tag` and `@sha256:...` selectors. OpenTofu OCI module sources use query arguments such as `?tag=1.2.0` and `?digest=sha256:...`. I updated every OCI module source example to the documented syntax.
- The OCI authentication config example used a `credentials` block in `~/.terraform.rc`. OCI registries use `oci_credentials` in the OpenTofu CLI config file (`~/.tofurc` or backward-compatible `~/.terraformrc`). I replaced the snippet with the correct block type and filename guidance.
- The GHCR shell examples mixed local shell usage with GitHub Actions-specific environment names (`GITHUB_TOKEN`, `GITHUB_ACTOR`). For local GHCR access, GitHub documents personal access token (classic) auth. I updated the example to use a PAT-style token variable and a username, while keeping the workflow example separate.
- The module inspection example tried to list a `.tgz` archive with `tar -tzf`. OpenTofu module packages in OCI registries are stored as a single `archive/zip` layer. I changed the example to inspect the pulled `.zip` file with `unzip -l`.
- The GitHub Actions workflow set only `packages: read` even though it also uses `actions/checkout`, which recommends `contents: read`. I added `contents: read`.
- The workflow used `opentofu/setup-opentofu@v1`. The current upstream README uses `@v2`, so I updated the example accordingly.

## Review Notes
- The cache-key example hashes only `**/*.tf`. Repositories that use `.tofu`, `.tf.json`, or `.tofu.json` may want to broaden that pattern in a future revision.
- The post correctly recommends explicit tags or digests. OpenTofu defaults OCI module sources without either query argument to the `latest` tag, but explicit references are the safer guidance for reproducible automation.
