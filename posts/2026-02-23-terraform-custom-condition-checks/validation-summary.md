# Validation Summary: How to Use Custom Condition Checks in Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform configuration language
- Terraform variable validation
- Terraform lifecycle preconditions and postconditions
- Terraform check blocks
- AWS Terraform provider
- HTTP and TLS Terraform provider data sources

## Sources Consulted
- HashiCorp Terraform validation documentation: https://developer.hashicorp.com/terraform/language/validate
- HashiCorp Terraform variable block reference: https://developer.hashicorp.com/terraform/language/block/variable
- HashiCorp Terraform lifecycle meta-argument reference: https://developer.hashicorp.com/terraform/language/meta-arguments/lifecycle
- HashiCorp Terraform resource block reference: https://developer.hashicorp.com/terraform/language/block/resource
- HashiCorp Terraform check block reference: https://developer.hashicorp.com/terraform/language/block/check
- HashiCorp Terraform built-in functions reference: https://developer.hashicorp.com/terraform/language/functions
- HashiCorp Terraform timestamp function reference: https://developer.hashicorp.com/terraform/language/functions/timestamp
- HashiCorp Terraform plantimestamp function reference: https://developer.hashicorp.com/terraform/language/functions/plantimestamp
- HashiCorp AWS provider aws_db_instance resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/db_instance
- HashiCorp AWS provider aws_acm_certificate data source documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/data-sources/acm_certificate
- HashiCorp TLS provider tls_certificate data source documentation: https://registry.terraform.io/providers/hashicorp/tls/latest/docs/data-sources/certificate

## Issues Found
- The private CIDR validation allowed all `172.*` ranges even though RFC 1918 only includes `172.16.0.0/12`. Updated the regular expression to allow only `172.16` through `172.31`, and made the prefix-length validation use `try()` so malformed CIDR input does not cause an expression error.
- The precondition example referenced `data.aws_subnet.selected` without declaring it. Added the missing `aws_subnet` data source.
- The AMI age example used `timestamp()`, whose result is not predictable during planning. Replaced it with `plantimestamp()`, which Terraform documents for time-sensitive validation.
- The data source lifecycle example used `self` in a precondition. Since `self` is appropriate for validating the read result after the data source is evaluated, changed the example and heading to use a postcondition.
- The RDS postcondition checked `self.storage_encrypted == true` but the resource example did not enable encryption. Added `storage_encrypted = true`.
- The output value section referred to output postconditions, but Terraform outputs support preconditions. Updated the heading and explanatory sentence to match the code and documentation.
- The check block explanation and decision table said checks run after apply only. Updated them to say checks run at the end of plan or apply.
- The certificate expiry check used `data.aws_acm_certificate.app.not_after`, but the AWS ACM certificate data source does not export `not_after`. Replaced the example with the `tls_certificate` data source, which exports `certificates[*].not_after`.
- The AWS region validation regex rejected valid AWS region formats such as `ca-central-1`. Replaced it with a broader format regex and updated the example message.

## Review Notes
Terraform CLI is not installed in this environment, so I could not run `terraform validate`. The examples were reviewed against official HashiCorp Terraform language documentation and current HashiCorp provider documentation.
