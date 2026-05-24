# Validation Summary: How to Create Time-Based Offsets with Terraform

## Status
validated

## Post Type
Tutorial / Technical Guide

## Technologies Covered
- Terraform (>= 1.5.0)
- HashiCorp `time` provider (`time_offset`, `time_static`)
- HashiCorp `tls` provider (`tls_private_key`, `tls_self_signed_cert`)
- HashiCorp `aws` provider (`aws_ssm_parameter`, `aws_db_instance`, `aws_instance`)
- HCL syntax (resources, variables, locals, outputs)

## Sources Consulted
- HashiCorp `time` provider — `time_offset` resource docs (https://github.com/hashicorp/terraform-provider-time/blob/main/docs/resources/offset.md and Terraform Registry)
- HashiCorp `time` provider — `time_static` resource docs
- HashiCorp `tls` provider — `tls_self_signed_cert` resource docs (https://github.com/hashicorp/terraform-provider-tls/blob/main/docs/resources/self_signed_cert.md)
- HashiCorp `aws` provider — `aws_db_instance` and `aws_ssm_parameter` resource docs
- Terraform version constraint syntax (pessimistic `~>` operator)

## Issues Found
No technical issues found. Verifications performed:
- `time_offset` input arguments (`base_rfc3339`, `offset_years`, `offset_months`, `offset_days`, `offset_hours`, `offset_minutes`, `offset_seconds`) all match the official schema.
- `time_offset` output attributes (`year`, `month`, `day`, `hour`, `minute`, `second`, `unix`, `rfc3339`, `base_rfc3339`) all match the official schema.
- `time_static.rfc3339` attribute is valid for use as a `base_rfc3339` input.
- `tls_self_signed_cert` required arguments (`private_key_pem`, `validity_period_hours`, `allowed_uses`) are correctly used; `key_encipherment`, `digital_signature`, and `server_auth` are valid `allowed_uses` values.
- `aws_db_instance` `maintenance_window` format `ddd:hh24:mi-ddd:hh24:mi` is correct.
- Provider version constraint `~> 0.11` for `hashicorp/time` correctly allows >= 0.11, < 1.0, which covers current 0.x releases.
- Negative offsets (e.g., `offset_days = -90`) are supported by the provider.

## Review Notes
- The "Resource Lifecycle Dates" line (line 189) is missing the `##` markdown heading prefix used by every other section, so it renders as plain text instead of a header. This is a markdown formatting issue rather than a technical correctness issue, so it was left unchanged per review scope (no stylistic changes).
- In the "Defining Maintenance Windows" example, `variable "maintenance_start_hour"` is declared but never referenced — the RDS `maintenance_window` is hardcoded to `sun:02:00-sun:06:00`. Not a technical error, but a future improvement could wire the variable into the window string.
- The example `aws_instance` uses a placeholder AMI `ami-12345678`; readers should substitute a current AMI ID for their region.
- The hardcoded `password = "temporary-password"` on `aws_db_instance` is illustrative only; production usage should source secrets from AWS Secrets Manager or `random_password`.
- `time_offset` recalculates only when arguments (or the `triggers` map) change — it does not drift on subsequent applies, which is the intended behavior but worth understanding when using it for "expiration" semantics.
