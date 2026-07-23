# Validation Summary: How to Ignore OSV Findings Safely with Reasons and Expiration Dates

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- OSV-Scanner V2
- OSV-Scanner TOML configuration
- OSV vulnerability aliases
- Vulnerability exception and risk-acceptance workflows
- ripgrep (`rg`)

## Sources Consulted
- [OSV-Scanner configuration](https://google.github.io/osv-scanner/configuration/)
- [OSV-Scanner usage](https://google.github.io/osv-scanner/usage/)
- [OSV-Scanner output](https://google.github.io/osv-scanner/output/)
- [OSV-Scanner v2.3.8 release](https://github.com/google/osv-scanner/releases/tag/v2.3.8)
- [OSV-Scanner v2.3.8 configuration implementation](https://github.com/google/osv-scanner/blob/v2.3.8/internal/config/config.go)
- [OSV-Scanner v2.3.8 configuration manager](https://github.com/google/osv-scanner/blob/v2.3.8/internal/config/manager.go)
- [OSV-Scanner v2.3.8 result filtering](https://github.com/google/osv-scanner/blob/v2.3.8/pkg/osvscanner/filter.go)
- [OSV schema alias definition](https://ossf.github.io/osv-schema/)
- [OSV.dev FAQ](https://google.github.io/osv.dev/faq/)
- [OSV record for GO-2022-0968](https://osv.dev/vulnerability/GO-2022-0968)

## Issues Found
- The exception-audit command did not include ignored vulnerability IDs, the `PackageOverrides` table name, or package match fields, so its output was insufficient to identify the effective scope of each exception. The command now matches both exception table names and the relevant ID, package-match, action, expiry, and reason fields.
- The text described the ripgrep results as active exceptions, but ripgrep only finds configuration text and does not evaluate `ignoreUntil` or `effectiveUntil`. The wording now says that the command locates exception entries for review.

## Review Notes
- The review was performed against the current OSV-Scanner V2 documentation and the v2.3.8 release. The documented local-config behavior, global `--config` override, `IgnoredVulns` and `PackageOverrides` field names, TOML date syntax, alias-group suppression, and `scan source --recursive` command form were verified.
- OSV-Scanner applies a dated exception only while its parsed timestamp is later than the scanner's current time. A date-only TOML value represents midnight, using local time when no timezone offset is present.
