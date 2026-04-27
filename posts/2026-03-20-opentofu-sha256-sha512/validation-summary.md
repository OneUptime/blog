# Validation Summary: How to Use the sha256 and sha512 Functions in OpenTofu

## Status
validated

## Post Type
Tutorial / Reference guide

## Technologies Covered
- OpenTofu (HCL functions: `sha256`, `sha512`, `base64sha256`, `file`, `fileset`, `jsonencode`, `length`, `join`)
- Terraform-compatible HCL
- AWS Lambda (`source_code_hash` requirement)
- AWS SSM Parameter Store (`aws_ssm_parameter`)
- `null_resource` with `local-exec` provisioner and lifecycle preconditions

## Sources Consulted
- OpenTofu language function reference: https://opentofu.org/docs/language/functions/sha256/ and https://opentofu.org/docs/language/functions/sha512/
- OpenTofu `base64sha256` reference: https://opentofu.org/docs/language/functions/base64sha256/
- OpenTofu `fileset` reference: https://opentofu.org/docs/language/functions/fileset/
- OpenTofu `local-exec` provisioner reference: https://opentofu.org/docs/language/resources/provisioners/local-exec/
- OpenTofu lifecycle preconditions/postconditions: https://opentofu.org/docs/language/expressions/custom-conditions/
- AWS Lambda `source_code_hash` documentation (Terraform AWS provider): https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/lambda_function
- NIST FIPS 180-4 (SHA-256/SHA-512 output sizes)
- Local verification: `printf "hello" | sha256sum` confirms `2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824`; hex output lengths verified as 64 and 128 characters respectively.

## Issues Found
No technical issues found.

- `sha256("hello")` value in the console example was independently verified and matches.
- Output lengths (64 hex chars for SHA-256, 128 for SHA-512) are correct.
- All HCL constructs used (`null_resource`, `local-exec` with `working_dir` and `command`, `lifecycle.precondition`, `fileset` with `**/*.js`, `file`, `jsonencode`, `aws_ssm_parameter` with `name`/`type`/`value`) are valid in current OpenTofu and the AWS provider.
- Recommendation to use `base64sha256` for AWS Lambda `source_code_hash` is accurate (AWS expects a base64-encoded SHA-256 of the deployment package).
- The "HMAC-Like" section is appropriately named — it is correctly framed as HMAC-like rather than actual HMAC, which is important since `sha256(salt || data)` is not a true HMAC construction.

## Review Notes
- The "Generating Secure Token Hashes" use case is technically valid as shown, but readers should be aware that storing only a SHA-256 of a high-entropy secret in SSM still leaves the original secret somewhere; for production password-style secrets, a slow KDF (bcrypt/scrypt/argon2) would be more appropriate. This is a usage caveat, not a technical error in the post.
- The `config_salt` default value `"my-company-salt-2024"` is just illustrative; in real use a salt should be unique per signed value and not committed in plaintext defaults.
- No version-specific caveats — `sha256`/`sha512` have been part of Terraform/OpenTofu's function library since early versions and the signatures shown remain current.
