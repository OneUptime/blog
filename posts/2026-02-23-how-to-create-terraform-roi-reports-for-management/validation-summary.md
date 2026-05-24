# Validation Summary: How to Create Terraform ROI Reports for Management

## Status
validated

## Post Type
Guide / Tutorial (business-oriented technical guide combining concepts with illustrative code)

## Technologies Covered
- Terraform (referenced as the subject of ROI measurement; no Terraform code or commands are used)
- Python 3 (data collection, cost avoidance, and report generation scripts)
- YAML (configuration files for value categories, executive summary, and management FAQ)

## Sources Consulted
- Python `datetime` module documentation — https://docs.python.org/3/library/datetime.html (specifically the deprecation of `datetime.utcnow()` in Python 3.12)
- Python `dict` view objects behavior — https://docs.python.org/3/library/stdtypes.html#dict-views
- YAML 1.2 specification (unquoted keys beginning with digits are treated as strings when they do not parse as numbers)
- Terraform documentation — https://developer.hashicorp.com/terraform (for general framing of Terraform's value proposition; the post makes no version-specific Terraform claims)

## Issues Found
1. **Deprecated `datetime.utcnow()` usage in `scripts/generate-roi-report.py`.** The code originally used `datetime.utcnow().strftime("%Y-%m-%d")`. `datetime.utcnow()` was deprecated in Python 3.12 (October 2023) in favor of timezone-aware alternatives. Replaced with `datetime.now(timezone.utc).strftime("%Y-%m-%d")`, which is the officially recommended replacement per the Python documentation.

## Review Notes
- The post is largely conceptual/illustrative. Each individual code block is internally consistent, and the math in the executive summary checks out (breakdown sums to $82,500, ROI computes to 340%, payback ≈ 2.7 months, YoY improvement ≈ 83%).
- The illustrative numeric values do not tie together across code blocks (e.g., the Python `roi-data-collector.py` would compute roughly $580K/quarter in savings, while the YAML executive summary shows $82,500/quarter; the trend data shows 2025-Q1 savings of $25,000 while the executive summary's YoY block lists $45,000). These are clearly illustrative placeholders rather than a connected worked example, so they were left as-is.
- `scripts/generate-roi-report.py` references `datetime`, `ROIDataCollector`, and `calculate_cost_avoidance` without explicit imports. This is consistent with the post's snippet-style presentation (each file is a separate illustrative example) and was not changed.
- `scripts/roi-data-collector.py` imports `timedelta` and `json` but does not use them — minor code hygiene issue but not a technical error.
- In `cost-avoidance.py`, the `total_quarterly_avoidance` sum mixes keys labeled `total_avoidance` and `quarterly_avoidance`. The Python logic works correctly (the `dict.get` fallback handles both), but the naming is semantically inconsistent. Left unchanged as it does not affect correctness.
- YAML keys like `2025_Q1_savings` are valid because they do not parse as numbers and are therefore treated as strings.
