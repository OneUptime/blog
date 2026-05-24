# Validation Summary: How to Handle OpenTofu Registry Authentication

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTofu (1.6.2)
- Terraform CLI configuration (`.tofurc` / `.terraformrc`)
- Provider and module registries (`registry.opentofu.org`, `app.terraform.io`, Artifactory)
- HCL configuration language
- Git module sources (SSH and HTTPS)
- S3 and GCS module sources (via go-getter)
- Provider mirrors (filesystem and network)
- GitHub Actions (`opentofu/setup-opentofu@v1`)
- GitLab CI
- HashiCorp Vault (used in credential helper example)
- `.terraform.lock.hcl` lock file

## Sources Consulted
- OpenTofu CLI Configuration docs: https://opentofu.org/docs/cli/config/config-file/
- OpenTofu Credentials Helpers internals: https://opentofu.org/docs/internals/credentials-helpers/
- OpenTofu module sources docs: https://opentofu.org/docs/language/modules/sources/
- Terraform module sources docs: https://developer.hashicorp.com/terraform/language/modules/sources
- go-getter source code (for S3/GCS URL parsing): https://github.com/hashicorp/go-getter
- OpenTofu source code (`internal/command/cliconfig/credentials.go`) for credentials helper prefix

## Issues Found

1. **Incorrect credentials helper executable prefix.** The post claimed the helper could be named `tofu-credentials-<name>` (or `terraform-credentials-<name>`). OpenTofu only supports the `terraform-credentials-` prefix (confirmed via OpenTofu's credentials helpers internals docs and source code constant `credentialsHelperPathPrefix = "terraform-credentials-"`). Fixed to reference only `terraform-credentials-<name>` and updated the script filename comment and `chmod +x` path.

2. **Incorrect credentials helper protocol.** The example helper script read a JSON request from stdin and parsed `.hostname` out of it. The real protocol invokes the helper as `terraform-credentials-NAME <verb> <hostname>` — i.e., the subcommand (`get`, `store`, or `forget`) and hostname come in as command-line arguments. For `get`, JSON credentials are returned on stdout. Rewrote the script to use `$1` for the subcommand and `$2` for the hostname, gated by `if [ "$SUBCOMMAND" = "get" ]`.

3. **Incorrect GCS module source URL.** The example used `gcs::https://storage.googleapis.com/my-modules/...`, but go-getter (which OpenTofu/Terraform use for GCS module sources) requires the URL form `gcs::https://www.googleapis.com/storage/v1/BUCKET/PATH`. The `storage.googleapis.com` host is not parsed correctly by the GCS getter. Fixed the URL.

## Review Notes

- The hostname encoding rules for `TF_TOKEN_*` environment variables (dots → single underscore, hyphens → double underscore) are accurate. The example `TF_TOKEN_my__private__registry_example_com` correctly maps to hostname `my-private-registry.example.com`.
- The `.tofurc` / `.terraformrc` file location and the `credentials "hostname" { token = "..." }` block format are accurate.
- The `provider_installation` block with `filesystem_mirror`, `network_mirror`, and `direct` sub-blocks is valid syntax. Including an explicit `exclude = []` in the `direct` block is redundant (the default is an empty list) but not incorrect.
- The `tofu providers mirror <dir>` output directory layout shown (HOSTNAME/NAMESPACE/TYPE/VERSION.json + zip) is correct for the default packed network-mirror layout.
- The S3 module source URL form `s3::https://bucket.s3.region.amazonaws.com/key` is the post-2019 virtual-hosted-style form and is supported by go-getter.
- The Git-based module source syntax (`git::ssh://...` and `git::https://...?ref=...`) is correct.
- The Artifactory module source example uses the Terraform module registry protocol form (`hostname/namespace/name/provider`) which is the format Artifactory's Terraform registry implements.
- OpenTofu 1.6.2 is dated (released in early 2024). For a 2026 post, a newer version would be more appropriate, but the examples remain valid against current OpenTofu releases — the CLI config, credentials, and provider_installation surfaces have remained backward compatible.
- The `opentofu/setup-opentofu@v1` GitHub Action and `ghcr.io/opentofu/opentofu` container image references are correct.
- The `.terraform.lock.hcl` filename is what OpenTofu uses (kept from Terraform for compatibility), and `tofu providers lock -platform=...` is the correct command to add cross-platform hashes.
