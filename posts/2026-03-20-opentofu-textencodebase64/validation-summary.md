# Validation Summary: How to Use the textencodebase64 and textdecodebase64 Functions in OpenTofu

## Status
validated

## Post Type
Tutorial / Reference guide

## Technologies Covered
- OpenTofu (textencodebase64 / textdecodebase64 built-in functions)
- HCL (HashiCorp Configuration Language)
- Azure / azurerm provider (azurerm_windows_virtual_machine)
- Kubernetes provider (kubernetes_secret)
- IANA character encodings (UTF-8, UTF-16LE, UTF-16BE, UTF-32, ISO-8859-1)

## Sources Consulted
- OpenTofu textencodebase64 docs: https://opentofu.org/docs/language/functions/textencodebase64/
- OpenTofu textdecodebase64 docs: https://opentofu.org/docs/language/functions/textdecodebase64/
- HashiCorp Terraform provider for Kubernetes (secret_v1 resource docs in github.com/hashicorp/terraform-provider-kubernetes/docs/resources/secret_v1.md)
- IANA character set registry (referenced by OpenTofu docs)

## Issues Found
1. **Kubernetes secret example used `data` instead of `binary_data`.** The `textencodebase64` function returns an already-base64-encoded string. The kubernetes_secret `data` field accepts plaintext values and base64-encodes them itself before sending to the Kubernetes API, which would double-encode the payload. The correct field for pre-base64-encoded values is `binary_data` (per the provider docs: "A map of the secret data in base64 encoding. Use this for binary data."). Changed `data` to `binary_data` in the example and clarified the inline comment.

## Review Notes
- Function signatures, parameter ordering, and the `tofu console` example outputs are all correct and verified against the official OpenTofu documentation (the canonical doc example `textencodebase64("Hello World", "UTF-16LE")` → `SABlAGwAbABvACAAVwBvAHIAbABkAA==` matches the post's described behavior).
- The OpenTofu docs name the second parameter `encoding_name`; the post calls it `encoding`. Since the function is positional, this cosmetic difference does not affect correctness.
- The Azure AD UTF-16LE-quoted-password pattern is accurate for Active Directory `unicodePwd`-style password operations and is sometimes used in Azure Windows VM provisioning flows.
- The supported encodings list is reasonable. OpenTofu only exposes the subset of IANA-registered encodings implemented by Go's `golang.org/x/text/encoding` package; UTF-8, UTF-16LE/BE, UTF-32, and ISO-8859-1 are all supported, though the exact subset can vary by OpenTofu/Go version (the upstream docs themselves note this caveat).
