# Validation Summary: How to Use Postconditions on Resources in OpenTofu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTofu (lifecycle postconditions, `self` reference, custom condition checks)
- Terraform HCL syntax (lifecycle blocks, data source lifecycle)
- AWS provider resources: `aws_s3_bucket`, `aws_lb`, `aws_instance`, `aws_s3_object` (data source), `aws_db_instance`, `aws_ssm_parameter`, `aws_eks_cluster`
- OpenTofu built-in functions (`startswith`)

## Sources Consulted
- OpenTofu Custom Conditions documentation: https://opentofu.org/docs/language/expressions/custom-conditions/
- Terraform AWS provider `aws_db_instance` resource documentation (hashicorp/terraform-provider-aws GitHub)
- Terraform AWS provider `aws_eks_cluster` resource documentation (hashicorp/terraform-provider-aws GitHub)
- General knowledge of AWS provider attribute references for `aws_lb`, `aws_instance`, `aws_s3_bucket`, and `aws_s3_object` data source

## Issues Found
No technical issues found.

Verified specifically:
- `postcondition` blocks are valid inside `lifecycle` blocks for both managed resources and data sources.
- The `self` reference correctly refers to the resource/data source's own (post-apply) attributes inside postconditions.
- A failing postcondition blocks the apply and prevents downstream resources that depend on the resource from being created — accurately described in the post.
- `aws_db_instance` exposes `status`, `storage_encrypted`, `multi_az`, and `endpoint` as computed/readable attributes.
- `aws_eks_cluster` exposes `status` (with values such as `CREATING`, `ACTIVE`, `DELETING`, `FAILED`) and the `kubernetes_network_config` block (a list, hence `[0].service_ipv4_cidr`).
- `aws_lb.dns_name`, `aws_instance.private_ip`, `aws_instance.availability_zone`, and `aws_s3_object.content_type` (data source) are all valid attributes.
- `startswith` is a valid OpenTofu/Terraform built-in function.
- The contrast with `check` blocks is accurate: check blocks emit warnings rather than failing the apply, and they are evaluated outside the per-resource lifecycle.

## Review Notes
- The "Postcondition vs Check Block" comparison summary is accurate at a high level. A minor nuance: check blocks are evaluated during plan and apply (not strictly only "after ALL resources are applied"), but the outcome the author conveys — they warn rather than block — is correct.
- Code examples use idiomatic HCL and would work as written assuming the variables/data sources referenced (e.g. `var.bucket_name`, `data.aws_ami.ubuntu`) are defined elsewhere.
