# Validation Summary: How to Follow OpenTofu Style Conventions

## Status
validated

## Post Type
Guide / Reference (style conventions)

## Technologies Covered
- OpenTofu (HCL)
- `tofu fmt` formatter
- Terraform/OpenTofu language constructs (resources, variables, outputs, locals, modules, lifecycle, meta-arguments)
- AWS provider examples (`aws_instance`, `aws_security_group`, `aws_vpc`, `aws_subnet`)
- S3 backend configuration

## Sources Consulted
- Official OpenTofu Style Conventions: https://opentofu.org/docs/language/syntax/style/
- OpenTofu language documentation (resources, meta-arguments, providers, backends)
- HashiCorp Terraform style guide (parent conventions inherited by OpenTofu)
- AWS provider documentation for `aws_instance` arguments (`ami`, `instance_type`, `key_name`, `vpc_security_group_ids`, `subnet_id`, `root_block_device`)

## Issues Found
- Markdown structure inconsistency: "Resource Names" was rendered as plain text rather than a subheading (`###`), while sibling subsections "Variable Names" and "Output Names" used `###`. Updated to `### Resource Names` for consistent heading hierarchy under "## Naming Conventions".

No technical inaccuracies were found in the code samples or claims:
- 2-space indentation and equals-sign alignment match `tofu fmt` behavior.
- Block organization order (meta-args first, required, optional, nested blocks, `lifecycle` last) matches the official OpenTofu style guide.
- Meta-argument ordering (`count`/`for_each` first; `depends_on` and `lifecycle` near the end) is consistent with documented conventions.
- `required_version = ">= 1.6.0"` is valid (OpenTofu's first stable release was 1.6.0).
- AWS provider source `hashicorp/aws` with `~> 5.0` and `aws_instance` arguments (`ami`, `instance_type`, `vpc_security_group_ids`, `subnet_id`, `root_block_device` with `volume_size`/`volume_type` including `gp3`) are all valid.
- `merge()`, `locals`, and tag-merging patterns are correct.
- `terraform { ... backend "s3" { bucket, key, region } }` block is valid.

## Review Notes
- Naming conventions like using `this` for single-resource modules or `main`/`default` for primary resources are community conventions (popularized by terraform-aws-modules and HashiCorp examples) rather than rules enforced by OpenTofu itself; the post correctly frames them as conventions.
- The official OpenTofu style page explicitly covers indentation, alignment, block organization, and meta-argument placement, but does not prescribe naming conventions, file organization, or tagging — these portions of the post reflect widely adopted community practice, which is appropriate for a style-guide article.
- The `${local.name_prefix}-web` reference in the tags example assumes a `name_prefix` local that isn't defined in the snippet; this is acceptable as illustrative shorthand and the surrounding `# ...` comments make this clear.
