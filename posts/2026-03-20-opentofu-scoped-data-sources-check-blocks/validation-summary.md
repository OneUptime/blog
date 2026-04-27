# Validation Summary: How to Use Scoped Data Sources in Check Blocks in OpenTofu

## Status
validated

## Post Type
Tutorial / Technical Guide

## Technologies Covered
- OpenTofu (check blocks, scoped data sources, assertions)
- Terraform HCL
- `hashicorp/http` provider (`http` data source)
- `hashicorp/dns` provider (`dns_a_record_set` data source)
- `hashicorp/aws` provider (`aws_instance`, `aws_ami`, `aws_route53_record`, `aws_eip` data sources/resources)
- OpenTofu built-in functions: `length`, `contains`, `timecmp`, `timeadd`, `timestamp`

## Sources Consulted
- OpenTofu Checks documentation: https://opentofu.org/docs/language/checks/
- HashiCorp HTTP provider data source docs: https://github.com/hashicorp/terraform-provider-http/blob/main/docs/data-sources/http.md
- HashiCorp DNS provider `a_record_set` data source: https://raw.githubusercontent.com/hashicorp/terraform-provider-dns/main/docs/data-sources/a_record_set.md
- HashiCorp AWS provider `aws_db_instance` data source: https://github.com/hashicorp/terraform-provider-aws/blob/main/website/docs/d/db_instance.html.markdown
- HashiCorp AWS provider `aws_instance` data source: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/d/instance.html.markdown

## Issues Found
1. **HTTP timeout argument name was incorrect.** The post used `request_timeout = 10000` for the `http` data source. The official `hashicorp/http` provider accepts `request_timeout_ms`, not `request_timeout`. Fixed by renaming the argument to `request_timeout_ms` in the "HTTP Endpoint Validation" section (the value 10000 ms / 10 s is unchanged and correct).
2. **`aws_db_instance` data source does not expose a status attribute.** The "Querying Cloud Resources for Validation" example asserted on `data.aws_db_instance.main.db_instance_status == "available"`, but the AWS provider's `aws_db_instance` data source has no `db_instance_status` (or any other status) attribute. Replaced the example with an `aws_instance` data source that uses the well-documented `instance_state` attribute (asserts the instance is `"running"`), which preserves the spirit of the section — querying a cloud resource for validation — while being technically correct.

## Review Notes
- The OpenTofu checks/scoped-data-source semantics described in the introduction and conclusion (warnings rather than blocking errors, no resource-graph dependencies) match the official OpenTofu docs.
- The `dns_a_record_set` example uses the correct `host` argument and `addrs` attribute.
- The `aws_ami` example uses real attributes (`creation_date`) and built-in functions (`timecmp`, `timeadd`, `timestamp`) that exist in OpenTofu.
- The `tofu apply` warning text in "Handling Data Source Failures in Checks" is illustrative rather than verbatim CLI output; the wording isn't an exact match to OpenTofu's actual emitted warnings, but it conveys the correct semantic (warning, non-blocking) and was left as-is.
