# Validation Summary: How to Use the file Function in OpenTofu

## Status
validated

## Post Type
Tutorial / Reference guide

## Technologies Covered
- OpenTofu (HCL `file` function)
- Terraform (sister tool with same function)
- AWS provider (aws_key_pair, aws_iam_policy, aws_instance)
- Kubernetes provider (kubernetes_manifest, kubernetes_config_map)

## Sources Consulted
- OpenTofu official docs — `file` function: https://opentofu.org/docs/language/functions/file/
- OpenTofu docs — `templatefile`, `filebase64`, `fileexists`, `chomp` (referenced functions)
- OpenTofu docs — `path.module` reference

## Issues Found
1. **UTF-8 wording in Common Pitfalls section** — The original text said "File paths must be UTF-8 encoded; binary files should use `filebase64`." This is incorrect: per OpenTofu docs, it is the file *contents* (not the path) that must be valid UTF-8. Updated to "File contents must be valid UTF-8; binary files should use `filebase64`."
2. **Timing claim "File is read at plan time, not apply time"** — This is misleading. Per OpenTofu docs, the file must already exist on disk at the beginning of an OpenTofu run, and the function is evaluated whenever configuration is processed (including apply). It cannot be used to read files generated dynamically during the run. Updated to reflect this.
3. **"Missing files cause an error at plan time"** — Adjusted to "during evaluation" for consistency with the corrected timing wording above.

## Review Notes
- All code examples (HCL syntax, `aws_*` resources, `kubernetes_*` resources, `yamldecode(file(...))`, `chomp(file(...))`) are syntactically correct and reflect current provider APIs.
- The `tofu console` command and the `file vs templatefile` comparison are accurate.
- The use of `${path.module}/...` for portability is the recommended pattern.
- No version-specific caveats; the `file` function has been stable since the earliest releases of Terraform and is unchanged in OpenTofu.
