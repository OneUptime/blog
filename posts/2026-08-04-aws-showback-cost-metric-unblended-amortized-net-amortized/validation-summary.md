# Validation Summary: Choose the Right AWS Cost Metric for Showback

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- AWS Cost and Usage Reports (AWS CUR)
- AWS Data Exports
- AWS Cost Explorer and the `GetCostAndUsage` API
- AWS Reserved Instances
- AWS Savings Plans
- AWS Organizations consolidated billing
- FinOps showback and cost allocation

## Sources Consulted
- [AWS Cost Explorer: Exploring your data using Cost Explorer](https://docs.aws.amazon.com/cost-management/latest/userguide/ce-exploring-data.html)
- [AWS Cost Explorer API: GetCostAndUsage](https://docs.aws.amazon.com/aws-cost-management/latest/APIReference/API_GetCostAndUsage.html)
- [AWS Data Exports: Line item details](https://docs.aws.amazon.com/cur/latest/userguide/Lineitem-columns.html)
- [AWS Data Exports: Understanding your amortized reservation data](https://docs.aws.amazon.com/cur/latest/userguide/amortized-reservation.html)
- [AWS Data Exports: Reservation details](https://docs.aws.amazon.com/cur/latest/userguide/reservation-columns.html)
- [AWS Data Exports: Understanding unused reservation costs](https://docs.aws.amazon.com/cur/latest/userguide/unused-reservation-costs.html)
- [AWS Data Exports: Understanding Savings Plans](https://docs.aws.amazon.com/cur/latest/userguide/cur-sp.html)
- [AWS Data Exports: Savings Plans details](https://docs.aws.amazon.com/cur/latest/userguide/savingsplans-columns.html)
- [AWS Data Exports: CUR 2.0 Savings Plan columns](https://docs.aws.amazon.com/cur/latest/userguide/table-dictionary-cur2-savings-plan.html)
- [AWS Data Exports: Cost and usage dashboard amortized-cost definition](https://docs.aws.amazon.com/cur/latest/userguide/table-dictionary-cur-dashboard.html)

## Issues Found
- The statement that all RI-covered usage has zero unblended rate and cost was broader than the cited AWS documentation. The post now scopes that behavior to Amazon EC2 and Amazon RDS `DiscountedUsage` rows and explains that zero cost follows from the documented zero rate.
- The net-amortized fallback discussed only net effective-cost fields for commitment-covered usage. That could lead an implementation to retain gross unblended cost for ordinary usage or non-net unused commitment amounts. The post now requires the relevant net field for every cost class, including `lineItem/NetUnblendedCost` for ordinary usage, net unused fields for RIs, and net commitment components when deriving unused Savings Plans cost, with a corresponding non-net fallback.
- The Savings Plans column link pointed to the CUR 2.0 snake_case data dictionary while the surrounding text uses legacy AWS CUR names such as `savingsPlan/SavingsPlanEffectiveCost`. The link now targets the matching legacy CUR Savings Plans details page.

## Review Notes
- The formula block is conceptual pseudocode, not an executable code example.
- AWS documents net columns as conditional: they appear only when the account has a discount in the applicable billing period. The post correctly treats the non-net substitution as an explicit pipeline fallback rather than claiming equivalence.
- The post intentionally covers the main compute commitment cases. Other reservation products and newer Savings Plans categories can have service-specific billing behavior and should be tested before extending a production allocation query.
