# Validation Summary: How to Use the sha512() Function in OpenTofu

## Status
validated

## Post Type
Tutorial / Reference

## Technologies Covered
- OpenTofu
- Terraform (compatible function)
- HCL (HashiCorp Configuration Language)
- SHA-512 cryptographic hash function

## Sources Consulted
- OpenTofu official documentation on hash and crypto functions: https://opentofu.org/docs/language/functions/sha512/
- OpenTofu functions index: https://opentofu.org/docs/language/functions/
- Terraform `sha512` function documentation (for cross-reference): https://developer.hashicorp.com/terraform/language/functions/sha512

## Issues Found
No technical issues found. The example `sha512(var.input)` is valid HCL syntax: `sha512()` accepts a single string argument and returns the hex-encoded SHA-512 digest of that string. The function does exist in OpenTofu's built-in function library, the `locals` and `output` blocks are syntactically correct, and the linked documentation URL resolves to the canonical functions reference.

## Review Notes
- The post is intentionally minimal. The "Syntax" code block is essentially empty (just a comment) and the "Practical Use Case" section does not contain a concrete example. These are stylistic/completeness gaps rather than technical errors, so per the review instructions (only fix technical errors, do not restructure or add content), no changes were made.
- A future revision could usefully mention that the output is a 128-character lowercase hex string, that SHA-512 is not suitable for password hashing on its own (use `bcrypt` or a KDF), and that for hashing file contents `filesha512()` is the correct companion function.
- No version-specific caveats: `sha512()` has been available since early Terraform releases and is supported in all current OpenTofu versions.
