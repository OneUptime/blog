# Validation Summary: How to Format Dates and Times in Terraform

## Status
validated

## Post Type
Reference / Tutorial

## Technologies Covered
- Terraform (HCL configuration language)
- Terraform built-in functions: `formatdate`, `timestamp`, `plantimestamp`, `timeadd`, `format`, `ceil`, `tonumber`, `merge`
- AWS provider (`aws_instance`, `aws_acm_certificate` data source)
- ISO 8601 / RFC 3339 timestamp formats

## Sources Consulted
- Official Terraform `formatdate` documentation: https://developer.hashicorp.com/terraform/language/functions/formatdate
- go-cty source for `FormatDateFunc` (the upstream implementation used by Terraform): https://github.com/zclconf/go-cty `cty/function/stdlib/datetime.go`
- Terraform built-in function pages for `timestamp`, `plantimestamp`, `timeadd`, `format`
- RFC 3339 example in the formatdate docs: `"YYYY-MM-DD'T'hh:mm:ssZ"` — confirms `hh` is the 24-hour token

## Issues Found
Several material errors in the post about the `formatdate` token table. Fixes applied:

1. **`hh` and `HH` were inverted throughout the post.**
   - Per the official docs and the go-cty source (`case 'h': h := t.Hour()` for 24-hour; `case 'H': h := t.Hour() % 12` for 12-hour), `hh` is the 24-hour token and `HH` is the 12-hour token. The post had the opposite mapping in the reference table and in every subsequent example (ISO 8601, RFC 3339, log formats, tag formats, name formats, conditional formats, cloud-provider formats, and the summary).
   - Fix: swapped `HH` ↔ `hh` in the reference table, in all RFC 3339 / ISO 8601 / 24-hour log examples (now use `hh`), and in all 12-hour `AA`-marker examples (now use `HH`). Updated the summary line accordingly.

2. **`EE` is not a valid token.**
   - The go-cty implementation accepts only `EEE` (3-letter) and `EEEE` (full). Any other count of `E` returns an error: `"day of week must either be \"EEE\" or \"EEEE\""`.
   - Fix: removed the `weekday_short = formatdate("EE", local.ts)` line from the token reference.

3. **`ZZZZ` and `ZZZZZ` outputs were wrong; `ZZZ` was missing.**
   - Per the source: `Z` → `"Z"` for UTC; `ZZZ` → `"UTC"` for UTC (this is the variant that produces the literal "UTC"); `ZZZZ` → `"+0000"`; `ZZZZZ` → `"+00:00"`.
   - The post claimed `ZZZZ` → `"Z"` and `ZZZZZ` → `"UTC"`, both incorrect.
   - Fix: corrected the comments, added the `ZZZ` variant that actually produces `"UTC"`, and renamed the misleading variable names so they match what the tokens produce.

4. **`WW` is not a valid token — the `DeployWeek` tag line would throw a runtime error.**
   - `formatdate("YYYY-'W'WW", ...)` calls into the format scanner with `W` outside the literal quotes; `W` is not a recognized verb, so go-cty returns `"invalid date format verb \"WW\""`. The post itself notes later that Terraform has no built-in week token.
   - Fix: removed the broken `DeployWeek` entry from `standard_tags`. The post's later "Working with Week Numbers" section already shows the correct calculated approach using `format("%s-W%02d", ...)`.

## Review Notes
- The "Working with Week Numbers" section uses a rough approximation (`(month - 1) * 30 + day`) that the author acknowledges is not ISO 8601. That's a tagging shortcut, not a correctness bug, so it was left as-is.
- `plantimestamp()` was introduced in Terraform 1.5; the post uses it without calling out the minimum version. Not a correctness issue, just a version caveat worth noting for older Terraform users.
- The Azure example hardcodes `'+00:00'` as a literal because `timestamp()` always returns UTC. If a user passes a non-UTC timestamp to that format string, the resulting string would lie about the offset. A token-driven version (`ZZZZZ`) would be more robust, but the current code is correct given the documented input source.
- `aws_acm_certificate.not_after` is a valid attribute on the AWS provider data source and is an RFC 3339 timestamp, so feeding it directly to `formatdate` is correct.
