# Validation Summary: How to Use for_each with Maps to Create Resources in OpenTofu (2)

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTofu
- HCL
- AWS Provider for OpenTofu/Terraform
- Amazon S3
- Amazon VPC Security Groups
- AWS Auto Scaling
- AWS IAM

## Sources Consulted
- OpenTofu `for_each` meta-argument documentation: https://opentofu.org/docs/language/meta-arguments/for_each/
- OpenTofu `for` expressions documentation: https://opentofu.org/docs/language/expressions/for/
- OpenTofu `values` function documentation: https://opentofu.org/docs/language/functions/values/
- AWS provider `aws_s3_bucket` resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/s3_bucket
- AWS provider `aws_security_group_rule` resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/security_group_rule
- AWS provider `aws_vpc_security_group_ingress_rule` resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/vpc_security_group_ingress_rule
- AWS provider `aws_autoscaling_group` resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/autoscaling_group
- AWS provider `aws_iam_user` resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/iam_user

## Issues Found
- The security-group example used `aws_security_group_rule`. Current AWS provider documentation explicitly recommends avoiding that resource for new rules and using `aws_vpc_security_group_ingress_rule` instead. I updated the example to the current best-practice resource and changed the arguments from `protocol`/`cidr_blocks` to `ip_protocol`/`cidr_ipv4`, with one CIDR per rule object.
- The comment in the same example implied the resource itself is named by `each.key`. In OpenTofu, the resource instance is addressed by `each.key`, so I corrected that wording.
- The Auto Scaling Group example defined a `region` field in the map but did not use it. I added `region = each.value.region` so the example matches its declared input data.
- The Auto Scaling Group example used a generic `# ...` placeholder where the AWS provider requires a launch configuration choice. I replaced it with explicit omitted examples for `launch_template` and `availability_zones`.
- The S3 bucket example did not note that bucket names must be globally unique in AWS. I added that caveat to the inline comment.

## Review Notes
- No terminal commands are included in the post, so there were no CLI flags or command syntaxes to validate.
- Several snippets are intentionally partial and still assume surrounding declarations such as `aws_security_group.main`, `var.project_name`, and `var.environment`.
- `values(aws_s3_bucket.app)[*].arn` is technically correct. Per the OpenTofu `values()` documentation, the resulting list is ordered lexicographically by key.
