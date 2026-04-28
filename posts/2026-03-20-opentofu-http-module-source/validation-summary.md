# Validation Summary: Using HTTP URLs as Module Sources in OpenTofu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTofu (HTTP/HTTPS module sources)
- Terraform (related, since OpenTofu inherits the source-addressing model)
- HCL module syntax
- AWS S3 (pre-signed URLs, archive hosting)
- `.netrc` authentication

## Sources Consulted
- [OpenTofu — Module Sources](https://opentofu.org/docs/language/modules/sources/)
- [OpenTofu — Module Syntax](https://opentofu.org/docs/language/modules/syntax/)
- [OpenTofu — HTTP Backend](https://opentofu.org/docs/language/settings/backends/http/) (to confirm scope of `TF_HTTP_USERNAME` / `TF_HTTP_PASSWORD`)
- [OpenTofu — Environment Variables](https://opentofu.org/docs/cli/config/environment-variables/)
- [OpenTofu issue #1042 — locals/variables in module source](https://github.com/opentofu/opentofu/issues/1042) (confirms variable interpolation in `source` is supported in OpenTofu since 1.8)
- [hashicorp/go-getter — netrc.go](https://github.com/hashicorp/go-getter/blob/main/netrc.go) (confirms `.netrc` and `NETRC` env var are the documented HTTP auth mechanisms for module fetch)

## Issues Found

1. **Incorrect authentication environment variables.** The original post claimed HTTP module sources can be authenticated via `TF_HTTP_USERNAME` and `TF_HTTP_PASSWORD`. Those variables only configure the HTTP **backend** (state storage); the module installer (go-getter) does not read them. The documented mechanisms for HTTP module source auth are a `.netrc` file (with the `NETRC` env var to override location) or URL-embedded credentials. Replaced the example with the correct `.netrc` + `NETRC` workflow.

2. **Misleading checksum claim.** The "With Checksums" section asserted "OpenTofu verifies the checksum if you provide it" for HTTP module sources. There is no such mechanism: the dependency lock file's `h1:` / `zh:` checksums apply to providers, not to module archives fetched from arbitrary HTTP URLs. The example also did not actually show a checksum — it showed a versioned URL. Renamed the section to "Pinning to a Specific Version" and removed the inaccurate comment so the example stands as a pin-to-version recommendation, which matches what the code is actually doing.

3. **Conclusion adjusted.** Removed the trailing "consider pairing with checksums for integrity verification" line, which implied a built-in feature that does not exist for HTTP module sources. Kept the HTTPS recommendation since transport-layer verification *is* in play.

## Review Notes
- Variable interpolation in `module.source` (used in the CI/CD example) is valid in OpenTofu (added in 1.8 via the constant-locals/variables feature). Note that this is **not** valid in stock Terraform, so the post is correctly OpenTofu-specific on that point.
- Supported archive extensions claimed in the post (`zip`, `tar.gz`, `tar.bz2`, `tar.xz`) match the OpenTofu docs (which also accept `tgz`, `tbz2`, `txz` aliases).
- The `tofu-get=1` redirect mechanism for non-archive URLs is not covered in the post; this is acceptable since the post is scoped to direct archive URLs, but readers serving dynamic redirect endpoints would need to consult the docs.
