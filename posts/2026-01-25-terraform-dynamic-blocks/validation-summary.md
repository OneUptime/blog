# Validation Summary: How to Use Dynamic Blocks in Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform configuration language
- Terraform dynamic blocks
- AWS Terraform provider
- Google Cloud Terraform provider
- AWS Security Groups
- AWS Auto Scaling Groups
- AWS Load Balancer Listeners
- AWS IAM policy documents
- Google Cloud firewall rules

## Sources Consulted
- Terraform dynamic blocks documentation: https://developer.hashicorp.com/terraform/language/expressions/dynamic-blocks
- AWS provider `aws_security_group` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/security_group
- AWS provider `aws_autoscaling_group` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/autoscaling_group
- AWS provider `aws_lb_listener` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/lb_listener
- AWS provider `aws_iam_policy_document` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/data-sources/iam_policy_document
- Google provider `google_compute_firewall` documentation: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/compute_firewall
- AWS provider S3 encryption configuration documentation: https://github.com/hashicorp/terraform-provider-aws/blob/main/website/docs/r/s3_bucket_server_side_encryption_configuration.html.markdown

## Issues Found
- The "Nested Dynamic Blocks" section described nested dynamic blocks, but the example combined resource-level `for_each` with a single dynamic nested block. Updated the heading and description to match the code.
- The load balancer listener example used an HTTPS listener without a certificate configuration. Changed the second example listener to HTTP on port 8080 and converted the `for_each` key to `tostring(l.port)` so the resource keys are explicit strings.
- The conditional dynamic block example used `aws_s3_bucket_server_side_encryption_configuration` with zero `rule` blocks when disabled, which would not be a valid use of that resource. Replaced it with an optional security group ingress rule, which is valid with zero generated nested blocks.
- The module example did not use dynamic blocks. Updated the heading and description to describe repeatable module configuration instead of dynamic block behavior.
- The Google Cloud firewall example only mapped `ranges` to `source_ranges`, so EGRESS rules would not receive `destination_ranges`. Added conditional `destination_ranges` handling.
- The custom iterator example used the first and last service ports as a range, which would unintentionally open every port between 80 and 443 for the web service. Added a `local.service_ports` flattening step and generated one ingress rule per service port.

## Review Notes
Terraform CLI was not installed in the local environment, so syntax validation was performed by source review against official Terraform language and provider documentation rather than by running `terraform validate`.
