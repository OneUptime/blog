# Validation Summary: How to Use String Functions in OpenTofu: chomp, lower, upper, title

## Status
validated

## Post Type
Tutorial / Reference

## Technologies Covered
- OpenTofu / Terraform (HCL)
- Built-in string functions: `chomp`, `lower`, `upper`, `title`
- Related function: `replace`
- AWS provider resources used in examples: `aws_s3_bucket`, `aws_iam_group`, `aws_iam_role`, `aws_ecr_repository`

## Sources Consulted
- OpenTofu language docs — `chomp` function: https://opentofu.org/docs/language/functions/chomp/
- OpenTofu language docs — `lower` function: https://opentofu.org/docs/language/functions/lower/
- OpenTofu language docs — `upper` function: https://opentofu.org/docs/language/functions/upper/
- OpenTofu language docs — `title` function: https://opentofu.org/docs/language/functions/title/
- OpenTofu language docs — `replace` function: https://opentofu.org/docs/language/functions/replace/
- Terraform language docs (parity reference): https://developer.hashicorp.com/terraform/language/functions
- AWS provider resource docs for `aws_s3_bucket`, `aws_iam_role`, `aws_iam_group`, `aws_ecr_repository` (registry.terraform.io)

## Issues Found
No technical issues found.

- `chomp()` correctly described as removing trailing newline characters; the documented behavior strips trailing `\n`, `\r\n`, and `\r`. Examples (`"hello\n"` → `"hello"`, `"hello\r\n"` → `"hello"`, `"hello"` → `"hello"`) match the documented behavior.
- `lower()` and `upper()` Unicode-aware case conversion examples produce the documented outputs.
- `title()` correctly described as capitalizing the first letter of each word; examples match the documented behavior.
- All HCL syntax (locals, variables, resources, `jsonencode` IAM trust policy) is valid.
- The IAM trust policy uses the standard `Version = "2012-10-17"` and `sts:AssumeRole` structure correctly.
- Resource attributes used (`bucket` on `aws_s3_bucket`, `name`/`assume_role_policy`/`tags` on `aws_iam_role`, `name` on `aws_iam_group` and `aws_ecr_repository`) are all valid current attributes.

## Review Notes
- The comment "Normalize: lowercase, no spaces, no special chars" in the combining-functions example is slightly aspirational — the code only replaces spaces with hyphens and lowercases the string; it does not strip other special characters. This is a minor wording nuance rather than a technical error, so it was left as-is per the review scope (only fix technical errors).
- `title()` only uppercases the first letter of each word and does not lowercase the rest of the letters. The post's examples happen to use all-lowercase inputs so this nuance does not surface, but readers passing mixed-case input (e.g., `title("heLLo wORLd")` → `"HeLLo WORLd"`) may be surprised. Future revision could call this out, but the current content is not incorrect.
- `chomp()` only strips trailing newlines, not leading whitespace or other trailing whitespace; for fuller trimming, `trimspace()` would be appropriate. Not in scope for this post.
