# Validation Summary: How to Use the base64decode and base64encode Functions in OpenTofu

## Status
validated

## Post Type
Tutorial / Reference guide

## Technologies Covered
- OpenTofu (`base64encode`, `base64decode`, `filebase64` functions, `tofu console`)
- HCL (HashiCorp Configuration Language)
- Terraform AWS provider (`aws_instance`, `aws_ssm_parameter`)
- Terraform Kubernetes provider (`kubernetes_secret`)
- AWS EC2 user data
- cloud-init

## Sources Consulted
- OpenTofu language functions: `base64encode`, `base64decode`, `filebase64` (https://opentofu.org/docs/language/functions/base64encode/, https://opentofu.org/docs/language/functions/base64decode/, https://opentofu.org/docs/language/functions/filebase64/)
- Terraform AWS provider `aws_instance` resource (https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/instance) — specifically the `user_data` vs `user_data_base64` semantics
- Terraform Kubernetes provider `kubernetes_secret_v1` resource (https://registry.terraform.io/providers/hashicorp/kubernetes/latest/docs/resources/secret_v1) — specifically the `data` vs `binary_data` semantics and the use of `StringData` in the provider source
- RFC 4648 (Base64 encoding) for verifying the encoded sample strings (`aGVsbG8gd29ybGQ=`, `aGVsbG8=`)

## Issues Found
1. **EC2 user data example would double-encode (fixed).** The original example assigned `base64encode(local.user_data_script)` to `aws_instance.user_data`. The AWS provider already base64-encodes `user_data` automatically before sending it to the EC2 API, so passing pre-encoded content via `user_data` causes double-encoding and the boot script never executes. Fixed by switching the assignment to `user_data_base64`, which is the documented argument for accepting already-base64-encoded payloads. The accompanying comment was also updated to clarify the distinction between `user_data` and `user_data_base64`.

2. **Kubernetes secret example would double-encode (fixed).** The original example wrapped each value in `data` with `base64encode(...)`. The Terraform Kubernetes provider sends `data` values via Kubernetes' `StringData` field, which the API server base64-encodes server-side, so the explicit call results in double-encoded secrets. Fixed by removing the `base64encode` calls and updating the inline comment to point readers at `binary_data` for pre-encoded values.

## Review Notes
- Base64 sample outputs in the "Basic Examples" and "Step-by-Step Usage" sections (`aGVsbG8gd29ybGQ=`, `aGVsbG8=`) are correct per RFC 4648.
- The `base64encode` vs `filebase64` table is accurate; both functions exist in OpenTofu and behave as described.
- The "Encoding Cloud Init MIME" section's heading is slightly misleading — the sample encodes a single cloud-config YAML rather than a true MIME multipart payload — but the code itself is technically correct, so it was left alone per the "fix only technical errors" guidance.
- `tofu console` with the shown `>` prompt and outputs is accurate; this matches Terraform/OpenTofu console behavior for these functions.
