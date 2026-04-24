# Validation Summary: How to Use Provider-Defined Functions Introduced in OpenTofu 1.7

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- OpenTofu 1.7
- HashiCorp AWS provider (`hashicorp/aws`)
- HCL
- Terraform Plugin Framework
- Go

## Sources Consulted
- OpenTofu language functions documentation: https://opentofu.org/docs/language/functions/
- OpenTofu 1.7 "What's new" documentation: https://opentofu.org/docs/v1.7/intro/whats-new/
- AWS provider `arn_parse` documentation: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/functions/arn_parse.html.markdown
- AWS provider `arn_build` documentation: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/functions/arn_build.html.markdown
- AWS provider `trim_iam_role_path` documentation: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/functions/trim_iam_role_path.html.markdown
- Terraform Plugin Framework function concepts: https://developer.hashicorp.com/terraform/plugin/framework/functions/concepts
- Terraform Plugin Framework `function.Function` interface source: https://raw.githubusercontent.com/hashicorp/terraform-plugin-framework/main/function/function.go
- AWS provider source implementing `arn_parse()`: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/internal/function/arn_parse.go
- AWS provider source implementing `trim_iam_role_path()`: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/internal/function/trim_iam_role_path.go
- AWS provider commit introducing ARN functions on November 7, 2023: https://github.com/hashicorp/terraform-provider-aws/commit/a9a082c28562f40d713de878f76393abf8c3a2ab
- AWS provider commit introducing `trim_iam_role_path()` on April 3, 2024: https://github.com/hashicorp/terraform-provider-aws/commit/0c0428430e164dd7f51bdb4907b83cba15d0e9d9
- AWS provider release tag containing all functions used in the post: https://github.com/hashicorp/terraform-provider-aws/releases/tag/v5.44.0

## Issues Found
- The post pinned `hashicorp/aws` to `>= 5.20.0`, but that version floor was too low for the functions used in the article. `arn_parse()` and `arn_build()` were introduced on November 7, 2023, and `trim_iam_role_path()` was added on April 3, 2024, so I raised the minimum version to `>= 5.44.0` to cover every example shown.
- The "Trimming ARN Suffixes" example manually rebuilt an IAM role ARN with `split()` and used an ARN shape that did not correctly represent removing an IAM role path. I corrected the example to use the provider's documented `provider::aws::trim_iam_role_path()` helper and updated the sample ARN accordingly.
- The provider-author Go example used a builder-style `function.NewFunction(...)` API that does not match the current Terraform Plugin Framework. I replaced it with the current `function.Function` implementation pattern using `Metadata`, `Definition`, and `Run`, including proper object-result construction and error handling.
- The `tofu console` example needed module-context clarification. I updated the surrounding comment so it is clear the command should be run from a module where the provider has already been initialized.

## Review Notes
- `tofu` was not installed in this workspace, so the console example was not executed locally. It was reviewed against the OpenTofu documentation and the provider function documentation/source instead.
- OpenTofu 1.7 documents provider-defined functions directly, while the AWS provider function pages are published in the Terraform Registry and provider source. That combination is technically valid because OpenTofu documents compatibility with Terraform's provider protocol.
