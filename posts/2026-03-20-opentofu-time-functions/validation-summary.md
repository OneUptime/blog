# Validation Summary: How to Use Date and Time Functions in OpenTofu

## Status
validated

## Post Type
Tutorial / Reference guide

## Technologies Covered
- OpenTofu (HCL language functions)
- Terraform (compatible function set)
- AWS resources used as examples (`aws_s3_bucket`, `aws_acm_certificate`, `aws_instance`)

## Sources Consulted
- [OpenTofu `timestamp()` documentation](https://opentofu.org/docs/language/functions/timestamp/)
- [OpenTofu `plantimestamp()` documentation](https://opentofu.org/docs/language/functions/plantimestamp/)
- [OpenTofu `formatdate()` documentation](https://opentofu.org/docs/language/functions/formatdate/)
- [OpenTofu `timeadd()` documentation](https://opentofu.org/docs/language/functions/timeadd/)
- [OpenTofu `timecmp()` documentation](https://opentofu.org/docs/language/functions/timecmp/)

## Issues Found
- **`timestamp()` evaluation phase was incorrect.** The post originally claimed `timestamp()` is "evaluated at plan time." Per the OpenTofu docs, the result "cannot be predicted during OpenTofu's planning phase, and so the timestamp will be taken only once the plan is being applied" — i.e., it is evaluated at apply time, not plan time. This is also the entire reason `plantimestamp()` exists. Fixed by changing "plan time" to "apply time" in the `timestamp()` section.

## Review Notes
- The `formatdate()` token table is correct, including the (counter-intuitive) convention that `hh` is the 24-hour clock and `HH` is the 12-hour clock — this matches the OpenTofu/Terraform spec, which inverts the more common Unicode CLDR convention.
- The `timeadd()` section lists `h`, `m`, `s` as duration units. The function actually supports a wider set (`ns`, `us`/`µs`, `ms`, `s`, `m`, `h`); days are notably absent and must be expressed as hours, which the example (`${90 * 24}h`) correctly demonstrates. Not flagged as an error since the listed units are accurate and the omission is a minor scope choice.
- `plantimestamp()` is OpenTofu-specific (not present in Terraform) — readers using Terraform should be aware. The post correctly contextualizes its use without overclaiming portability.
- All inline examples (`timecmp` return values, `timeadd` arithmetic, `formatdate` output) match the documented behavior.
