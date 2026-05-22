# Validation Summary: How to Use the Provider Functions in Terraform

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Terraform 1.8 provider-defined functions
- Terraform HCL expressions and function calls
- Terraform provider requirements and provider aliases
- HashiCorp AWS provider
- HashiCorp Google Cloud provider
- AWS ARN parsing and building
- AWS IAM policy documents

## Sources Consulted
- Terraform language function documentation: https://developer.hashicorp.com/terraform/language/functions
- Terraform function call syntax documentation: https://developer.hashicorp.com/terraform/language/expressions/function-calls
- Terraform Plugin Framework provider-defined functions concepts: https://developer.hashicorp.com/terraform/plugin/framework/functions/concepts
- Terraform provider configuration and alias documentation: https://developer.hashicorp.com/terraform/language/providers/configuration
- Terraform provider requirements documentation: https://developer.hashicorp.com/terraform/language/providers/requirements
- HashiCorp announcement for Terraform 1.8 provider functions: https://www.hashicorp.com/blog/terraform-1-8-adds-provider-functions-for-aws-google-cloud-and-kubernetes
- AWS provider `arn_parse` function documentation source: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/functions/arn_parse.html.markdown
- AWS provider `arn_build` function documentation source: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/functions/arn_build.html.markdown
- AWS provider `aws_arn` data source documentation source: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/d/arn.html.markdown
- HCP provider Registry documentation: https://registry.terraform.io/providers/hashicorp/hcp/latest/docs

## Issues Found
- The introductory wording said providers could previously define resources, data sources, and provisioners. Terraform's current provider documentation describes providers as defining resources and data sources, while provider-defined functions are the newer extension point, so the wording was narrowed to resources and data sources.
- The syntax section used `<provider_name>` and described the namespace as the provider name. Terraform documents this as the provider local name from `required_providers`, so the placeholder and explanation were corrected.
- The `arn_build` example incorrectly passed a single object argument. The AWS provider documents `arn_build(partition string, service string, region string, account_id string, resource string) string`, so the example was changed to five positional string arguments.
- The HCP provider example used a placeholder `provider::hcp::some_function("input")`, but the HCP provider documentation does not document that function. The example was changed to a Google Cloud provider function example using `provider::google::region_from_zone`, which HashiCorp documented as part of the Terraform 1.8 provider-defined functions launch.
- The provider aliases section implied provider functions reference or select provider aliases. Terraform function syntax uses `provider::<local-name>::<function_name>`, where the local name comes from `required_providers`; aliases are selected by resources, data sources, and modules through the `provider` meta-argument. The wording and comment were corrected.
- The comparison with `aws_arn` said the older data source approach required an API call and that provider functions are faster because they avoid API calls. The AWS `aws_arn` data source is documented as parsing an ARN, so the comparison was changed to focus on avoiding an extra data source block and graph node for pure parsing/formatting work.

## Review Notes
Terraform CLI was not installed in the local environment, so I could not run `terraform validate`. The OneUptime link to the related `encode_tfvars` post resolved successfully. The review was performed against official Terraform documentation, HashiCorp provider-function announcements, and AWS provider documentation source files.
