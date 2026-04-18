# Validation Summary: How to Troubleshoot Module Download Failures in OpenTofu

## Status
validated

## Post Type
Troubleshooting guide / Tutorial

## Technologies Covered
- OpenTofu (`tofu init`, `tofu get`)
- Git (SSH and HTTPS module sources, `git ls-remote`, `git config url.insteadOf`)
- GitHub Actions (webfactory/ssh-agent)
- OpenTofu public registry API
- HCL module source syntax (git::, double-slash subdirectory, ?ref=)
- `TF_LOG` environment variable

## Sources Consulted
- OpenTofu CLI `init` docs — https://opentofu.org/docs/cli/init/
- OpenTofu `get` command — https://opentofu.org/docs/cli/commands/get/
- OpenTofu Module Sources — https://opentofu.org/docs/language/modules/sources/
- OpenTofu Module Registry Protocol — https://opentofu.org/docs/internals/module-registry-protocol/
- OpenTofu Environment Variables (TF_LOG) — https://opentofu.org/docs/cli/config/environment-variables/
- Git documentation on `url.<base>.insteadOf` config
- webfactory/ssh-agent GitHub Action (v0.9.0 is published)

## Issues Found
1. In the "Caching and Cleanup" section, the command `tofu init -reconfigure` was paired with the comment "Force re-download without upgrading provider versions." This is inaccurate: `-reconfigure` only reconfigures the backend and does not force modules to be re-downloaded. Replaced with `tofu get -update`, which is the correct command to re-fetch modules per their version constraints without touching providers.

## Review Notes
- The Git source syntax with `git::`, `//` for subdirectory, and `?ref=` is correct and matches OpenTofu's module source documentation.
- The OpenTofu registry API endpoint format (`/v1/modules/{namespace}/{name}/{system}/versions`) is correct.
- `.terraform/modules/` is the correct local cache path; deleting and re-running `tofu init` is a valid recovery path.
- `git config --global url."https://oauth2:TOKEN@github.com".insteadOf "https://github.com"` is the standard token-injection pattern and works for both GitHub and GitLab.
- `TF_LOG=DEBUG` is honored by OpenTofu; `TRACE` is also available for higher verbosity.
- The error message strings are plausible but vary slightly across OpenTofu versions; they are illustrative rather than verbatim and that is acceptable for a troubleshooting guide.
