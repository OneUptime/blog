# Validation Summary: How to Create Lambda Layers in Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform
- HashiCorp AWS provider
- Terraform built-in `terraform_data` resource
- AWS Lambda
- AWS Lambda layers
- AWS Systems Manager Parameter Store
- Python and pip packaging
- Node.js and npm packaging

## Sources Consulted
- AWS Lambda layer packaging documentation: https://docs.aws.amazon.com/lambda/latest/dg/packaging-layers.html
- AWS Lambda adding layers documentation: https://docs.aws.amazon.com/lambda/latest/dg/adding-layers.html
- AWS Lambda quotas documentation: https://docs.aws.amazon.com/lambda/latest/dg/gettingstarted-limits.html
- AWS Lambda runtimes documentation: https://docs.aws.amazon.com/lambda/latest/dg/lambda-runtimes.html
- AWS Lambda cross-account layer permissions documentation: https://docs.aws.amazon.com/lambda/latest/dg/permissions-layer-cross-account.html
- AWS Systems Manager documentation for AWS Parameters and Secrets Lambda Extension ARNs: https://docs.aws.amazon.com/systems-manager/latest/userguide/ps-integration-lambda-extensions.html
- Terraform AWS provider `aws_lambda_layer_version` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/lambda_layer_version
- Terraform AWS provider `aws_lambda_function` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/lambda_function
- Terraform AWS provider `aws_lambda_layer_version_permission` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/lambda_layer_version_permission
- Terraform `terraform_data` resource documentation: https://developer.hashicorp.com/terraform/language/resources/terraform-data
- HashiCorp null provider `null_resource` documentation: https://registry.terraform.io/providers/hashicorp/null/latest/docs/resources/resource
- pip install CLI help from local `python3 -m pip install --help`
- npm install CLI help from local `npm install --help`

## Issues Found
- **Outdated Terraform orchestration resource.** The post used `null_resource` with `triggers`. HashiCorp's current null provider documentation recommends `terraform_data` on Terraform 1.4 and later. Changed both dependency-build resources to `terraform_data` and changed `triggers` to `triggers_replace`.
- **Python layer runtime compatibility was too broad for compiled dependencies.** The requirements include `pydantic`, which installs the compiled `pydantic-core` wheel. The original command did not pin the target Python ABI while declaring compatibility with both Python 3.11 and 3.12. Changed the example to target Python 3.12 explicitly with pip options and set `compatible_runtimes = ["python3.12"]`.
- **Node.js runtime list included an older runtime.** The example listed `nodejs18.x`; AWS now recommends newer AL2023-based runtimes, and Node.js 18 is past its deprecation date. Updated the example to `nodejs20.x` and `nodejs22.x`.
- **npm production install flag was outdated.** Replaced `npm install --production` with `npm install --omit=dev`, which is the current npm CLI option for omitting development dependencies.
- **Runtime layer paths were incomplete/outdated.** Updated the Node.js and Ruby path examples to match the current AWS Lambda layer packaging documentation.
- **Layer version management wording overstated Terraform behavior.** Clarified that AWS layer versions are immutable and that Terraform normally deletes the old layer version on replacement unless `skip_destroy = true` is set. Added the caveat that retained versions are no longer managed by Terraform.
- **Hard-coded AWS Parameters and Secrets Lambda Extension ARN was stale.** Replaced the fixed version ARN with an SSM public parameter lookup for the latest x86_64 extension ARN in the function's Region.

## Review Notes
- Terraform was not installed in the local environment, so full `terraform validate` could not be run. The HCL snippets were reviewed against the official Terraform provider documentation.
- The Python pip command was smoke-tested with `--dry-run` using the listed requirements and target platform/interpreter options.
