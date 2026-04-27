# Validation Summary: How to Use the uuidv5 Function in OpenTofu

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- OpenTofu (`uuidv5` built-in function)
- HCL (HashiCorp Configuration Language)
- Terraform (compatible function)
- AWS provider resources (`aws_s3_bucket`, `aws_ssm_parameter`)
- `random_uuid` resource (Random provider)
- RFC 4122 UUID v5 (SHA-1 based, name-based UUIDs)

## Sources Consulted
- OpenTofu docs — `uuidv5` function: https://opentofu.org/docs/language/functions/uuidv5/
- Terraform docs — `uuidv5` function (function semantics are equivalent): https://developer.hashicorp.com/terraform/language/functions/uuidv5
- RFC 4122 — A Universally Unique IDentifier (UUID) URN Namespace, Appendix C (well-known namespace IDs): https://datatracker.ietf.org/doc/html/rfc4122
- Python `uuid` module (reference RFC 4122 implementation) — used to compute canonical v3 and v5 outputs for `("dns", "example.com")` to verify the example output.
- OpenTofu docs — `substr` function: https://opentofu.org/docs/language/functions/substr/
- Random provider — `random_uuid` resource: https://registry.terraform.io/providers/hashicorp/random/latest/docs/resources/uuid

## Issues Found
- **Incorrect example UUID output in the "Step-by-Step Usage" section.** The post showed `uuidv5("dns", "example.com")` returning `"9073926b-929f-31c2-abc9-fad77ae3e8eb"`. That value is actually the UUID v3 (MD5-based) of the same input — the version digit (third group, first character) is `3`, not `5`. The canonical v5 (SHA-1 based) output for the DNS namespace + `"example.com"` is `cfbff0d1-9375-5685-968c-48ce8b15ae17` (verified with Python's reference `uuid.uuid5(uuid.NAMESPACE_DNS, "example.com")`). Replaced both occurrences in the console example with the correct v5 value.

## Review Notes
- The four predefined namespace aliases (`"dns"`, `"url"`, `"oid"`, `"x500"`) are correct and map to the well-known namespace UUIDs from RFC 4122 Appendix C.
- The "Custom namespace" example uses `6ba7b810-9dad-11d1-80b4-00c04fd430c8`, which happens to be the well-known DNS namespace UUID. It is still a syntactically valid custom-namespace UUID for the example, but readers may find it slightly confusing since it is identical to the namespace they'd get via the `"dns"` alias. Not a technical error — left as-is per the "fix only what is wrong" guideline.
- The `random_uuid` row in the comparison table marks "Deterministic" as "Yes (in state)". This is a reasonable shorthand: the value is generated randomly once at creation and then persisted in state, so subsequent plans see a stable value. Not strictly "deterministic" in the cryptographic sense, but the parenthetical qualifier makes the intent clear.
- All HCL snippets (variable, locals, output, `aws_s3_bucket`, `aws_ssm_parameter`) are syntactically valid; `substr(string, offset, length)` is used correctly.
