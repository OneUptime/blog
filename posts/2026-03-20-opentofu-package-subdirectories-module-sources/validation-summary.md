# Validation Summary: How to Use Package Sub-Directories in Module Sources in OpenTofu

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- OpenTofu (module sources)
- Terraform (compatible module source syntax)
- HCL (HashiCorp Configuration Language)
- Git / GitHub module sources
- HTTP/HTTPS archive (ZIP) module sources
- S3 module sources

## Sources Consulted
- OpenTofu official documentation – Module Sources: https://opentofu.org/docs/language/modules/sources/
- OpenTofu documentation on the double-slash (`//`) "Modules in Package Sub-Directories" syntax
- go-getter source detection behavior (as used by OpenTofu/Terraform for module sources)

## Issues Found
- **Contradictory wording in "Important Notes" (line 128)**: The original sentence read "The `//` separator must appear *after* any query parameters separator in Git URLs: use `?ref=tag` after `//`, not before." The first half stated the opposite of the second half (and contradicted every example in the post). Per the official docs, the sub-directory `//path` must appear **before** the `?ref=` query string. Updated the first half to read "must appear before any query parameters" so it is consistent with the (correct) second half and with the examples shown.

## Review Notes
- All `source` examples (Git, GitHub shorthand, HTTPS ZIP archive, S3, nested sub-directories, monorepo with `locals`) match the canonical syntax documented by OpenTofu: `<package>//<subdir>?<query>`.
- The claim that OpenTofu downloads the entire package and only uses the sub-directory is consistent with the official documentation ("OpenTofu will still extract the entire package to local disk, but will read the module from the subdirectory").
- The S3 source example uses the legacy global path-style endpoint (`s3.amazonaws.com/bucket/key`); this remains supported by go-getter, but readers using newer S3 regions/endpoints may prefer regional virtual-hosted-style URLs. This is a stylistic note only and not a correctness issue.
- The HTTPS ZIP archive example relies on go-getter's automatic archive detection from the `.zip` extension, which is the documented default behavior and works without an explicit `archive=zip` query parameter.
