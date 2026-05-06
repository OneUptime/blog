# Validation Summary: How to Use Check Blocks for Drift Detection in OpenTofu

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTofu
- AWS Provider for Terraform/OpenTofu
- DNS Provider for Terraform/OpenTofu
- AWS EC2 security groups
- Amazon S3
- Amazon RDS

## Sources Consulted
- OpenTofu checks documentation: https://opentofu.org/docs/language/checks/
- OpenTofu `plan` command documentation: https://opentofu.org/docs/cli/commands/plan/
- OpenTofu `apply` command documentation: https://opentofu.org/docs/cli/commands/apply/
- OpenTofu machine-readable UI documentation: https://opentofu.org/docs/internals/machine-readable-ui/
- OpenTofu JSON output format documentation: https://opentofu.org/docs/internals/json-format/
- OpenTofu upgrade guide: https://opentofu.org/docs/language/upgrade-guides/
- AWS provider `aws_instance` data source docs: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/d/instance.html.markdown
- AWS provider `aws_security_group` data source docs: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/d/security_group.html.markdown
- AWS provider `aws_vpc_security_group_rule` data source docs: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/d/vpc_security_group_rule.html.markdown
- AWS provider `aws_vpc_security_group_ingress_rule` resource docs: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/vpc_security_group_ingress_rule.html.markdown
- AWS provider `aws_s3_bucket` data source docs: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/d/s3_bucket.html.markdown
- AWS provider `aws_db_instance` data source docs: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/d/db_instance.html.markdown
- AWS provider `aws_db_instance` resource docs: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/db_instance.html.markdown
- DNS provider `dns_a_record_set` data source docs: https://raw.githubusercontent.com/hashicorp/terraform-provider-dns/main/docs/data-sources/a_record_set.md

## Issues Found
- The introduction said OpenTofu check blocks were "introduced in 1.5". I removed that version claim because OpenTofu's stable release line starts at v1.6 and the wording was misleading in an OpenTofu-specific post.
- The security group example used `data.aws_security_group.web_check.ingress`, but the current `aws_security_group` data source does not expose `ingress` rules. I replaced it with a supported `aws_vpc_security_group_rule` lookup against a managed `aws_vpc_security_group_ingress_rule`.
- The S3 section included `data "aws_s3_bucket_server_side_encryption_configuration"`, but the current AWS provider documents that as a resource, not a data source. I removed that invalid snippet and kept the valid bucket-presence check.
- The RDS example used `data.aws_db_instance.main_check.db_instance_status`, but the current `aws_db_instance` data source does not export `db_instance_status`. I changed the check to use the managed resource's documented `status` attribute.
- The CI section claimed `-compact-warnings` could be used to convert warnings into errors. That flag only changes warning display. I replaced the example with a documented plan file plus `tofu show -json` check over `.checks`.

## Review Notes
- OpenTofu check failures are warnings by design; CI enforcement should be implemented outside the check block itself.
- Scoped data source failures inside `check` blocks are also surfaced as warnings, which is useful for drift detection when an external object has been deleted.
- The updated CI example assumes `jq` is available in the execution environment.
