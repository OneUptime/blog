# Validation Summary: How to Use the base64encode Function in Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform
- Terraform `base64encode`, `base64decode`, `file`, `filebase64`, `templatefile`, and `jsonencode` functions
- AWS EC2 launch templates and instances
- AWS Lambda
- AWS API Gateway REST API integrations
- Kubernetes Secrets
- Cloud-init `write_files`
- Azure Virtual Machine Custom Script Extension

## Sources Consulted
- Terraform `base64encode` function documentation: https://developer.hashicorp.com/terraform/language/functions/base64encode
- Terraform `file` function documentation: https://developer.hashicorp.com/terraform/language/functions/file
- Terraform `filebase64` function documentation: https://developer.hashicorp.com/terraform/language/functions/filebase64
- HashiCorp AWS provider `aws_launch_template` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/launch_template
- HashiCorp AWS provider `aws_instance` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/instance
- HashiCorp Kubernetes provider `kubernetes_secret` documentation: https://registry.terraform.io/providers/hashicorp/kubernetes/latest/docs/resources/secret
- Kubernetes Secrets documentation: https://kubernetes.io/docs/concepts/configuration/secret/
- Cloud-init `write_files` documentation: https://docs.cloud-init.io/en/latest/reference/yaml_examples/write_files.html
- AWS Lambda runtime documentation: https://docs.aws.amazon.com/lambda/latest/dg/lambda-runtimes.html
- AWS API Gateway binary media type documentation: https://docs.aws.amazon.com/apigateway/latest/developerguide/api-gateway-payload-encodings.html
- AWS API Gateway binary support configuration documentation: https://docs.aws.amazon.com/apigateway/latest/developerguide/api-gateway-payload-encodings-configure-with-control-service-api.html
- HashiCorp AWS provider `aws_api_gateway_integration` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/api_gateway_integration
- Microsoft Azure Custom Script Extension for Linux documentation: https://learn.microsoft.com/en-us/azure/virtual-machines/extensions/custom-script-linux

## Issues Found
- The introduction said cloud provider APIs expect user data in base64. This was too broad, so it now says some cloud provider APIs expect user data in base64.
- The introduction said Kubernetes secrets must be base64-encoded. This was narrowed to Kubernetes Secret `data` fields, because Kubernetes also supports `stringData` for plain-text input.
- The AWS Lambda example used `nodejs18.x`, which is deprecated as of September 1, 2025 according to AWS Lambda runtime documentation. The example now uses `nodejs22.x`.
- The API Gateway section said integrations sometimes need base64-encoded request or response templates, but API Gateway binary conversions are controlled with `contentHandling` / Terraform `content_handling`; mapping templates are not themselves base64-encoded. The section was updated to use `content_handling = "CONVERT_TO_TEXT"` with a request template.

## Review Notes
The remaining examples are consistent with current official documentation. `base64encode(file(...))` is appropriate only for UTF-8 text files; the post correctly recommends `filebase64()` for binary files. AWS Lambda runtime availability is time-sensitive and should be rechecked during future reviews.
