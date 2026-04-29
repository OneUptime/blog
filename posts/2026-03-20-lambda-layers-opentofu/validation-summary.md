# Validation Summary: How to Create Lambda Layers with OpenTofu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTofu
- AWS Lambda
- AWS Lambda Layers
- AWS Provider for OpenTofu/Terraform
- Python packaging with pip
- Node.js packaging with npm

## Sources Consulted
- AWS Lambda Developer Guide: Working with layers for Python Lambda functions — https://docs.aws.amazon.com/lambda/latest/dg/python-layers.html
- AWS Lambda Developer Guide: Working with layers for Node.js Lambda functions — https://docs.aws.amazon.com/lambda/latest/dg/nodejs-layers.html
- AWS Lambda Developer Guide: Packaging your layer content — https://docs.aws.amazon.com/lambda/latest/dg/packaging-layers.html
- AWS Lambda Developer Guide: Adding layers to functions — https://docs.aws.amazon.com/lambda/latest/dg/adding-layers.html
- AWS Lambda quotas — https://docs.aws.amazon.com/lambda/latest/dg/gettingstarted-limits.html
- Powertools for AWS Lambda (Python): Upgrade guide / new Lambda layer ARNs — https://docs.aws.amazon.com/powertools/python/latest/upgrade/
- OpenTofu CLI docs: `tofu init` — https://opentofu.org/docs/v1.8/cli/commands/init/
- OpenTofu CLI docs: `tofu plan` — https://opentofu.org/docs/cli/commands/plan/
- OpenTofu CLI docs: `tofu apply` — https://opentofu.org/docs/cli/commands/apply
- pip documentation: `pip install` — https://pip.pypa.io/en/stable/cli/pip_install/
- AWS provider docs: `aws_lambda_layer_version` resource — https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/lambda_layer_version.html.markdown
- AWS provider docs: `aws_lambda_layer_version` data source — https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/d/lambda_layer_version.html.markdown
- AWS provider docs: `aws_lambda_layer_version_permission` resource — https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/lambda_layer_version_permission.html.markdown

## Issues Found
- The introduction incorrectly said a single layer can only be attached to up to five functions. I changed this to say that a layer can be shared across multiple functions and that each function can use up to five layers, which matches AWS Lambda documentation.
- The Python `pip install` example used `--platform` and `--python-version` together without the binary-only safeguard required for constrained wheel resolution. I updated the command to use `python3.12 -m pip install ... --platform manylinux2014_x86_64 --only-binary=:all:` and also created the `dist` directory used later by `archive_file`.
- The dependency layer was marked as compatible with both `python3.11` and `python3.12` even though the post’s build flow targets Python 3.12. I narrowed the example to `python3.12` so the runtime declaration matches the packaging flow and AWS guidance to build with the same Python version as the function runtime.
- The shared utilities layer example did not explain that Python layers must include a top-level `python/` directory in the zip archive. I added a brief inline clarification so the archive layout matches Lambda’s layer path requirements.
- The Lambda function snippets referenced `data.archive_file.function` without defining it anywhere in the post. I added the missing `archive_file` data source so the HCL examples are internally complete.
- The public layer example used an ARN in `layer_name`, which is not the documented argument shape for that data source, and it referenced the older Powertools V2 layer naming. I updated the example to use the current Powertools V3 layer name for Python 3.12 on x86_64.
- The `skip_destroy` explanation implied it only prevents auto-deletion during updates. I adjusted the wording to match provider behavior more precisely: it retains previously published layer versions instead of deleting them during replacement or destroy operations.

## Review Notes
- The Node.js example is technically valid for a layer project that already has a `package.json` inside `layer/nodejs`, but it assumes that structure exists.
- The Powertools example now resolves the latest version of the named layer in the configured AWS region. If the function uses `arm64`, the layer name must be changed to the corresponding `arm64` variant documented by Powertools.
- I could not run `tofu` locally in this workspace because the OpenTofu CLI is not installed here, so command validation for `tofu init`, `tofu plan`, and `tofu apply` was done against official OpenTofu documentation rather than local CLI help output.
