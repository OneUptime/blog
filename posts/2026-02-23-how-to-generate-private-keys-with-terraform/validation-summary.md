# Validation Summary: How to Generate Private Keys with Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform (>= 1.5.0)
- HashiCorp TLS provider (~> 4.0) — `tls_private_key` resource
- HashiCorp AWS provider (~> 5.0) — `aws_key_pair`, `aws_secretsmanager_secret`, `aws_secretsmanager_secret_version`, `aws_instance`
- Terraform S3 backend (with DynamoDB locking)
- Cryptographic key algorithms: RSA, ECDSA (P256/P384/P521), ED25519

## Sources Consulted
- HashiCorp TLS Provider — `tls_private_key` resource documentation: https://github.com/hashicorp/terraform-provider-tls/blob/main/docs/resources/private_key.md
- HashiCorp TLS Provider Registry: https://registry.terraform.io/providers/hashicorp/tls/latest/docs/resources/private_key
- NIST SP 800-57 Part 1 Rev. 5 — key management recommendations and security strength equivalences
- HashiCorp AWS Provider documentation for `aws_key_pair`, `aws_secretsmanager_secret_version`, `aws_instance`

## Issues Found
1. **Misleading NIST recommendation comment for 3072-bit RSA.** The original comment read: `# 3072-bit RSA - recommended by NIST for use through 2030`. Per NIST SP 800-57 Part 1 Rev. 5, 2048-bit RSA (112-bit security) is the acceptable minimum **through** 2030, while 3072-bit RSA (128-bit security) is what NIST recommends for use **beyond** 2030. The original phrasing inverts this. Changed to: `# 3072-bit RSA - 128-bit security level, recommended by NIST for use beyond 2030`.

## Review Notes
- All `tls_private_key` resource attributes used in the post (`algorithm`, `rsa_bits`, `ecdsa_curve`) and all referenced output attributes (`private_key_pem`, `public_key_pem`, `public_key_openssh`, `private_key_openssh`, `public_key_fingerprint_md5`, `public_key_fingerprint_sha256`) are valid and match the official TLS provider v4.x schema.
- Supported `algorithm` values (`RSA`, `ECDSA`, `ED25519`) and `ecdsa_curve` values used (`P256`, `P384`, `P521`) are correct. The provider also supports `P224` (with documented limitations around `public_key_openssh` and fingerprints), but the post does not use it, so no action needed.
- The claim that P256 provides security equivalent to RSA 3072-bit is correct per NIST (both provide 128-bit security strength).
- The `aws_key_pair`, `aws_secretsmanager_secret`, `aws_secretsmanager_secret_version`, and `aws_instance` resource usages all use correct argument names and reference attributes appropriately.
- The S3 backend block uses the legacy `dynamodb_table` argument for state locking. This is still fully supported but, since Terraform 1.10, native S3 state locking via `use_lockfile = true` is available and removes the DynamoDB dependency. Not an error — just worth noting as a future modernization.
- MD5 fingerprints are exposed by the provider, but MD5 is cryptographically broken; in practice, SHA256 fingerprints should be preferred for identification. The post exposes both without warning, which is consistent with the provider's API but could be flagged in a future revision.
- Private key material is indeed stored in Terraform state; the post's security warning about state encryption and access control is accurate.
