# Validation Summary: How to Exclude Credits and One-Time Charges in Cloudability Enhanced Forecast

## Status
validated

## Post Type
Technical product workflow guide. Although there are no code examples, commands, or configuration snippets, the post provides actionable product settings and describes forecasting implementation behavior, so it warrants technical review.

## Technologies Covered
- IBM Cloudability Enhanced Forecast
- IBM Cloudability Intelligent Forecasting
- IBM Cloudability Financial Planning and budgets
- Cloud cost metrics, spend drivers, and forecast exclusions

## Sources Consulted
- [IBM Enhanced Forecast](https://www.ibm.com/docs/en/cloudability-commercial/cloudability-premium/saas?topic=plan-enhanced-forecast)
- [IBM Intelligent Forecasting](https://www.ibm.com/docs/en/cloudability-commercial/cloudability-enterprise/saas?topic=forecast-intelligent-forecasting)
- [IBM Getting Started with Cloudability Financial Planning](https://www.ibm.com/docs/en/cloudability-commercial/financial-planning/saas?topic=getting-started-cloudability-financial-planning)
- [IBM Working with Forecasts](https://www.ibm.com/docs/en/cloudability-commercial/financial-planning/saas?topic=working-forecasts)
- [IBM What's new in Cloudability](https://www.ibm.com/docs/en/cloudability-commercial/cloudability-standard/saas?topic=cloudability-whats-new-in)

## Issues Found
No technical issues found.

The README.md was left unchanged.

## Review Notes
- Confirmed Credits, One-time Charges, and their combined exclusion are documented forecast settings. IBM describes calculation exclusions; the post appropriately avoids claiming that billing records are deleted.
- Confirmed cost metric, historical start, duration, and spend drivers are configurable. CSV export supports preserving comparison evidence.
- Confirmed Details groups forecast lines by driver combinations and supports comparing and selecting models for individual lines.
- Confirmed the display contains the top 1,000 items plus an Other row for remaining items when that threshold is exceeded.
- Confirmed the Save Budget panel permits editing forecast-derived amounts. The budget cost metric is fixed to the forecast metric; budget periods follow fiscal-year boundaries. The post does not claim otherwise.
- Intelligent Forecasting evaluates models against historical data for each item. The warning that historical fit may not reflect expiring commercial arrangements is reasonable analytical guidance, not a promised product result.
- Financial Planning documentation distinguishes forecasts from budget targets and supports manually added adjustments for known future spend, consistent with the post's advice.
- The example amounts are explicitly invented. No numerical predictions or guaranteed percentage effects require validation.
- Holding inputs fixed and investigating transaction classifications are sound comparison practices. Reducing drivers is a separate diagnostic change and should not be assumed to preserve forecast totals.
- Direct retrieval of the three linked IBM pages returned HTTP 403. Their exact URLs and relevant content were found in search-indexed IBM documentation; this review did not confirm live browser access or test an authenticated Cloudability tenant. The author profile link is attribution, not technical evidence.
- No version-pinned APIs, executable examples, or deprecated commands appear in the post. IBM's release notes document Enhanced Forecast in May 2026, consistent with the post date.
