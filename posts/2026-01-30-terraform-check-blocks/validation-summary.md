# Validation Summary: How to Create Terraform Check Blocks

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform (1.5+, check blocks language feature)
- HashiCorp `http` data source provider
- HashiCorp `tls` data source provider
- HashiCorp `dns` data source provider
- AWS provider (`aws_s3_bucket`, `aws_lb_target_group`, `aws_instance`, `aws_route53_record`, `aws_eks_cluster` data sources/resources)
- HCL (HashiCorp Configuration Language)
- GitHub Actions (CI/CD example)

## Sources Consulted
- [Checks - Terraform language docs](https://developer.hashicorp.com/terraform/language/checks)
- [Custom conditions (preconditions/postconditions) - Terraform docs](https://developer.hashicorp.com/terraform/language/expressions/custom-conditions)
- [terraform-provider-http data source docs (GitHub)](https://github.com/hashicorp/terraform-provider-http/blob/main/docs/data-sources/http.md)
- [terraform apply CLI reference](https://developer.hashicorp.com/terraform/cli/commands/apply)
- [GitHub issue #33174 - request for `-detailed-exitcode` on apply](https://github.com/hashicorp/terraform/issues/33174)
- Terraform Registry docs for `aws_s3_bucket` data source (`website_endpoint` attribute)

## Issues Found

1. **`response_time_ms` attribute does not exist on the `http` data source.**
   - Where: "Write Helpful Error Messages" best practice example.
   - Original code referenced `data.http.api.response_time_ms < 1000`. The hashicorp/http data source only exposes `id`, `response_body`, `response_body_base64`, `response_headers`, `status_code`, and the deprecated `body` attribute.
   - Fix: Replaced with an example that uses the real `status_code` attribute and an accordingly rewritten error message. The illustrative intent (informative error messages with interpolated values) is preserved.

2. **`!` operator applied to a string in the S3 example.**
   - Where: Example 4 (Verify S3 Bucket Configuration).
   - Original code: `condition = !data.aws_s3_bucket.data.website_endpoint`. The `website_endpoint` attribute is a string (empty string when website hosting is disabled), and Terraform's logical NOT operator only works on booleans — this would error at evaluation time.
   - Fix: Changed to `data.aws_s3_bucket.data.website_endpoint == ""`, which is the correct way to assert that website hosting is not enabled.

3. **`terraform apply` does not support `-detailed-exitcode`.**
   - Where: "Integration with CI/CD" section.
   - Original code recommended `terraform apply -auto-approve -detailed-exitcode` and branched on `exit code 2` for check warnings. The `-detailed-exitcode` flag is only documented for `terraform plan`, and `terraform apply` returns exit code 0 on success regardless of check warnings. The feature is still tracked as an open request in hashicorp/terraform#33174.
   - Fix: Rewrote the GitHub Actions example to capture the apply log and detect warnings via `grep -q "Warning:"`, and added a note pointing readers to the open GitHub issue tracking the proposed feature.

## Review Notes

- The post's introduction (check blocks added in Terraform 1.5) is correct.
- The comparison table simplifies the timing of preconditions/postconditions ("Runs during: Plan" / "Apply"). In reality both run during both plan and apply phases, but the simplification reasonably reflects the dominant evaluation point for each (preconditions are evaluated before resource/configuration evaluation, postconditions after). Left as-is since the simplification is not strictly incorrect.
- The `aws_eks_cluster_auth` reference in Example 5 (`data.aws_eks_cluster_auth.main.token`) is used without an accompanying declaration. Since the example is illustrating multiple assertions rather than EKS auth setup, this is acceptable as an inline snippet; no change required.
- The HTTP provider `retry` block syntax (`attempts`, `min_delay_ms`, `max_delay_ms`) used in Pattern 2 matches the official hashicorp/http data source documentation.
- The `tls_certificate` and `dns_a_record_set` data source usages match their respective provider docs.
- The `plantimestamp()`, `timeadd()`, and `timecmp()` built-in functions used in the SSL expiry example are valid Terraform functions.
