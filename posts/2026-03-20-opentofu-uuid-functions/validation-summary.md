# Validation Summary: How to Use uuid() and uuidv5() in OpenTofu

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- OpenTofu (`uuid()` and `uuidv5()` built-in functions)
- Terraform HCL syntax
- `hashicorp/random` provider (`random_uuid` resource)
- AWS provider resources (`aws_instance`, `aws_s3_bucket`) used illustratively
- UUID v4 (random) and UUID v5 (deterministic, namespace-based) per RFC 4122

## Sources Consulted
- OpenTofu `uuid` function documentation: https://opentofu.org/docs/language/functions/uuid/
- OpenTofu `uuidv5` function documentation: https://opentofu.org/docs/language/functions/uuidv5/
- `hashicorp/random` provider `random_uuid` resource documentation: https://registry.terraform.io/providers/hashicorp/random/latest/docs/resources/uuid
- RFC 4122 (UUID specification): https://datatracker.ietf.org/doc/html/rfc4122
- Python `uuid` standard library used to independently compute UUID v5 outputs against the canonical RFC 4122 namespaces (DNS, URL, OID, X500)

## Issues Found
1. **Invalid UUID v4 format in `uuid()` example outputs.** The original examples were:
   - `b5ee72a3-54dd-90af-1f1e-8a94a76fb7a6`
   - `a91b0f73-e23c-a8d2-c9f5-3d0e8b2a5c4f`

   Per RFC 4122, a valid version 4 UUID must have `4` as the first hex digit of the third group, and one of `8`, `9`, `a`, `b` as the first hex digit of the fourth group (the variant bits). The original values failed both checks, so they could not have been produced by `uuid()`. Replaced with correctly formatted v4 examples:
   - `b5ee72a3-54dd-4f3a-9f1e-8a94a76fb7a6`
   - `a91b0f73-e23c-48d2-89f5-3d0e8b2a5c4f`

2. **Incorrect computed value for `uuidv5("url", "https://example.com/path")`.** The post claimed the output was `90c00a69-f4b2-5b8f-a9f8-e9a4d5df7c0f`. UUID v5 is deterministic (SHA-1 over the namespace UUID concatenated with the name), and the actual value with the URL namespace (`6ba7b811-9dad-11d1-80b4-00c04fd430c8`) is `0a3c3c32-4c00-5e0b-8943-2eb8d80ab693`. Verified against Python's `uuid.uuid5(uuid.NAMESPACE_URL, ...)`. Updated the post to the correct value.

   Verified the other claimed v5 output (`uuidv5("dns", "example.com")` → `cfbff0d1-9375-5685-968c-48ce8b15ae17`) is correct and left unchanged. The OID and X500 examples use `"..."` placeholders, so no values to verify there.

## Review Notes
- The four namespace shortcut strings used (`"dns"`, `"url"`, `"oid"`, `"x500"`) are all valid in OpenTofu's `uuidv5()` per the official docs.
- Behavioral claims are accurate: `uuid()` produces a new value on every plan/apply (which is why it triggers replacement when used in resource arguments that force replacement), and `uuidv5()` is deterministic for the same namespace+name.
- The `random_uuid` resource recommendation is correct — it stores the generated UUID in state, so it remains stable across plans unless explicitly replaced (e.g., via `terraform/tofu taint` or a `replace_triggered_by` lifecycle setting).
- OpenTofu/Terraform CLI was not available locally, so v5 outputs were verified via Python's `uuid` module, which implements the same RFC 4122 algorithm and produces identical results.
