# Validation Summary: How to Calculate Cloudability Cost Ratios After Aggregation with Calculated Metrics

## Status
validated

## Post Type
Technical guide with an API request body and a Python validation example.

## Technologies Covered
- IBM Cloudability Calculated Metrics and reporting API
- Cloudability Business Metrics
- JSON request bodies
- Python decimal arithmetic
- FinOps cost ratios and aggregation

## Sources Consulted
- [IBM Calculated Metrics](https://www.ibm.com/docs/en/cloudability-commercial/cloudability-premium/saas?topic=spend-calculated-metrics): evaluation timing, aggregation, UI navigation, supported expressions, data sources, and historical formula updates.
- [IBM Calculated Metrics End Point](https://www.ibm.com/docs/en/cloudability-commercial/cloudability-premium/saas?topic=api-calculated-metrics-end-point): endpoint, request fields, valid formats, source constraints, and authentication example.
- [IBM Business Metrics in Cloudability](https://www.ibm.com/docs/en/cloudability-commercial/cloudability-standard/saas?topic=mapping-business-metrics-in-cloudability): ingestion-time evaluation of billing line items.
- [IBM Cost Reporting End Point](https://www.ibm.com/docs/en/cloudability-commercial/cloudability-essentials/saas?topic=api-cost-reporting-end-point): measure metadata and the mappings of total_amortized_cost to Cost (Amortized) and unblended_cost to Cost (Total).
- [Python decimal documentation](https://docs.python.org/3/library/decimal.html): Decimal construction, arithmetic, and division-by-zero behavior.

## Issues Found
No technical issues found.

## Review Notes
- Left README.md unchanged. The ratio-of-totals example correctly yields 2.5; averaging the two individual rates yields 2.
- Executed the exact Python code block successfully: numerator 100, denominator 40, ratio 2.5. Separately checked that its zero-denominator guard returns None.
- Parsed the JSON example successfully and checked its fields against the documented API schema. It is intentionally only a request body, not an authenticated executable request.
- Confirmed the documented API accepts cost or usage sources and requires all referenced measures to match the chosen source. The number format is valid.
- Confirmed query-time evaluation on aggregated results, retroactive formula changes, the Business Mappings creation workflow, and the absence of conditional expressions.
- The cost-basis ratio is appropriately distinguished from savings. The guidance to retain aggregate inputs and distinguish undefined values from zero is mathematically sound.
- IBM documentation URLs were found in official search-indexed content. Direct page opens returned HTTP 403, so the IBM review relied on the indexed documentation. The Python documentation was directly accessible.
- No authenticated Cloudability tenant was used. Tenant-specific measure availability, permissions, zero-denominator rendering, and report results remain runtime checks for the reader; no live API or UI verification is claimed.
- No terminal commands or version-pinned dependencies appear in the post. No deprecations were identified in the consulted documentation.
