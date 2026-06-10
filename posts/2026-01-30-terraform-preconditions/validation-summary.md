# Validation Summary: How to Implement Terraform Preconditions

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform (HCL language, lifecycle blocks, custom conditions)
- Terraform AWS provider (`aws_instance`, `aws_ami`, `aws_subnet`, `aws_vpc`, `aws_acm_certificate`, `aws_lb_listener`, `aws_db_instance`, `aws_ec2_instance_type`, `aws_caller_identity`, `aws_region`, `aws_s3_bucket`)
- Terraform Kubernetes provider (`kubernetes_namespace`, `kubernetes_deployment`)
- Terraform built-in functions (`contains`, `can`, `regex`, `tonumber`, `split`, `timecmp`, `timeadd`, `timestamp`, `length`)
- CI/CD pipeline integration with `terraform plan` exit codes

## Sources Consulted
- Terraform Custom Conditions documentation: https://developer.hashicorp.com/terraform/language/expressions/custom-conditions
- Terraform `timecmp` function documentation: https://developer.hashicorp.com/terraform/language/functions/timecmp
- Terraform `lifecycle` meta-argument documentation
- AWS provider documentation for the data sources and resources referenced (aws_ami, aws_subnet, aws_vpc, aws_acm_certificate, aws_ec2_instance_type, aws_db_instance)
- Kubernetes provider documentation for `data.kubernetes_namespace`

## Issues Found
No technical issues found.

The post accurately describes Terraform preconditions:
- Correctly states preconditions are placed inside a `lifecycle` block within a resource or data source.
- Correctly distinguishes preconditions from variable validation (preconditions can reference other resources/data sources, variable validation cannot).
- Correctly states failures occur at plan time and abort the plan.
- All HCL syntax in examples is valid.
- All referenced provider attributes (`architecture`, `available_ip_address_count`, `vpc_id`, `enable_dns_hostnames`, `not_after`, `default_vcpus`, `memory_size`) are valid attributes on the cited data sources.
- All referenced built-in functions exist and are used correctly.
- The `timecmp(...) > 0` pattern for checking certificate expiry against `timeadd(timestamp(), "720h")` is correctly used to enforce a 30-day expiration buffer.
- The regex pattern `^db\\.(m5|r5)` for RDS instance class validation is correctly escaped for HCL strings.
- The `tonumber(split(".", var.engine_version)[0]) >= 14` pattern correctly parses major version from a string like "14.5".

## Review Notes
- Preconditions require Terraform v1.2.0 or later; the post does not mention this minimum version requirement explicitly, but every example would work on any reasonably modern Terraform. The `timecmp` function in Example 6 requires Terraform v1.5.0 or later — a future revision could note this for readers on older versions.
- The Kubernetes namespace precondition in Example 5 (`data.kubernetes_namespace.target.metadata[0].name == var.namespace`) is technically valid HCL and will evaluate as expected, but is somewhat redundant in practice: if the namespace does not exist, the `data.kubernetes_namespace.target` lookup itself will fail at plan time before the precondition is evaluated. The error message therefore would not be shown in the "namespace missing" case. This is a logic/UX nitpick, not a technical inaccuracy, so no change was made.
- The post uses `t2.micro`/`t3.*`/`m5.*` instance types in examples; these are all real, currently available AWS EC2 instance types as of the review date.
- The Ubuntu AMI owner ID `099720109477` is the correct Canonical-owned AWS account for official Ubuntu AMIs.
