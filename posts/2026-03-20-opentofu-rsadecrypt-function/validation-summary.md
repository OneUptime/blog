# Validation Summary: How to Use the rsadecrypt Function in OpenTofu

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- OpenTofu (`rsadecrypt` built-in function)
- Terraform / HCL syntax
- AWS provider (`aws_instance`, `aws_key_pair`, `aws_db_instance`, `aws_ssm_parameter`)
- TLS provider (`tls_private_key`)
- Windows EC2 password retrieval workflow
- RSA / PEM-encoded keys

## Sources Consulted
- OpenTofu `rsadecrypt` function docs: https://opentofu.org/docs/language/functions/rsadecrypt/
- AWS provider `aws_instance` resource docs (HashiCorp): https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/instance
- AWS provider `aws_instance` data source docs: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/data-sources/instance
- AWS provider `aws_ssm_parameter` resource docs: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/ssm_parameter
- TLS provider `tls_private_key` resource docs: https://registry.terraform.io/providers/hashicorp/tls/latest/docs/resources/private_key
- AWS provider `aws_db_instance` resource docs: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/db_instance

## Issues Found

1. **Missing `get_password_data = true` on `aws_instance`** (Windows EC2 example).
   - What was wrong: The `aws_instance` resource only populates the `password_data` attribute when the `get_password_data` argument is explicitly set to `true`. Without it, `password_data` is empty and `rsadecrypt` would fail.
   - Fix: Added `get_password_data = true` to the `aws_instance "windows"` resource block, plus a clarifying inline comment near the output.

2. **Unused `data "aws_instance" "windows_data"` block.**
   - What was wrong: The example included a data source block referencing the just-created instance, but never used it — the output read `password_data` from the resource directly. This was misleading and implied `data "aws_instance"` was required for password retrieval.
   - Fix: Removed the unused data source block.

3. **Invalid `sensitive = true` argument on `aws_ssm_parameter`.**
   - What was wrong: `aws_ssm_parameter` has no `sensitive` argument; this is not a valid resource argument and would fail at plan/apply time. The `sensitive` meta-argument applies to variables and outputs, not to AWS provider resource attributes. Note: the AWS provider already marks `aws_ssm_parameter.value` as sensitive automatically in plan output, so the argument is also unnecessary.
   - Fix: Removed `sensitive = true` from the `aws_ssm_parameter "token"` resource.

## Review Notes

- The core technical claim about `rsadecrypt` (Base64-encoded RSA-encrypted ciphertext + PEM-encoded private key) is accurate per OpenTofu docs. PKCS#1 v1.5 padding is what AWS uses for Windows password encryption, so this is compatible.
- `tls_private_key` with `algorithm = "RSA"` and `rsa_bits = 4096` is valid; `public_key_openssh` and `private_key_pem` are correct exported attributes.
- PostgreSQL `engine_version = "14.7"` is syntactically valid in HCL but may have moved to RDS extended/end-of-standard support depending on AWS's current support window. Left as-is since the example focuses on `rsadecrypt` and the version string is illustrative; readers should pick a currently-supported minor for production use.
- Storing the RSA private key as a file read from disk (`file(...)`) is reasonable for tutorial purposes; the post correctly calls out in the Security Considerations section that private keys should not be committed to source control.
- The data source `data "aws_ami" "windows"` referenced by `aws_instance.windows.ami` is not defined in the snippet; this is a tutorial omission rather than a technical error and is consistent with focused code examples.
