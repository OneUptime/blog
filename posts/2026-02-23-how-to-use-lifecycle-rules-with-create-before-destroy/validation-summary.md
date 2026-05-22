# Validation Summary: How to Use Lifecycle Rules with create_before_destroy

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform lifecycle meta-arguments
- HCL
- AWS EC2 instances
- AWS security groups
- AWS launch configurations and launch templates
- AWS Auto Scaling Groups
- AWS ACM certificates
- AWS RDS DB instances
- AWS Elastic IPs, routes, SQS queues, IAM roles, and S3 buckets

## Sources Consulted
- Terraform lifecycle meta-argument reference: https://docs.hashicorp.com/terraform/language/meta-arguments/lifecycle
- Terraform resource block reference: https://developer.hashicorp.com/terraform/language/resources/syntax
- Terraform plan command reference: https://developer.hashicorp.com/terraform/cli/commands/plan
- AWS provider `aws_security_group` resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/security_group
- AWS provider `aws_launch_configuration` resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/launch_configuration
- AWS provider `aws_launch_template` resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/launch_template
- AWS provider `aws_autoscaling_group` resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/autoscaling_group
- AWS provider `aws_acm_certificate` resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/acm_certificate
- AWS provider `aws_acm_certificate_validation` resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/acm_certificate_validation
- AWS provider `aws_db_instance` resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/db_instance

## Issues Found
- The article described `create_before_destroy` as essential or primary for zero-downtime deployments. I changed this to "an important building block" and "a key tool" because Terraform can only change creation/destruction ordering; true zero downtime also depends on service health checks, traffic shifting, application readiness, and provider-specific constraints.
- The security group section said instances would briefly lose their security group. I changed this to say replacement can fail or cause disruption when other resources still reference the group, which matches the AWS provider documentation's warning about security group replacement and dependencies.
- The Auto Scaling example used a fixed ASG `name` with `create_before_destroy`. I changed it to `name_prefix` so an ASG replacement can avoid a name collision.
- The launch template discussion implied all launch template changes replace the launch template resource. I clarified that launch configurations are immutable, while launch templates generally create new versions for setting changes.
- The dependency section had the propagation direction reversed. I corrected it to say that when resource A has `create_before_destroy` and depends on resource B, Terraform applies the behavior to B, as documented by HashiCorp.
- The dependency example said an EC2 instance would inherit `create_before_destroy` from a security group it depends on. I corrected the example text to show the security group dependency inheriting the behavior from the instance.
- The lifecycle-combination example said `ignore_changes = [engine_version]` ignored AMI changes. I changed the comment to engine version changes.

## Review Notes
Terraform CLI was not installed in the local environment, so I could not run `terraform fmt` or `terraform validate` locally. The snippets were reviewed against current official Terraform language documentation and current HashiCorp AWS provider documentation. The article still uses inline `ingress` and `egress` blocks for `aws_security_group`; this remains supported, but the AWS provider documentation recommends newer standalone VPC security group rule resources for many cases.
