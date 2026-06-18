# Validation Summary: How to Use Dynamic Blocks in Terraform

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Terraform dynamic blocks
- Terraform variables, locals, for expressions, and resource `for_each`
- AWS provider resources and data sources
- AWS IAM policy documents
- Google Cloud provider firewall rules

## Sources Consulted
- Terraform dynamic blocks documentation: https://developer.hashicorp.com/terraform/language/expressions/dynamic-blocks
- Terraform input variables documentation: https://developer.hashicorp.com/terraform/language/values/variables
- AWS provider `aws_security_group` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/security_group
- AWS provider `aws_autoscaling_group` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/autoscaling_group
- AWS provider `aws_lb_listener` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/lb_listener
- AWS provider `aws_s3_bucket_server_side_encryption_configuration` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/s3_bucket_server_side_encryption_configuration
- AWS provider `aws_iam_policy_document` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/data-sources/iam_policy_document
- AWS IAM `Sid` element documentation: https://docs.aws.amazon.com/IAM/latest/UserGuide/reference_policies_elements_sid.html
- Google provider `google_compute_firewall` documentation: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/compute_firewall

## Issues Found
- AWS security group inline `ingress` and `egress` blocks are valid Terraform syntax, but the current AWS provider documentation recommends standalone `aws_vpc_security_group_ingress_rule` and `aws_vpc_security_group_egress_rule` resources for production use. Added a note clarifying that the inline blocks are used here to demonstrate dynamic block syntax.
- The IAM policy example used map keys with underscores as `sid` values. AWS IAM `Sid` values support only ASCII letters and numbers, so `read_data` and `write_logs` were invalid. Changed them to `ReadData` and `WriteLogs`.
- The GCP firewall rules map used unquoted keys containing hyphens. Quoted the keys as `"allow-http"` and `"allow-ssh"` so the HCL object keys are unambiguous string keys.

## Review Notes
The examples rely on placeholder resources such as `aws_vpc.main`, `aws_lb.main`, `aws_launch_template.app`, and `google_compute_network.main`; these are acceptable for focused snippets but would need surrounding provider and resource configuration in a complete Terraform module.
