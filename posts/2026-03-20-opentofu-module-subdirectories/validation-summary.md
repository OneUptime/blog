# Validation Summary: Using Module Package Subdirectories in OpenTofu

## Status
validated

## Post Type
Tutorial / Reference guide

## Technologies Covered
- OpenTofu (and Terraform-compatible module source syntax)
- HCL (HashiCorp Configuration Language)
- Git module sources (`git::` prefix, `?ref=` selectors)
- GitHub shorthand module sources
- S3 archive module sources
- Public Module Registry (e.g. `terraform-aws-modules/s3-bucket/aws`)

## Sources Consulted
- OpenTofu module sources documentation: https://opentofu.org/docs/language/modules/sources/
- OpenTofu module sub-directories section: https://opentofu.org/docs/language/modules/sources/#modules-in-package-sub-directories
- OpenTofu generic git repository module sources: https://opentofu.org/docs/language/modules/sources/#generic-git-repository

## Issues Found
1. **Local Path with Subdirectory section was technically incorrect.**
   - The original section claimed local paths support `//` subdirectory traversal with the example `source = "./platform//application/web"`. Per the OpenTofu documentation, the `//` syntax applies only to *packages* (version-control repositories, archive files, registry modules) — local paths are not packages, and the entire local path is treated as the module itself.
   - Fix: Renamed the section to "Local Paths Are Not Packages", explained that `//` does not apply, and updated the example to use a regular relative path (`./platform/application/web`).
2. **Conclusion referenced "local directory structure" as a use case for `//`.**
   - This was inconsistent with the corrected behavior above.
   - Fix: Replaced "or a local directory structure" with "or a registry module with submodules" so the conclusion accurately reflects sources that actually support the `//` syntax.

## Review Notes
- All other code examples were verified to be correct: `git::https://...` URLs, `?ref=` selectors for tags/branches/commit SHAs, GitHub shorthand (`github.com/org/repo//path`), S3 archive references (`s3::https://...zip//path`), and registry submodule references (`namespace/name/provider//modules/<submodule>`).
- The note that the sub-directory portion must come before the `?ref=` query argument is implicit in the examples and matches the OpenTofu docs; readers may benefit from a future explicit callout.
- The example using a branch ref (`?ref=feature/new-vpc`) is technically valid (any value accepted by `git checkout` works), and the post correctly flags that branches are not recommended for production.
- The `terraform-aws-modules/s3-bucket/aws` registry example uses `version = "~> 3.0"`; that module has progressed well beyond v3 in the public registry, but the example is illustrative rather than prescriptive, so no change was made. Readers should consult the registry for the current major version.
