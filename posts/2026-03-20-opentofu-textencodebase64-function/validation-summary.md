# Validation Summary: How to Use textencodebase64() in OpenTofu

## Status
validated

## Post Type
Tutorial / Reference guide

## Technologies Covered
- OpenTofu / Terraform (HCL language)
- `textencodebase64()` built-in function
- Base64 encoding
- Character encodings: UTF-8, UTF-16LE, UTF-16BE, ISO-8859-1, windows-1252
- Azure Resource Manager (`azurerm_virtual_machine_extension`, Custom Script Extension)
- PowerShell `-EncodedCommand` parameter
- AWS Systems Manager (referenced)

## Sources Consulted
- OpenTofu `textencodebase64` documentation: https://opentofu.org/docs/language/functions/textencodebase64/
- IANA Character Set Registry: https://www.iana.org/assignments/character-sets/character-sets.xhtml
- Verified Base64 outputs locally using `base64` and `iconv` to confirm UTF-8/UTF-16LE/UTF-16BE encodings of "Hello, World!" and "Hello"
- Azure VM Extensions (Custom Script Extension for Windows) — `Microsoft.Compute` / `CustomScriptExtension` v1.10 is the standard handler

## Issues Found
- **"CP1252" is not a valid IANA encoding name** — The post listed `"CP1252"` in the supported encodings section. The IANA character set registry only lists `windows-1252` (canonical) and `cswindows1252` as the registered names; `CP1252` is not a registered alias. Since OpenTofu uses Go's `golang.org/x/text/encoding/ianaindex` which looks up names against the IANA registry, `CP1252` would likely fail. Changed the example to use `windows-1252` (and updated the comment label accordingly).

## Review Notes
- All three Base64 outputs in the "Basic Usage" section were verified byte-for-byte:
  - `"Hello, World!"` (UTF-8) → `SGVsbG8sIFdvcmxkIQ==` ✓
  - `"Hello"` (UTF-16LE) → `SABlAGwAbABvAA==` ✓
  - `"Hello"` (UTF-16BE) → `AEgAZQBsAGwAbw==` ✓
- The function syntax `textencodebase64(string, encoding)` matches the official documentation (which calls the second arg `encoding_name`, but positionally it is the same).
- The PowerShell `-EncodedCommand` claim is accurate — PowerShell requires UTF-16LE Base64 for that parameter, which is the canonical real-world use case for this function.
- The Azure `azurerm_virtual_machine_extension` example is structurally correct (publisher `Microsoft.Compute`, type `CustomScriptExtension`, type_handler_version `1.10` are valid for Windows VMs).
- The `base64encode("Hello") == textencodebase64("Hello", "UTF-8")` equality claim for ASCII text is accurate; both produce `SGVsbG8=`.
- The note that `base64encode()` always uses UTF-8 internally is correct per the OpenTofu docs.
