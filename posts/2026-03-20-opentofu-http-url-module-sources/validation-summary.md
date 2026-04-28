# Validation Summary: How to Use HTTP URL Module Sources in OpenTofu - Url

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTofu (HTTP/HTTPS module sources)
- Terraform (compatible module source syntax)
- HCL configuration language
- `.netrc` HTTP authentication
- JFrog Artifactory / Sonatype Nexus (referenced as use cases)

## Sources Consulted
- OpenTofu Module Sources documentation: https://opentofu.org/docs/language/modules/sources/ (specifically the HTTP URLs section)
- OpenTofu CLI Configuration documentation: https://opentofu.org/docs/cli/config/config-file/
- OpenTofu `tofu init` command documentation: https://opentofu.org/docs/cli/commands/init/

## Issues Found
1. **Incorrect authentication mechanism.** The original post claimed HTTP module source authentication is configured with a `credentials` block in `.terraformrc`/`.tofurc`. Per the official OpenTofu docs, `credentials` blocks are reserved for OpenTofu-specific protocols (Registry / OCI), and HTTP/HTTPS module URL authentication is performed via a `.netrc` file (with the `NETRC` env var to override its location). I rewrote the "Adding Authentication" section to use the correct `.netrc` format and updated the "HTTP vs Other Module Sources" table row from "HTTP headers" to "HTTP Basic via `.netrc`".
2. **Incorrect caching claim.** The original "Important Notes" section stated "OpenTofu re-downloads the archive on every `tofu init`." Per the official docs, `tofu init` caches modules in `.terraform/modules` and does not change already-installed modules; `tofu init -upgrade` is required to force a fresh download. Reworded the bullet to reflect this caching behavior while preserving the author's recommendation to embed versions in the URL.

## Review Notes
- Supported archive extensions (`.zip`, `.tar.gz`, `.tar.bz2`, `.tar.xz`) are correct. The docs also list the short aliases `tgz`, `tbz2`, `txz` and a `?archive=zip` override for non-standard URLs — these were not added since the post's list is not wrong, just non-exhaustive.
- The `//subdirectory` package syntax description is accurate.
- The post does not mention OpenTofu's redirect behavior (the `tofu-get=1` GET request and `X-Terraform-Get` / `<meta name="tofu-get">` discovery for non-archive HTTP URLs). This is out of scope for an "archive URL" focused post and was left as-is.
- Heading retains the author's odd "- Url" suffix; not a technical issue, so left unchanged.
