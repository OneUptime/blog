# Validation Summary: How to Set Up Lambda Aliases and Versions with OpenTofu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTofu
- AWS Lambda versions and aliases
- AWS Lambda resource-based permissions
- Amazon API Gateway REST API integrations
- HCL / Terraform AWS provider syntax

## Sources Consulted
- AWS Lambda Developer Guide: Manage Lambda function versions — https://docs.aws.amazon.com/lambda/latest/dg/configuration-versions.html
- AWS Lambda Developer Guide: Create an alias for a Lambda function — https://docs.aws.amazon.com/lambda/latest/dg/configuration-aliases.html
- AWS Lambda Developer Guide: Implement Lambda canary deployments using a weighted alias — https://docs.aws.amazon.com/lambda/latest/dg/configuring-alias-routing.html
- AWS Lambda Developer Guide: Using Lambda aliases in event sources and permissions policies — https://docs.aws.amazon.com/lambda/latest/dg/using-aliases.html
- AWS Lambda Developer Guide: Invoking a Lambda function using an Amazon API Gateway endpoint — https://docs.aws.amazon.com/lambda/latest/dg/services-apigateway.html
- OpenTofu CLI docs: `tofu apply` — https://opentofu.org/docs/cli/commands/apply
- OpenTofu CLI docs: `tofu init` — https://opentofu.org/docs/cli/commands/init
- AWS provider docs source: `aws_lambda_function` — https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/lambda_function.html.markdown
- AWS provider docs source: `aws_lambda_alias` — https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/lambda_alias.html.markdown
- AWS provider docs source: `aws_lambda_permission` — https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/lambda_permission.html.markdown
- AWS provider docs source: `aws_api_gateway_integration` — https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/api_gateway_integration.html.markdown

## Issues Found
1. **The canary example modeled the same alias as a second resource.** The original Step 3 declared another `aws_lambda_alias` with `name = "production"`, which would conflict with the existing production alias instead of updating it. I replaced that with the `routing_config` block to add inside `aws_lambda_alias.production`.

2. **The `publish = true` explanation was too broad.** AWS publishes a new Lambda version only when code or versioned configuration changes qualify the function for version publication, not on every no-op apply. I updated the inline comment and the deployment note to match AWS behavior.

3. **The blue-green variable default conflicted with the weighted-alias flow.** The post originally defaulted `production_version` to `$LATEST`, but AWS weighted aliases require published versions and cannot point to `$LATEST`. I changed the variable to describe a published version and default it to `"1"` for the tutorial's initial deployment flow.

4. **The prerequisites contradicted the tutorial flow.** The post said an existing Lambda function with `publish = true` was required, even though Step 1 creates that function. I replaced that prerequisite with AWS credentials configured for OpenTofu.

## Review Notes
- `tofu` was not installed in the local review environment, so the CLI commands were validated against the official OpenTofu command documentation rather than executed locally.
- The `production_version = "1"` default is correct for the tutorial's new-function flow in Step 1. If a reader adapts the post to an existing Lambda function, they should set `production_version` to an actual published version in that function instead.
- The API Gateway and Lambda snippets are intentionally partial and omit surrounding resources such as `aws_api_gateway_method` and `data.archive_file.zip`. The resource arguments shown in the post are valid for the documented use case.
