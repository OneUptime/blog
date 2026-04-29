# Validation Summary: How to Use Lifecycle Customizations with Data Sources in OpenTofu

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- OpenTofu language (`data` blocks, `lifecycle`, `precondition`, `postcondition`, `self`)
- OpenTofu built-in functions (`contains`, `startswith`, `timecmp`, `timeadd`, `timestamp`)
- AWS provider data sources for OpenTofu/Terraform (`aws_vpc`, `aws_ami`, `aws_acm_certificate`, `aws_db_instance`)
- HCL configuration language

## Sources Consulted
- [OpenTofu Data Sources documentation](https://opentofu.org/docs/v1.11/language/data-sources/)
- [OpenTofu Custom Conditions documentation](https://opentofu.org/docs/language/expressions/custom-conditions/)
- [OpenTofu timecmp function documentation](https://opentofu.org/docs/language/functions/timecmp/)
- [OpenTofu timeadd function documentation](https://opentofu.org/docs/language/functions/timeadd/)
- [OpenTofu timestamp function documentation](https://opentofu.org/docs/language/functions/timestamp/)
- [AWS provider `aws_vpc` data source docs (official source)](https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/d/vpc.html.markdown)
- [AWS provider `aws_ami` data source docs (official source)](https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/d/ami.html.markdown)
- [AWS provider `aws_acm_certificate` data source docs (official source)](https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/d/acm_certificate.html.markdown)
- [AWS provider `aws_db_instance` data source docs (official source)](https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/d/db_instance.html.markdown)
- [AWS provider `aws_db_instance` data source implementation (official source)](https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/internal/service/rds/instance_data_source.go)

## Issues Found
1. **Incomplete lifecycle support matrix**: The post said data sources support only `precondition` and `postcondition` in `lifecycle`. Current OpenTofu data-source `lifecycle` also supports `enabled`, and resource-only lifecycle arguments such as `replace_triggered_by` are not supported for data sources. Fixed the intro and the support/limitations section so the lifecycle matrix matches the current OpenTofu documentation.
2. **CIDR check did not match the explanation**: The VPC postcondition used `startswith(self.cidr_block, "10.0.")` but the error message said the VPC must be in `10.0.0.0/8`. The original condition only matched CIDRs beginning with `10.0.` and excluded valid `10.x.x.x` CIDRs within `10.0.0.0/8`. Fixed by changing the condition to `startswith(self.cidr_block, "10.")`.
3. **Invalid RDS data source attribute**: The postcondition example referenced `self.db_instance_status`, but the current AWS provider `aws_db_instance` data source does not export that attribute. Fixed by replacing that check with a valid exported attribute, `self.storage_encrypted`.
4. **Overstated timing guarantee in the summary**: The summary claimed these checks surface errors "at plan time" before any changes are applied. OpenTofu evaluates custom conditions as early as possible, but conditions that depend on unknown values can be deferred until apply, and postconditions can block downstream changes rather than guaranteeing no prior actions occurred. Fixed the summary wording to match the official behavior.

## Review Notes
- No further technical issues found after the above corrections.
- The AMI age example using `timestamp()` is valid, but because `timestamp()` is only known during apply, that particular condition may be deferred until apply. Current OpenTofu also offers `plantimestamp()` for time-sensitive custom conditions that should compare against plan time.
- OpenTofu CLI was not installed in this workspace, so the review was documentation-based rather than a local `tofu validate` run.
