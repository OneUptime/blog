# Validation Summary: How to Pull Providers from OCI Registries with OpenTofu

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTofu CLI configuration
- OpenTofu provider installation and mirrors
- OCI registries / OCI Distribution
- ORAS CLI
- AWS CLI and Amazon ECR
- GitHub Container Registry and GitHub Actions
- HCL
- Bash

## Sources Consulted
- OpenTofu: What's new in OpenTofu 1.10? https://opentofu.org/docs/v1.10/intro/whats-new/
- OpenTofu: CLI Configuration File https://opentofu.org/docs/v1.11/cli/config/config-file/
- OpenTofu: OCI Registry Integrations https://opentofu.org/docs/cli/oci_registries/
- OpenTofu: OCI Registry Credentials https://opentofu.org/docs/cli/oci_registries/credentials/
- OpenTofu: Provider Mirrors in OCI Registries https://opentofu.org/docs/cli/oci_registries/provider-mirror/
- OpenTofu: Command `tofu providers mirror` https://opentofu.org/docs/cli/commands/providers/mirror/
- OpenTofu: Provider Requirements https://opentofu.org/docs/language/providers/requirements/
- ORAS: `oras login` https://oras.land/docs/commands/oras_login
- ORAS: `oras push` https://oras.land/docs/commands/oras_push
- ORAS: `oras cp` https://oras.land/docs/commands/oras_cp
- ORAS: `oras repo tags` https://oras.land/docs/commands/oras_repo_tags/
- ORAS: `oras manifest fetch` https://oras.land/docs/commands/oras_manifest_fetch/
- ORAS: `oras manifest index create` https://oras.land/docs/1.3.0-beta/commands/oras_manifest_index_create/
- AWS CLI: `ecr get-login-password` https://docs.aws.amazon.com/cli/latest/reference/ecr/get-login-password.html
- GitHub Docs: Introduction to GitHub Packages https://docs.github.com/en/packages/guides/about-github-container-registry
- GitHub Docs: About permissions for GitHub Packages https://docs.github.com/en/packages/learn-github-packages/about-permissions-for-github-packages

## Issues Found
- The introduction said OCI provider mirrors were available in OpenTofu `1.8+`. I corrected this to `1.10+` because OpenTofu documents OCI registry support as a 1.10 feature.
- The `oci_mirror` examples used `url = "oci://..."`, which is not the documented configuration shape. I replaced those with `repository_template = "registry/.../${namespace}/${type}"`, which is the supported argument for provider OCI mirrors.
- The CLI config filename examples used `~/.terraform.rc` and `/etc/opentofu/terraform.rc`. I corrected these to documented OpenTofu-compatible filenames such as `~/.tofurc`, `~/.terraformrc`, and `*.tfrc` paths used with `TF_CLI_CONFIG_FILE`.
- The OCI authentication examples incorrectly used `credentials` blocks with `token`. I changed them to documented `oci_credentials` blocks and ambient Docker-style auth examples discovered by OpenTofu.
- The ECR helper example implied OpenTofu would use the Docker credential helper configuration as written. I replaced it with a documented `aws ecr get-login-password | docker login` flow, which OpenTofu can discover via Docker-style auth files.
- The GHCR example used the wrong auth/config syntax and implied a direct OCI provider source. I corrected it to use `oci_credentials`, `repository_template`, and a standard provider source address resolved through the mirror.
- The mirroring script pushed raw zip files with custom media types and a flattened repository name like `hashicorp-aws`. That does not match OpenTofu's documented OCI provider mirror format. I rewrote the script to build platform-specific `application/vnd.opentofu.provider-target` artifacts, create the required `application/vnd.opentofu.provider` image index, and publish to repositories that match `${namespace}/${type}`.
- The verification example looked for a speculative debug string and referenced the wrong repository path. I updated it to verify repository tags and manifests with ORAS and then grep for the configured repository path in `TF_LOG=DEBUG` output.
- The CI example wrote an invalid CLI config file path and used the wrong `oci_mirror` argument. I corrected it to write a temporary `*.tfrc` file, preserve `${namespace}` and `${type}` interpolation for OpenTofu, and export `TF_CLI_CONFIG_FILE` through `$GITHUB_ENV`.
- The conclusion stated that OCI artifacts only needed generic ORAS content-type annotations and that OpenTofu uses Docker credential helpers generically. I corrected this to the documented requirements: `repository_template`, the expected OCI image/index structure, and Docker-style auth discovery or explicit `oci_credentials`.

## Review Notes
- OpenTofu and ORAS were not installed in this review environment, so command validation relied on official command-reference documentation rather than local `--help` output.
- The GitHub Actions example assumes the workflow token has access to the target GHCR package. If the package is stored outside the workflow repository's permitted scope, additional package access configuration or a PAT may still be required.
