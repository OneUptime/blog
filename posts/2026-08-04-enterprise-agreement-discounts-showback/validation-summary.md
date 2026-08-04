# Validation Summary: Centralize or Pass Through AWS Enterprise Discounts

## Status

validated

## Post Type

Technical guide / FinOps policy reference

## Technologies Covered

- AWS Cost and Usage Report (CUR) 2.0 and AWS Data Exports
- AWS discount and net cost columns
- Amazon EC2 Reserved Instances (RIs)
- AWS Savings Plans
- AWS Organizations consolidated billing
- AWS Billing Conductor pro forma billing
- AWS Cost Explorer net amortized cost
- FinOps showback, discount allocation, and reconciliation

## Sources Consulted

- AWS Data Exports, CUR 2.0 discount columns: https://docs.aws.amazon.com/cur/latest/userguide/table-dictionary-cur2-discount.html
- AWS Data Exports, CUR 2.0 table configurations: https://docs.aws.amazon.com/cur/latest/userguide/table-dictionary-cur2.html
- AWS Data Exports, CUR 2.0 line item columns: https://docs.aws.amazon.com/cur/latest/userguide/table-dictionary-cur2-line-item.html
- AWS Data Exports, CUR 2.0 reservation columns: https://docs.aws.amazon.com/cur/latest/userguide/table-dictionary-cur2-reservation.html
- AWS Data Exports, CUR 2.0 Savings Plan columns: https://docs.aws.amazon.com/cur/latest/userguide/table-dictionary-cur2-savings-plan.html
- AWS Data Exports, understanding Savings Plans: https://docs.aws.amazon.com/cur/latest/userguide/cur-sp.html
- AWS Cost Explorer, net unblended and net amortized costs: https://docs.aws.amazon.com/cost-management/latest/userguide/ce-exploring-data.html
- AWS Billing Conductor overview and pro forma cost domain: https://docs.aws.amazon.com/billingconductor/latest/userguide/what-is-billingconductor.html
- AWS Billing, consolidated billing and volume discount allocation: https://docs.aws.amazon.com/awsaccountbilling/latest/aboutv2/useconsolidatedbilling-effective.html
- AWS Billing, Reserved Instance and Savings Plans discount sharing: https://docs.aws.amazon.com/awsaccountbilling/latest/aboutv2/ri-turn-off.html
- AWS Savings Plans, application order and consolidated billing behavior: https://docs.aws.amazon.com/savingsplans/latest/userguide/sp-applying.html

## Issues Found

- The gross-minus-net formula was described as the negotiated enterprise benefit without first isolating other applicable discount effects. Clarified that the difference can be labeled enterprise benefit only after other discount effects are excluded, because AWS describes net costs as costs after applicable discounts.
- The CUR 2.0 discount-column explanation implied that the columns themselves are limited to the Discount Automation program. Corrected it to state that `discount` contains specific line-item discounts and `discount_total_discount` sums the discount columns; the `INCLUDE_MANUAL_DISCOUNT_COMPATIBILITY` configuration is the feature limited to customers onboarded to Discount Automation.
- The conditional net-column warning could be read as saying that a missing column never indicates anything about discount availability. Replaced it with the documented rule that net columns are included when the account has an applicable discount in the billing period, plus the correct caveat that their presence does not make every row discounted.
- The export-configuration warning said a discount-column query would silently omit separate discount rows. Selecting a removed column can instead fail. Updated the text to cover both accurate failure modes: missing-column failures and omitted discounts when downstream logic excludes separate discount lines.
- Pass-through net cost was called marginal cost. Because amortized RI and Savings Plans effective cost is an attribution of commitment cost rather than necessarily the marginal cost of another unit of usage, changed this to attributed net economic cost.
- The central discount pool and reconciliation equations omitted aggregation on row-level gross and net values. Added `sum(...)` so the pool and company-total equations reconcile at the stated multi-row scope.
- The reservation reference linked to the legacy CUR column-name page while the article uses CUR 2.0 underscore-form field names. Updated it to the CUR 2.0 reservation-column dictionary.

## Review Notes

- The formulas are policy pseudocode rather than executable code; no CLI commands or deployable configuration snippets are present.
- The CUR 2.0 field names for ordinary usage, RI effective cost, and Savings Plans effective cost were verified as current.
- AWS documents net columns as conditional on an applicable account discount in the billing period. Implementations should continue to test the delivered schema and apply contract-specific eligibility rules rather than infer negotiated terms from generic billing fields.
- Billing Conductor pro forma costs are correctly treated as a separate cost domain that does not alter standard AWS invoices or commitment-sharing settings.
