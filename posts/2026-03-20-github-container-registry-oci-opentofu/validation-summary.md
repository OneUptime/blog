# Validation Summary: How to Use GitHub Container Registry as OCI Registry for OpenTofu

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTofu
- GitHub Container Registry (GHCR)
- GitHub Actions
- ORAS
- OCI registries
- Bash
- YAML
- HCL

## Sources Consulted
- OpenTofu: What's new in OpenTofu 1.10? https://opentofu.org/docs/v1.10/intro/whats-new/
- OpenTofu: OCI Registry Integrations https://opentofu.org/docs/cli/oci_registries/
- OpenTofu: Provider Mirrors in OCI Registries https://opentofu.org/docs/cli/oci_registries/provider-mirror/
- OpenTofu: OCI Registry Credentials https://opentofu.org/docs/cli/oci_registries/credentials/
- OpenTofu: CLI Configuration File https://opentofu.org/docs/v1.11/cli/config/config-file/
- OpenTofu: Command: providers mirror https://opentofu.org/docs/cli/commands/providers/mirror/
- GitHub Docs: Working with the Container registry https://docs.github.com/en/packages/working-with-a-github-packages-registry/working-with-the-container-registry
- GitHub Docs: Publishing and installing a package with GitHub Actions https://docs.github.com/en/packages/managing-github-packages-using-github-actions-workflows/publishing-and-installing-a-package-with-github-actions
- GitHub Docs: Configuring a package's access control and visibility https://docs.github.com/en/packages/learn-github-packages/configuring-a-packages-access-control-and-visibility
- GitHub Docs: GITHUB_TOKEN https://docs.github.com/en/actions/concepts/security/github_token
- ORAS: Installation https://oras.land/docs/installation/

## Issues Found
- The introduction and authentication section claimed GHCR supported fine-grained PAT authentication and OIDC-based authentication for this workflow. GitHub’s current container registry docs document personal access tokens (classic) and `GITHUB_TOKEN` for Actions, so I removed the fine-grained PAT and OIDC claims and clarified the `packages: write` requirement for workflows.
- The package visibility section said packages inherit repository visibility by default. GitHub documents that linked packages can inherit repository access permissions, but not visibility, and container packages default to private. I corrected that behavior and removed the unsupported visibility API example.
- The provider publishing examples pushed ZIPs directly to GHCR with custom media types and `SHA256SUMS`. OpenTofu’s OCI mirror documentation requires an OCI image layout with platform-specific manifests, an index manifest with `application/vnd.opentofu.provider`, and then a copy to the remote registry. I rewrote the shell and workflow examples to use `oras push`, `oras manifest index create`, and `oras cp` in the documented sequence.
- The GHCR repository layout in the examples used a flat `${namespace}-${type}` package name. OpenTofu’s `repository_template` model expects repository paths that preserve `${namespace}/${type}`, so I updated the pushed artifact paths and the `oci_mirror` configuration to match.
- The OpenTofu configuration snippet used `credentials` with `token` and an `oci_mirror` `url` field. Current OpenTofu docs use `.tofurc`, `oci_credentials` for OCI auth, and `repository_template` for OCI provider mirrors. I corrected those fields.
- The workflows installed ORAS `v1.1.0`, but OpenTofu’s provider mirror documentation relies on ORAS features first released in `v1.3.0`. I updated the install steps accordingly.
- The GitHub Actions example used OpenTofu `1.7.0` even though OpenTofu’s OCI registry support was introduced in `1.10`. I updated the example to a current compatible release.

## Review Notes
- The description mentions both providers and modules, but the post content remains provider-focused. That is not technically incorrect, though a future revision could add a GHCR module example for fuller coverage.
- The workspace did not have `tofu` or `oras` installed, so verification was documentation-based rather than by local execution.
