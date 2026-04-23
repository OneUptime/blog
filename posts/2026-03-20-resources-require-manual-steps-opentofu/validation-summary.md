# Validation Summary: How to Handle Resources That Require Manual Steps in OpenTofu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTofu
- HCL
- OpenTofu lifecycle preconditions
- OpenTofu `terraform_data`
- OpenTofu `local-exec` provisioners
- OpenTofu CLI targeting with `-target`
- AWS Certificate Manager
- HashiCorp AWS provider for Terraform/OpenTofu

## Sources Consulted
- OpenTofu custom conditions documentation: https://opentofu.org/docs/language/expressions/custom-conditions/
- OpenTofu `local-exec` provisioner documentation: https://opentofu.org/docs/language/resources/provisioners/local-exec/
- OpenTofu provisioners without a resource documentation: https://opentofu.org/docs/language/resources/provisioners/null_resource/
- OpenTofu `terraform_data` managed resource documentation: https://opentofu.org/docs/language/resources/tf-data/
- OpenTofu string templates documentation: https://opentofu.org/docs/language/expressions/strings/
- OpenTofu `for` expressions documentation: https://opentofu.org/docs/language/expressions/for/
- OpenTofu types and values documentation: https://opentofu.org/docs/language/expressions/types/
- OpenTofu `plan` command and resource targeting documentation: https://opentofu.org/docs/cli/commands/plan/
- HashiCorp AWS provider `aws_acm_certificate` documentation source: https://github.com/hashicorp/terraform-provider-aws/blob/main/website/docs/r/acm_certificate.html.markdown
- HashiCorp AWS provider `aws_acm_certificate_validation` documentation source: https://github.com/hashicorp/terraform-provider-aws/blob/main/website/docs/r/acm_certificate_validation.html.markdown
- AWS Certificate Manager DNS validation documentation: https://docs.aws.amazon.com/acm/latest/userguide/dns-validation.html
- HashiCorp null provider `null_resource` documentation source: https://github.com/hashicorp/terraform-provider-null/blob/main/docs/resources/resource.md

## Issues Found
- The post used `null_resource` for provisioner-only resources. Updated the examples to use OpenTofu's built-in `terraform_data` resource with `triggers_replace`, and updated the tags, description, section heading, and summary to match current OpenTofu guidance.
- The `local-exec` example interpolated `aws_acm_certificate.main.domain_validation_options[*].resource_record_name` and `.resource_record_value` directly into strings. That produces collection values, not strings. Replaced it with an HCL template `for` loop that prints each validation option and uses the provider-exported record type.
- The output example indexed `aws_acm_certificate.main.domain_validation_options[0]`, but the AWS provider exports `domain_validation_options` as a set of objects, and ACM can return more than one validation option. Replaced the indexed access with a template `for` loop over all validation options.
- The `-target` section described targeting as a general phased deployment strategy. Updated it to describe exceptional bootstrapping cases, matching OpenTofu's warning that resource targeting is not recommended for routine operations.
- The DNS validation prompt used singular wording for records. Updated it to `record(s)` because ACM can require multiple CNAME records when subject alternative names are present.

## Review Notes
- The `precondition`, `local-exec`, `terraform_data`, `triggers_replace`, output, and `tofu apply -target=...` patterns now match current OpenTofu documentation.
- `tofu` and `terraform` were not installed in the local workspace, so CLI validation could not be run locally. Review was completed against official documentation and static HCL inspection.
- Provisioners and `-target` remain last-resort or exceptional-case patterns; future revisions could emphasize separate configurations or provider-native workflows for routine staged deployments.
