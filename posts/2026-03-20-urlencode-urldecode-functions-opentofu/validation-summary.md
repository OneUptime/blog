# Validation Summary: How to Use the urlencode and urldecode Functions in OpenTofu - Functions

## Status
validated

## Post Type
Tutorial / Reference

## Technologies Covered
- OpenTofu (HCL)
- Terraform-style functions (`urlencode`, `urldecode`, `base64encode`)
- AWS provider resources (`aws_s3_object`, `aws_api_gateway_resource`, `aws_api_gateway_rest_api`, `aws_ssm_parameter`)
- `hashicorp/http` provider (`data "http"`)

## Sources Consulted
- [OpenTofu `urlencode` function docs](https://opentofu.org/docs/language/functions/urlencode/)
- [OpenTofu `urldecode` function docs](https://opentofu.org/docs/language/functions/urldecode/)
- RFC 3986 (URI percent-encoding) and application/x-www-form-urlencoded behavior for the `+` vs `%20` distinction

## Issues Found
No technical issues found.

- All `urlencode()` example outputs are correct per OpenTofu's form-encoded behavior: spaces become `+`, `=` → `%3D`, `&` → `%26`, `@` → `%40`, `/` → `%2F`.
- `urldecode()` is a real OpenTofu function and the examples reverse the encoding correctly.
- The `aws_s3_object`, `aws_api_gateway_resource`, `aws_api_gateway_rest_api`, `aws_ssm_parameter`, and `data "http"` references all use valid attribute names.
- Syntax of the HCL snippets is correct.

## Review Notes
- The S3 example uses `urlencode(var.object_name)` to build an S3 object URL. Because `urlencode` uses form-encoding, slashes in the key are encoded as `%2F` and spaces as `+`. For S3 virtual-hosted-style URLs, path segments typically need `%20` for spaces and unencoded `/` between key components; the form-encoded result usually still works in practice but is not strictly path-component-correct. This is a nuance worth flagging in a future edit, but the function itself behaves exactly as the post shows.
- The API Gateway example sets `path_part = "/users/{userId}/settings"`. In AWS API Gateway, `path_part` is a single path segment, so in practice you would create multiple `aws_api_gateway_resource` blocks (one per segment) rather than one with slashes. This is outside the scope of `urlencode`/`urldecode` correctness, but readers copying the pattern verbatim may be confused.
- `urldecode` was added in OpenTofu (it is not present in Terraform at the time of writing); a version/caveat note could help readers who switch between the two.
