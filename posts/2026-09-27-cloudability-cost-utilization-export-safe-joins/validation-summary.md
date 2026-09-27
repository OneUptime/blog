# Validation Summary: How to Combine Cloudability Cost and Utilization Exports Without Misstating Billed Spend

## Status
validated

## Post Type
Technical guide with an executable Python example.

## Technologies Covered
- IBM Cloudability cost and utilization reporting APIs and measures metadata
- AWS EC2 utilization and CloudWatch metric statistics
- FinOps cost accounting, amortization, and billing reconciliation
- Resource-level joins and daily data aggregation
- Python standard library: `decimal.Decimal` and `collections.defaultdict`

## Sources Consulted
- [IBM utilization reporting endpoint](https://www.ibm.com/docs/en/cloudability-commercial/cloudability-essentials/saas?topic=api-utilization-reports-end-point) — reporting endpoints, measures discovery, and date parameters; reviewed indexed documentation.
- [IBM utilization reporting endpoint, Federal documentation](https://www.ibm.com/docs/en/cloudability-gov/cloudability-federal/saas?topic=api-utilization-reports-end-point) — corroborates EC2 scope and estimated-cost semantics.
- [IBM utilization reporting endpoint, Spanish commercial documentation](https://www.ibm.com/docs/es/cloudability-commercial/cloudability-essentials/saas?topic=api-utilization-reports-end-point) — corroborates commercial endpoint scope and cost exclusions.
- [IBM cost reporting endpoint](https://www.ibm.com/docs/en/cloudability-commercial/cloudability-essentials/saas?topic=api-cost-reporting-end-point) — cost measures, cash cost definition, and resource dimensions; reviewed indexed documentation.
- [IBM common dimension keys](https://www.ibm.com/docs/en/cloudability-commercial/cloudability-premium/saas?topic=point-common-dimension-keys) — resource, vendor, and account identifiers.
- [IBM understanding Cost (Amortized)](https://www.ibm.com/support/pages/node/7283570) — commitment amortization and provider-specific behavior.
- [Python decimal arithmetic](https://docs.python.org/3/library/decimal.html) — string construction, exact decimal values, and arithmetic.
- [Python defaultdict](https://docs.python.org/3/library/collections.html#collections.defaultdict) — factory initialization for missing keys.
- [PostgreSQL table expressions](https://www.postgresql.org/docs/current/queries-table-expressions.html) — inner and left join semantics and repeated matches.
- [AWS CloudWatch statistics definitions](https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/Statistics-definitions.html) — average, sum, sample count, and maximum statistics.
- [AWS report versions](https://docs.aws.amazon.com/cur/latest/userguide/understanding-report-versions.html) — replacement reports and successive billing snapshots.
- [AWS billing report troubleshooting](https://docs.aws.amazon.com/cur/latest/userguide/troubleshooting.html) — credits, refunds, and updates after a bill is finalized.
- [Author GitHub profile](https://github.com/nawazdhandala) — verified the author link redirects to the intended profile.

## Issues Found
No technical issues found.

## Review Notes
- Left README.md unchanged; its implementation and explanations are consistent with the reviewed sources.
- Executed the exact Python block with Python 3.13.1. All three assertions passed. The result contains two resource-day records: 15.00 with CPU 18.5 and 8.00 with missing CPU, preserving the 23.00 total. An inner join would retain only 15.00.
- Also executed the example with a duplicate utilization key injected. It raised the intended ValueError, confirming the uniqueness guard.
- The fixture deliberately represents one vendor and normalized daily data. Omitting vendor from its tuple is consistent with that scope; production mappings and time boundaries must still be verified as the post instructs.
- Estimated utilization cost, amortized cost, and invoiced cash cost are correctly distinguished. The post does not claim that amortized totals equal cash invoices.
- Join uniqueness, non-additive CPU statistics, missing observations, residual charges, and replacement snapshots are appropriate safeguards. Conservation checks establish arithmetic preservation, not independent proof of complete or correct source billing data.
- Direct retrieval of the two linked English IBM documentation pages returned HTTP 403. Their indexed official content was available; additional IBM documentation corroborated the relevant semantics. These URLs identify the intended resources, but unrestricted direct access could not be confirmed.
- No live authenticated Cloudability calls were made. The example is explicitly offline and does not claim to implement raw API extraction. There are no executable shell commands, configuration snippets, or version-pinned APIs in the post, and no deprecated Python APIs were identified.
