# Validation Summary: OpenTofu vs Terraform: Feature Parity and Key Differences

## Status
validated

## Post Type
Comparison guide / Reference

## Technologies Covered
- OpenTofu (1.6, 1.7, 1.8)
- Terraform (1.5+)
- HCL (HashiCorp Configuration Language)
- HCP Terraform (formerly Terraform Cloud)
- State encryption (PBKDF2 + AES-GCM)
- Provider-defined functions
- Backends: AWS S3, Azure Blob Storage, Google Cloud Storage, Consul, Kubernetes, HTTP, `cloud`, `remote`

## Sources Consulted
- OpenTofu 1.7 release notes — https://opentofu.org/docs/v1.7/intro/whats-new/
- OpenTofu 1.8 release notes — https://opentofu.org/docs/v1.8/intro/whats-new/
- OpenTofu state encryption documentation — https://opentofu.org/docs/language/state/encryption/
- OpenTofu installation documentation — https://opentofu.org/docs/intro/install/
- HCP Terraform Stacks documentation — https://developer.hashicorp.com/terraform/cloud-docs/stacks
- OpenTofu GitHub releases — https://github.com/opentofu/opentofu/releases (verified `latest/download/tofu_linux_amd64.zip` redirects correctly)

## Issues Found
1. **Provider-defined functions version was wrong.** The post stated provider-defined functions were introduced in OpenTofu 1.8+, but they were actually added in OpenTofu 1.7 (alongside state encryption). Updated the section heading from "Provider-Defined Functions (OpenTofu 1.8+)" to "(OpenTofu 1.7+)" and updated the version mapping table accordingly. Confirmed against the official OpenTofu 1.7 "What's New" page which lists provider-defined functions as a 1.7 feature.

2. **"Stacks (Terraform 1.9+)" subheading was misleading.** Stacks is an HCP Terraform feature, not a Terraform CLI 1.9+ feature — the HashiCorp docs do not specify a minimum Terraform CLI version requirement. Removed the "(Terraform 1.9+)" qualifier from the subheading and corrected the article to "an HCP Terraform feature" (was "a HCP Terraform feature").

3. **Version mapping table updated** to reflect that provider-defined functions are a 1.7 feature, and replaced the 1.8 row's "+ provider functions" entry with the actual 1.8 additions: early variable evaluation and `.tofu` file support.

## Review Notes
- State encryption HCL syntax (`key_provider "pbkdf2"`, `method "aes_gcm"`, `keys = key_provider.pbkdf2.<name>`, `state { method = ... }`, `plan { method = ... }`) verified against official OpenTofu state encryption docs and is correct.
- The download URL `https://github.com/opentofu/opentofu/releases/latest/download/tofu_linux_amd64.zip` is valid; GitHub redirects it to the latest versioned asset (currently v1.11.6).
- The provider-defined function call syntax `provider::aws::arn_parse(...)` is correct.
- The `cloud { ... }` block syntax for HCP Terraform is correct.
- The `remote` backend caveat for OpenTofu connecting to HCP Terraform is accurate.
- The OpenTofu registry URL `registry.opentofu.org` is correct.
- The post predates OpenTofu 1.9, 1.10, and 1.11 (current GA), which add features like ephemeral resources/write-only attributes, the `enabled` meta-argument, and S3 backend tag support. Future updates could mention these.
- Note on `required_version`: OpenTofu honors this constraint using its own version number, so `>= 1.6.0` will be satisfied by both OpenTofu 1.6+ and Terraform 1.6+. Users wanting strict OpenTofu-only enforcement may need additional tooling — the post's note is accurate enough as written.
