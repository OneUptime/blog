# Validation Summary: Allocate Unused AWS Commitments Without Distorting Showback

## Status

validated

## Post Type

Technical guide / FinOps policy reference

## Technologies Covered

- AWS Cost and Usage Reports (AWS CUR)
- AWS Data Exports and CUR 2.0
- Amazon EC2 Reserved Instances (RIs)
- AWS Savings Plans
- AWS Organizations consolidated billing and discount sharing
- Amortized and net amortized cost allocation
- FinOps showback and commitment-utilization reporting

## Sources Consulted

- [AWS Data Exports: Understanding unused reservation costs](https://docs.aws.amazon.com/cur/latest/userguide/unused-reservation-costs.html)
- [AWS Data Exports: Understanding amortized reservation data](https://docs.aws.amazon.com/cur/latest/userguide/amortized-reservation.html)
- [AWS Data Exports: Reservation details](https://docs.aws.amazon.com/cur/latest/userguide/reservation-columns.html)
- [AWS Data Exports: Troubleshooting Cost and Usage Reports](https://docs.aws.amazon.com/cur/latest/userguide/troubleshooting-cur.html)
- [AWS Data Exports: Understanding Savings Plans](https://docs.aws.amazon.com/cur/latest/userguide/cur-sp.html)
- [AWS Data Exports: Savings Plans details](https://docs.aws.amazon.com/cur/latest/userguide/savingsplans-columns.html)
- [AWS Data Exports: CUR 2.0 Savings Plan columns](https://docs.aws.amazon.com/cur/latest/userguide/table-dictionary-cur2-savings-plan.html)
- [AWS Data Exports: Cost and usage dashboard](https://docs.aws.amazon.com/cur/latest/userguide/table-dictionary-cur-dashboard.html)
- [AWS Data Exports: Line item details](https://docs.aws.amazon.com/cur/latest/userguide/Lineitem-columns.html)
- [AWS Billing: Reserved Instances and Savings Plans discount sharing](https://docs.aws.amazon.com/awsaccountbilling/latest/aboutv2/ri-turn-off.html)
- [AWS Billing: Understanding consolidated bills](https://docs.aws.amazon.com/awsaccountbilling/latest/aboutv2/con-bill-blended-rates.html)
- [AWS Savings Plans: Understanding how Savings Plans apply to usage](https://docs.aws.amazon.com/savingsplans/latest/userguide/sp-applying.html)

## Issues Found

No technical issues found.

## Review Notes

- The formulas are policy pseudocode rather than executable code; no CLI commands or deployable configuration snippets are present.
- AWS's documented amortized-cost logic uses `savingsPlan/SavingsPlanEffectiveCost` for `SavingsPlanCoveredUsage`, `savingsPlan/TotalCommitmentToDate - savingsPlan/UsedCommitment` for `SavingsPlanRecurringFee`, `reservation/EffectiveCost` for `DiscountedUsage`, and the two RI unused-fee fields for `RIFee`. The post represents these rules accurately.
- AWS documents that net RI and Savings Plans columns appear only when an applicable discount exists in the billing period. Implementations selecting a net amortized basis should use the corresponding net fields consistently and handle their conditional presence explicitly.
- AWS currently documents organization-wide, prioritized-group, restricted-group, and account-level sharing controls. It also confirms owner-first application and that the final monthly bill uses the preferences set at 23:59:59 UTC on the month's last day.
- All external links in the post resolve to the intended official AWS documentation topics.
