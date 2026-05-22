# Validation Summary: How to Use the templatefile Function with Conditionals

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Terraform
- Terraform `templatefile` function
- Terraform string templates and directives
- HCL expressions and operators
- Kubernetes Deployment manifests
- AWS EC2 user data
- Nginx configuration
- Linux shell scripting

## Sources Consulted
- Terraform `templatefile` function documentation: https://developer.hashicorp.com/terraform/language/functions/templatefile
- Terraform strings and templates documentation: https://developer.hashicorp.com/terraform/language/expressions/strings
- Terraform operators documentation: https://developer.hashicorp.com/terraform/language/expressions/operators
- HashiCorp Local provider `local_file` resource documentation: https://registry.terraform.io/providers/hashicorp/local/latest/docs/resources/file
- HashiCorp AWS provider `aws_instance` resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/instance
- Kubernetes Deployment documentation: https://kubernetes.io/docs/concepts/workloads/controllers/deployment/

## Issues Found
- The post claimed `%{elseif ...}` is available in Terraform templates in Terraform 1.7+. The official Terraform string template documentation lists `%{if}`/`%{else}`/`%{endif}` and `%{for}`/`%{endfor}` directives, but not `%{elseif}`. I changed the statement to recommend nested `%{if}` directives or Terraform conditional expressions for multiple branches.
- The Kubernetes `apps/v1` Deployment manifest omitted `.spec.selector` and `.spec.template.metadata.labels`. Kubernetes requires a Deployment selector, and it must match the Pod template labels. I added `selector.matchLabels.app` and matching template labels using `${app_name}`.
- The whitespace control example used leading strip markers (`%{~if ...}` and `%{~endif}`) while describing removal of blank lines after directive lines. Terraform documents that `~` immediately before the closing brace strips following whitespace. I changed the example to `%{if condition ~}` and `%{endif ~}`.

## Review Notes
- Terraform was not installed in the local environment, so validation was performed against official documentation rather than by running `terraform validate`.
- The Kubernetes example is syntactically more correct with the added selector and labels, but production manifests commonly include additional fields such as Deployment metadata labels and container ports.
