# Validation Summary: How to Calculate Total Cost of Ownership for Ceph Storage

## Status
validated

## Post Type
Guide

## Technologies Covered
- Ceph (distributed storage system)
- Rook (Ceph operator for Kubernetes)
- Ceph CLI tools (`ceph df`, `ceph osd df`, `ceph report`)
- Python 3 (for parsing Ceph JSON output)

## Sources Consulted
- Ceph official documentation: https://docs.ceph.com/en/latest/rados/operations/monitoring/
- Ceph CLI reference for `ceph df`, `ceph osd df tree`, and `ceph report` commands
- Ceph replication factor behavior and usable capacity calculations

## Issues Found
- **Arithmetic error in 5-year TCO total**: The `five_year_tco` value in the YAML spreadsheet was listed as `504435` but the correct sum is `504235` (172,847 + 4 × 82,847 = 172,847 + 331,388 = 504,235). Fixed to `504235`.

## Review Notes
- The "Building a 5-Year TCO Spreadsheet" section and the "Total 5-Year Summary" section use different assumptions — the spreadsheet includes $5,000/year hardware refresh in years 2-5, while the summary section omits it, resulting in different totals ($504,235 vs $485,000). Both are internally consistent with their own assumptions, but readers may find the discrepancy confusing. This is a presentation choice rather than a technical error.
- The `ceph report` JSON parsing script assumes `pgmap.bytes_used` and `pgmap.bytes_avail` fields, which are present in current Ceph versions but field names may vary in future releases.
- Staff cost estimates are reasonable US-market figures but will vary significantly by region.
