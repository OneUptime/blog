# Validation Summary: How to Use Filesystem Functions in OpenTofu

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- OpenTofu / Terraform (HCL)
- OpenTofu filesystem functions: `abspath`, `basename`, `dirname`, `file`, `filebase64`, `fileexists`, `fileset`, `pathexpand`
- File hashing helpers referenced: `filebase64sha256`, `filemd5`
- AWS provider resources: `aws_key_pair`, `aws_instance`, `aws_iam_role_policy`, `aws_lambda_function`, `aws_s3_object`

## Sources Consulted
- OpenTofu Language Functions documentation: https://opentofu.org/docs/language/functions/
  - `abspath`, `basename`, `dirname`, `file`, `filebase64`, `fileexists`, `fileset`, `pathexpand`, `filebase64sha256`, `filemd5`
- Terraform Configuration Language Functions: https://developer.hashicorp.com/terraform/language/functions
- HashiCorp AWS Provider docs for `aws_s3_object` (current name; `aws_s3_bucket_object` is deprecated since AWS provider v4.0)
- Go stdlib `path.Base` semantics (used by HCL `basename`) — confirms trailing slashes are stripped

## Issues Found
No technical issues found.

Verified specifically:
- `basename("path/to/module/")` does return `"module"` — trailing slashes are stripped before extracting the last component.
- `dirname("path/to/file.txt")` returns `"path/to"`.
- `abspath`, `file`, `filebase64`, `fileexists`, `fileset`, `pathexpand` all exist and behave as described in OpenTofu.
- `filebase64sha256` and `filemd5` (used in supporting examples) are valid OpenTofu functions.
- `aws_s3_object` is the current (non-deprecated) S3 object resource name.
- `python3.11` is a valid Lambda runtime identifier.
- `path.module` and `path.root` references and the recommendation to use them for relative paths are accurate.

## Review Notes
- The Lambda `runtime = "python3.11"` is currently valid, but Lambda runtimes are deprecated on a rolling schedule — readers running this in production should check AWS's current supported-runtime list.
- The `dirname(abspath(path.module))` example yields the parent directory of the module (one level up), which matches the inline comment's intent of pointing at sibling "shared-scripts". Worth noting because the comment "Reference files relative to the current module" could be misread as the module directory itself rather than its parent — but the code is correct for a `shared-scripts` sibling directory.
- For very large directories, `fileset` with broad globs like `**/*` can be slow because it walks the tree at plan time; not an error, just a performance caveat for readers building S3-mirroring patterns.
