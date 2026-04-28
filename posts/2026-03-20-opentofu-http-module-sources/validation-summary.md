# Validation Summary: How to Use HTTP URL Module Sources in OpenTofu

## Status
validated

## Post Type
Tutorial / Reference guide

## Technologies Covered
- OpenTofu (HTTP/HTTPS module sources)
- Terraform-compatible module source syntax (go-getter)
- HCL configuration language
- Common archive formats: zip, tar.gz, tar.bz2, tar.xz
- Bash / curl / zip CLI utilities
- Artifact repositories (Nexus, Artifactory, GitHub release assets)

## Sources Consulted
- OpenTofu module sources documentation: https://opentofu.org/docs/language/modules/sources/
- OpenTofu HTTP URLs section (recognized archive extensions, `archive` argument, X-Terraform-Get redirect header, `.netrc` authentication, `NETRC` environment variable)

## Issues Found
- The "Authentication" section's "Environment Variables" subsection incorrectly claimed that OpenTofu uses "the standard HTTP proxy and authentication environment variables" while only showing proxy variables (HTTP_PROXY / HTTPS_PROXY). Per the official OpenTofu docs, HTTP/HTTPS authentication for module sources is configured via a `.netrc` file (location overridable with the `NETRC` environment variable), not via env vars. Fixed by:
  - Adding a brief `.netrc File` subsection that documents the OpenTofu-recommended authentication mechanism with a sample `.netrc` entry.
  - Updating the Environment Variables blurb to accurately describe the variables shown as proxy variables only (removing the inaccurate "and authentication" wording).

## Review Notes
- The HCL `module` block syntax, `//subdir` archive subdirectory syntax, supported archive extensions (zip, tar.gz, tar.bz2, tar.xz), the `tofu init` command, the GitHub release-asset URL pattern, and the comparison table with Git sources are all accurate.
- The `archive=` query-string argument (used to force archive interpretation when the URL lacks a recognized extension) is documented by OpenTofu but not covered in the post; this is an omission, not an error.
- The "TLS Certificate Verification" subsection is essentially an empty placeholder that shows an unrelated `provider "aws"` block with a comment but no actual TLS-related configuration. It is not technically incorrect (it does not make false claims), so it was left untouched per the "only fix technical errors" rule, but it could be expanded or removed in a future revision.
- "Basic Auth via URL" embedding credentials in the URL is not explicitly documented by OpenTofu, but standard HTTP semantics support it and the post correctly flags it as not recommended for sensitive credentials.
