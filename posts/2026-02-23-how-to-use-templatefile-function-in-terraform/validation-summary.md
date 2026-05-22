# Validation Summary: How to Use the templatefile Function in Terraform

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Terraform
- Terraform HCL
- Terraform `templatefile` function
- Terraform `templatestring` function
- AWS EC2 user data
- AWS IAM policy JSON
- NGINX configuration
- Kubernetes Deployment manifests

## Sources Consulted
- HashiCorp Terraform `templatefile` function documentation: https://developer.hashicorp.com/terraform/language/functions/templatefile
- HashiCorp Terraform strings and templates documentation: https://developer.hashicorp.com/terraform/language/expressions/strings
- HashiCorp Terraform `templatestring` function documentation: https://developer.hashicorp.com/terraform/language/functions/templatestring
- HashiCorp Terraform Local provider `local_file` resource documentation: https://registry.terraform.io/providers/hashicorp/local/latest/docs/resources/file
- HashiCorp Terraform AWS provider `aws_instance` resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/instance
- AWS IAM JSON policy element reference: https://docs.aws.amazon.com/IAM/latest/UserGuide/reference_policies_elements.html
- AWS IAM JSON policy `Action` element documentation: https://docs.aws.amazon.com/IAM/latest/UserGuide/reference_policies_elements_action.html
- Kubernetes Deployment documentation: https://kubernetes.io/docs/concepts/workloads/controllers/deployment/
- NGINX reverse proxy documentation: https://docs.nginx.com/nginx/admin-guide/web-server/reverse-proxy/

## Issues Found
- Template file names used the older `.tpl` suffix throughout the examples. Terraform still allows arbitrary filenames, but HashiCorp recommends `*.tftpl` for template files so editors can identify Terraform templates correctly. Updated template filenames and matching `templatefile` paths to use `.tftpl`.
- The template directive examples were shown as `%{if}...%{endif}` and `%{for}...%{endfor}`. Updated them to include the expected directive expressions, such as `%{ if condition }...%{ endif }` and `%{ for item in items }...%{ endfor }`.
- The Bash escaping example used `CURRENT_DATE=$${(date +%Y-%m-%d)}`, which would render as `${(date +%Y-%m-%d)}` and is not valid Bash command substitution. Changed it to `CURRENT_DATE=$(date +%Y-%m-%d)` and kept escaping only for Bash `${APP_NAME}` and `${CURRENT_DATE}` references.
- The escaping section mentioned literal `%{}` values but only documented `$${`. Added `%%{` as the Terraform escape sequence for a literal `%{`.
- The `templatestring` comparison said to use `templatestring` for simple inline templates. HashiCorp documents `templatestring` as rendering a string value referenced from the module, and says the first argument cannot be a literal template expression. Updated the text to recommend Terraform interpolation or heredoc strings for inline templates, and `templatestring` for templates already available as string values.
- The common mistakes section said passing extra variables to `templatefile` causes an error. Terraform makes each key from the `vars` object available to the template, and the official documentation does not require all supplied keys to be referenced. Updated this to say Terraform allows unused variables, but they can hurt maintainability.

## Review Notes
- The IAM JSON and Kubernetes YAML examples are technically valid, but HashiCorp recommends `jsonencode` or `yamlencode` for generated JSON or YAML when practical because it avoids manual escaping and delimiter mistakes.
- I could not run `terraform validate` locally because Terraform is not installed in this environment. The review was performed against official documentation.
