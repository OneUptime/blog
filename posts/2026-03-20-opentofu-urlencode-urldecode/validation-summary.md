# Validation Summary: How to Use the urlencode and urldecode Functions in OpenTofu

## Status
validated

## Post Type
Tutorial / Reference guide

## Technologies Covered
- OpenTofu (urlencode and urldecode functions)
- HCL (HashiCorp Configuration Language)
- AWS provider resources (aws_sns_topic_subscription) used in examples
- URL percent-encoding (RFC 3986)

## Sources Consulted
- OpenTofu urlencode function documentation: https://opentofu.org/docs/language/functions/urlencode/
- OpenTofu urldecode function documentation: https://opentofu.org/docs/language/functions/urldecode/
- OpenTofu functions index: https://opentofu.org/docs/language/functions/
- Go `net/url` package documentation (underlying QueryEscape/QueryUnescape behavior)

## Issues Found
1. **Incorrect space encoding in basic example** — The post stated `urlencode("hello world")` returns `"hello%20world"`. OpenTofu's `urlencode` uses query-string style encoding (Go's `url.QueryEscape`), so spaces are encoded as `+`, not `%20`. Updated the example to show the correct return value `"hello+world"`.
2. **Incorrect console output for spaces** — The Step-by-Step Usage section showed `urlencode("hello world!")` returning `"hello%20world%21"`. Corrected to `"hello+world%21"` to match actual OpenTofu behavior.
3. **Incorrect entry in "Characters Encoded by urlencode" table** — The list claimed "Spaces → `%20`". This was changed to "Spaces → `+` (query-string style encoding)" to reflect the actual behavior. The section heading was also adjusted from "percent-encoded" to "encoded" because spaces specifically are not percent-encoded by this function.

## Review Notes
- `urldecode` is an OpenTofu-specific function and does not exist in upstream Terraform. The post's tag list includes "Terraform" which may mislead readers; however, the post's title and body clearly scope to OpenTofu, so the tag is acceptable as a discoverability aid.
- The decode example `urldecode("hello%20world")` returning `"hello world"` is technically correct because OpenTofu's `urldecode` (built on Go's `url.QueryUnescape`) accepts both `+` and `%20` as space representations on input, even though `urlencode` only emits `+` for spaces. This asymmetry is not explicitly noted in the post but is not incorrect.
- All percent-encoded values for `=`, `&`, `+`, `#`, `/`, `!`, `@` shown in examples are accurate.
- The `aws_sns_topic_subscription` argument `endpoint_auto_confirms` is a real argument on that resource, so the example is valid.
