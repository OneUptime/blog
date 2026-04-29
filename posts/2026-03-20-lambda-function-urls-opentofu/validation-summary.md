# Validation Summary: How to Set Up Lambda Function URLs with OpenTofu

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- OpenTofu CLI
- AWS Lambda
- Lambda Function URLs
- AWS IAM
- HCL / Terraform-compatible AWS provider configuration

## Sources Consulted
- AWS Lambda Function URL access control: https://docs.aws.amazon.com/lambda/latest/dg/urls-auth.html
- AWS Lambda Function URL configuration: https://docs.aws.amazon.com/lambda/latest/dg/urls-configuration.html
- AWS Lambda CORS API reference: https://docs.aws.amazon.com/lambda/latest/api/API_Cors.html
- AWS Lambda response streaming overview: https://docs.aws.amazon.com/lambda/latest/dg/configuration-response-streaming.html
- AWS Lambda Function URL response streaming: https://docs.aws.amazon.com/lambda/latest/dg/config-rs-invoke-furls.html
- AWS Lambda runtimes: https://docs.aws.amazon.com/lambda/latest/dg/lambda-runtimes.html
- AWS provider `aws_lambda_function_url` resource docs: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/lambda_function_url
- AWS provider `aws_lambda_permission` resource docs: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/lambda_permission
- OpenTofu `init` documentation: https://opentofu.org/docs/cli/init/
- OpenTofu `output` command: https://opentofu.org/docs/cli/commands/output/
- OpenTofu `plan` command: https://opentofu.org/docs/cli/commands/plan/
- OpenTofu `apply` command: https://opentofu.org/docs/cli/commands/apply

## Issues Found
- The public Function URL example manually granted only `lambda:InvokeFunctionUrl`. Current AWS Lambda docs require both `lambda:InvokeFunctionUrl` and `lambda:InvokeFunction` permissions for Function URLs, and current AWS provider docs state that `aws_lambda_function_url` automatically adds both public permissions when `authorization_type = "NONE"`. I removed the outdated manual permission block and replaced it with an accurate note.
- The IAM-authenticated example granted only `lambda:InvokeFunctionUrl`. AWS Lambda now requires both `lambda:InvokeFunctionUrl` and `lambda:InvokeFunction` for Function URL invocation, with `lambda:InvokedViaFunctionUrl` used to scope the second permission. I replaced the single permission resource with two correct `aws_lambda_permission` resources.
- The private URL example used `qualifier = "LIVE"` without defining a corresponding Lambda alias, so the configuration would not apply as written. I removed the undefined qualifier to make the example deployable.
- The Lambda packaging example wrote the deployment archive to `${path.module}/dist/function.zip` without creating a `dist` directory. I changed the archive output path to `${path.module}/function.zip` so the snippet no longer depends on an undeclared directory.
- The example runtime was `nodejs20.x`, which AWS lists with a deprecation date of April 30, 2026. I updated the example to `nodejs22.x` to keep the post on a current supported runtime.
- The prerequisites and Step 1 setup were underspecified for the shown HCL. I clarified that the reader needs either an existing Lambda function or source code to package, that the example packages a local `src/` directory, and that the archive must contain an `index.js` file exporting `handler`.

## Review Notes
- `tofu` is not installed in this workspace, so the `tofu init`, `tofu plan`, `tofu apply`, and `tofu output -raw` commands were validated against the official OpenTofu documentation rather than local CLI help output.
- AWS documents that, starting in October 2025, new Function URLs require both `lambda:InvokeFunctionUrl` and `lambda:InvokeFunction` permissions.
- Current AWS provider docs note that the public permissions automatically added for `authorization_type = "NONE"` are not removed from AWS when the `aws_lambda_function_url` resource is destroyed.
- AWS response streaming docs note that Lambda Function URLs do not support response streaming when the function runs inside a VPC.
