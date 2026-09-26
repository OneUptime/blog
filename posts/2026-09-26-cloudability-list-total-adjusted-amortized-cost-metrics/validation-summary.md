# Validation Summary: Cloudability Cost Metrics Compared: List Through Adjusted Amortized

## Status
validated

## Post Type
Technical reference and metric-selection guide. Although there is no executable code, the post includes technical implementation details about CUR fields, charge-type treatment, and Cloudability cost transformations, warranting technical review.

## Technologies Covered
- IBM Cloudability cost metrics, reporting, budgets, and custom pricing
- AWS Cost and Usage Reports (CUR)
- AWS Reserved Instances and Savings Plans
- Enterprise Discount Programs (EDP)
- FinOps showback, commitment allocation, and invoice reconciliation

## Sources Consulted
- [IBM glossary of cost dimensions and metrics](https://www.ibm.com/docs/en/cloudability-commercial/cloudability-standard/saas?topic=reference-glossary-cost-dimensions-metrics): checked the five metric definitions and custom pricing availability. The post's alternate glossary URL was also found in IBM's indexed documentation.
- [IBM Custom Discounts and Enterprise Discount Programs](https://www.ibm.com/docs/en/cloudability-commercial/cloudability-enterprise/saas?topic=plan-custom-discounts-enterprise-discount-programs-edp): confirmed the Total and Amortized bases for their respective adjusted metrics and the custom pricing module requirement.
- [IBM Cost (Total) change notice](https://community.ibm.com/community/user/viewdocument/notice-upcoming-changes-to-the-cos?CommunityKey=15c0e07d-35c0-49de-a84b-019253d13376&hlmlt=VT&tab=librarydocuments): checked the January 2024 removal of RI redistribution, unchanged aggregate cost, historical reprocessing caveat, and January 10 confirmation that the change had shipped.
- [IBM Understanding the Cost (Amortized) Metric in Cloudability](https://www.ibm.com/support/pages/node/7283570): verified AWS commitment amortization, allocation to consuming accounts/resources, and unused cost attribution to the commitment owner.
- [IBM Budgets and Forecasts](https://www.ibm.com/docs/en/cloudability-commercial/cloudability-essentials/saas?topic=plan-cloudability-budgets-forecasts): checked on-demand valuation for covered and spot usage and zeroing of selected RI fees and custom pricing credits.
- [AWS CUR line item details](https://docs.aws.amazon.com/cur/latest/userguide/Lineitem-columns.html): verified UnblendedCost, zero-rated RI usage, and fee, credit, refund, and tax charge types.
- [AWS Understanding unused reservation costs](https://docs.aws.amazon.com/cur/latest/userguide/unused-reservation-costs.html): corroborated the separation of used effective costs and unused reservation costs.
- [AWS Migrating from Detailed Billing Reports to Cost and Usage Reports](https://docs.aws.amazon.com/cur/latest/userguide/detailed-billing-migrate.html): confirmed invoice reconciliation using summed unblended costs grouped by invoice ID.

## Issues Found
No technical issues found.

## Review Notes
- README.md was left unchanged. The five metric interpretations, custom pricing caveats, List comparison limitations, and separation of consumption attribution from organizational allocation policy are supported by the sources.
- The illustrative arithmetic is correct: 70 + 30 + 20 = 120, with consumed cost totaling 100. The fenced text is an accounting illustration, not executable code. No CLI commands, API calls, or configuration snippets require execution.
- IBM's glossary still includes older RI redistribution wording under Total. The specific January 2024 change notice and its implementation confirmation support the post's updated explanation. Historical data may require reprocessing to apply the newer treatment.
- Some IBM URLs returned access errors on direct retrieval. Relevant content was available through indexed official IBM pages and the equivalent IBM Budgets and Forecasts page listed above; access errors alone were not treated as evidence of broken links. The post's cited links identify the intended resources.
- Validation was documentation-based; no live Cloudability tenant, custom pricing configuration, or customer CUR dataset was available for numerical reconciliation. Adjusted metrics depend on the organization's configuration, as the post explains.
- Review date: 2026-09-26. No deprecated executable interfaces were present.
