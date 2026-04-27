# Validation Summary: How to Generate Random IDs for Resource Naming with OpenTofu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTofu / Terraform
- HashiCorp `random` provider (`random_id`, `random_string`)
- AWS S3 (`aws_s3_bucket`)
- AWS EC2 (`aws_instance`)
- Azure Storage Account (`azurerm_storage_account`)
- HCL `for_each`, `count`, `locals`, `output`

## Sources Consulted
- Terraform Registry — random_id resource: https://registry.terraform.io/providers/hashicorp/random/latest/docs/resources/id
- Terraform Registry — random_string resource: https://registry.terraform.io/providers/hashicorp/random/latest/docs/resources/string
- terraform-provider-random GitHub repository and CHANGELOG: https://github.com/hashicorp/terraform-provider-random
- Azure Storage Account naming rules: https://learn.microsoft.com/en-us/azure/storage/common/storage-account-overview
- RFC 4648 — Base64url Encoding: https://datatracker.ietf.org/doc/html/rfc4648

## Issues Found
- **`b64_url` example output length was inaccurate.** The post showed `app-assets-PyrJw02K` (8 base64 characters) for a `random_id` resource configured with `byte_length = 8`. The `b64_url` attribute uses Go's `base64.RawURLEncoding` (unpadded URL-safe base64), so 8 bytes = 64 bits encodes to 11 characters, not 8. Updated the example output to `app-assets-PyrJw02K3eY` so the demonstrated string length matches what the provider actually produces.

## Review Notes
- All other technical claims are accurate and align with current provider behavior:
  - `random_id` arguments (`byte_length`, `keepers`) and outputs (`hex`, `b64_url`) are correct.
  - `random_string` arguments (`length`, `special`, `upper`, `numeric`) and the `result` output are correct. Note that `numeric` replaced the deprecated `number` argument in random provider v3.3.0 (June 2022); the post correctly uses the modern name.
  - `byte_length = 4` producing 8 hex characters and ~4 billion combinations (2^32) is accurate.
  - `byte_length = 8` producing 16 hex characters is accurate.
  - `for_each` with `random_id` and using `each.key` inside `keepers` is supported and works as described — each instance gets a stable, independent suffix tied to its key.
  - Azure storage account naming constraints (lowercase alphanumeric, max 24 chars) are correct.
  - `aws_instance` `count` + interpolation in tags, and the `output` block syntax, are all valid HCL.
- Minor consideration for future updates: setting `keepers = { deployment_date = "2026-03" }` on `random_id.deployment` and then attaching `random_id.deployment.hex` as an `aws_instance` tag means changing the keeper will force-replace the instances (since the tag value changes). This is the intended "rolling deployment" behavior the post describes, but readers should be aware that `aws_instance` tag changes themselves don't force replacement — the instance dependency on the changing `random_id` does.
