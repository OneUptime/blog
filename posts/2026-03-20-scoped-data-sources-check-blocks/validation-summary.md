# Validation Summary: How to Use Scoped Data Sources in Check Blocks in OpenTofu - A Practical Guide

## Status
validated

## Post Type
Tutorial / practical guide

## Technologies Covered
- OpenTofu check blocks
- OpenTofu scoped data sources
- Terraform/OpenTofu HCL
- HashiCorp HTTP provider
- HashiCorp AWS provider
- HashiCorp DNS provider

## Sources Consulted
- OpenTofu Checks documentation: https://opentofu.org/docs/language/checks/
- HashiCorp HTTP provider `http` data source documentation: https://github.com/hashicorp/terraform-provider-http/blob/main/docs/data-sources/http.md
- HashiCorp AWS provider `aws_s3_bucket` data source documentation: https://github.com/hashicorp/terraform-provider-aws/blob/main/website/docs/d/s3_bucket.html.markdown
- HashiCorp AWS provider `aws_s3_bucket_versioning` resource documentation: https://github.com/hashicorp/terraform-provider-aws/blob/main/website/docs/r/s3_bucket_versioning.html.markdown
- HashiCorp DNS provider `dns_a_record_set` data source documentation: https://github.com/hashicorp/terraform-provider-dns/blob/main/docs/data-sources/a_record_set.md
- HashiCorp AWS provider `aws_acm_certificate` data source documentation: https://github.com/hashicorp/terraform-provider-aws/blob/main/website/docs/d/acm_certificate.html.markdown
- HashiCorp AWS provider `aws_db_instance` data source documentation: https://github.com/hashicorp/terraform-provider-aws/blob/main/website/docs/d/db_instance.html.markdown
- HashiCorp AWS provider `aws_vpc` data source documentation: https://github.com/hashicorp/terraform-provider-aws/blob/main/website/docs/d/vpc.html.markdown

## Issues Found
- The introduction said check blocks can contain a single `data` block. OpenTofu documents this as zero-to-one scoped data sources, so the wording was changed to "zero or one" for precision.
- The S3 versioning example used `data.aws_s3_bucket.state_versioning.versioning[0].enabled`, but the `aws_s3_bucket` data source does not export a `versioning` block. The example was changed to validate the exported `bucket_region` attribute instead.
- The first S3 check was named `state_bucket_secure` even though it only checked bucket existence metadata. It was renamed to `state_bucket_exists` to match the assertion.
- The RDS example used `data.aws_db_instance.primary.db_instance_status`, but the AWS provider `aws_db_instance` data source does not export that attribute. The assertion was changed to validate the exported `storage_encrypted` attribute.

## Review Notes
The remaining examples use documented provider attributes and valid check-block structure. The snippets are partial examples and assume provider configuration, variables, and referenced managed resources such as `aws_lb.main` and `aws_db_instance.main` are defined elsewhere.
