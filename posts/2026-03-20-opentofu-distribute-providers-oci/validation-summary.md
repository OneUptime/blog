# Validation Summary: How to Distribute Providers via OCI Registries in OpenTofu

## Status
validated

## Post Type
Tutorial / How-to guide

## Technologies Covered
- OpenTofu (CLI configuration, `provider_installation`, `oci_mirror`)
- OCI (Open Container Initiative) registries / OCI Distribution v1.1
- ORAS CLI (`oras push`, `oras manifest index create`, `oras cp`)
- Amazon ECR (and other OCI-compliant registries)
- Go cross-compilation (`GOOS`/`GOARCH`)
- Terraform/OpenTofu provider source addresses and `required_providers`

## Sources Consulted
- OpenTofu OCI Registries overview: https://opentofu.org/docs/cli/oci_registries/
- OpenTofu Provider Mirrors in OCI Registries: https://opentofu.org/docs/cli/oci_registries/provider-mirror/
- OpenTofu CLI configuration file documentation: https://opentofu.org/docs/cli/config/config-file/

## Issues Found

Several technical errors were found and corrected:

1. **`oci_mirror` configuration syntax was wrong.** The post used `url = "oci://..."`, which is not a valid `oci_mirror` argument. The correct argument is `repository_template`, an HCL template that interpolates `${hostname}`, `${namespace}`, and `${type}` from the provider source address. Updated both the generic and ECR examples to use `repository_template = "host/path/${namespace}/${type}"`.

2. **`include` / `exclude` patterns were not fully qualified.** OpenTofu requires provider source addresses with hostname (e.g., `registry.opentofu.org/acme-corp/internal`), not the short form `acme-corp/internal`. Updated both configuration examples accordingly.

3. **Wrong artifact media type.** The post used `application/vnd.opentofu.provider.v1`, which is not the documented type. The correct types are `application/vnd.opentofu.provider-target` for per-platform manifests and `application/vnd.opentofu.provider` for the index manifest. Fixed in the packaging section.

4. **Provider was pushed as a raw binary instead of a zip.** OpenTofu (matching official provider distribution) requires `.zip` packages named `terraform-provider-{TYPE}_{VERSION}_{OS}_{ARCH}.zip`, with media type `archive/zip`, not raw binaries with `application/octet-stream`. Updated the build section to add a `zip` step with the correct naming convention, and updated `oras push` invocations to push the `.zip` files with the `archive/zip` media type.

5. **Workflow was incomplete / non-functional.** A single `oras push` of a binary won't produce an installable OpenTofu provider artifact. The actual workflow stages per-platform manifests in a local OCI layout (`--oci-layout`, `--artifact-platform`), creates an index manifest (`oras manifest index create`), and then copies the index to the remote registry (`oras cp`). Rewrote the "Packaging as an OCI Artifact" section to follow the documented workflow.

6. **Removed the misleading "tag as latest" step.** OpenTofu resolves provider versions via semver tags (e.g., `1.0.0`), not `latest`, so this step was misleading and was dropped during the rewrite.

7. **Tag prefix corrected.** Documentation examples use bare semver tags (`4.0.6`) rather than `v`-prefixed tags (`v1.0.0`); switched the version-management example to match.

## Review Notes

- As of writing, OpenTofu's documentation explicitly states that OCI registries are supported as a *secondary* installation source for providers — not as a *primary* origin registry. The post's framing as a way to distribute internal providers via `oci_mirror` is consistent with this, but readers should be aware that providers still need a logical "source" address (e.g., `acme-corp/internal`) and that `oci_mirror` only redirects how OpenTofu *fetches* the package.
- The `direct { exclude = [...] }` block is a useful pattern to ensure providers matched by `oci_mirror` are not also attempted from the public registry. Kept as-is.
- The `~/.tofurc` filename is correct on Unix-like systems; on Windows the file is `tofu.rc` in `%APPDATA%`. The post does not call this out, but the example is for a Unix path so this is acceptable.
- Authentication via `docker login` / ECR credential helper is correct; OpenTofu reuses Docker/Podman credential stores.
- The benefits list (private access control, air-gapped support, digest pinning, etc.) is accurate for OCI distribution.
