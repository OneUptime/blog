# Validation Summary: How to Use the formatdate Function in OpenTofu

## Status
validated

## Post Type
Tutorial / Reference guide

## Technologies Covered
- OpenTofu (`formatdate`, `timestamp`, `timeadd`, `plantimestamp`, `tofu console`)
- HCL (HashiCorp Configuration Language)
- AWS provider resources: `aws_s3_object`, `aws_iam_user`, `aws_db_snapshot`, `aws_cloudwatch_log_group`
- RFC 3339 timestamp format

## Sources Consulted
- OpenTofu `formatdate` function documentation: https://opentofu.org/docs/language/functions/formatdate/
- Terraform `formatdate` function documentation (cross-reference): https://developer.hashicorp.com/terraform/language/functions/formatdate
- OpenTofu `timestamp`, `timeadd`, and `plantimestamp` function references

## Issues Found
1. **Format tokens table — incorrect 24-hour token.** The table listed `HH` as "Hour (24h)". In OpenTofu (and Terraform), the convention is reversed from typical date format libraries: `hh` is the 24-hour zero-padded token and `HH` is the 12-hour zero-padded token. Changed the table row from `` `HH` `` to `` `hh` `` so the listed token actually matches the described 24-hour behavior. This also makes the table consistent with the post's own `formatdate("YYYY-MM-DD hh:mm", "2026-03-20T14:30:00Z")` example, which correctly returns `"2026-03-20 14:30"`.

2. **Snapshot Naming example used 12-hour token.** The example used `formatdate("YYYYMMDD-HHmm", timestamp())`. With `HH` being the 12-hour token, a 14:30 UTC timestamp would render as `20260320-0230`, not the implied 24-hour `20260320-1430`. Changed `HHmm` to `hhmm` so the snapshot name uses 24-hour time as intended.

## Review Notes
- The `hh` (24-hour) vs `HH` (12-hour) inversion in OpenTofu/Terraform is unusual compared to most date-format libraries (Java SimpleDateFormat, Go's reference time, etc., where uppercase `HH` is 24-hour). Authors writing about `formatdate` should be especially careful here; the post would benefit from an explicit call-out of this gotcha in a future revision.
- All AWS provider resource names (`aws_s3_object`, `aws_iam_user`, `aws_db_snapshot`, `aws_cloudwatch_log_group`) and their referenced arguments are correct for the current AWS provider.
- `plantimestamp()` is correctly mentioned as an alternative for stable plan-time values; it has been available in OpenTofu since the initial fork from Terraform 1.5.
- The 720h = 30 days arithmetic in the expiration example is correct.
- `timestamp()` correctly returns an RFC 3339 UTC timestamp, matching what `formatdate` expects.
