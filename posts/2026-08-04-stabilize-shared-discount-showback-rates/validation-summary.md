# Validation Summary: Stabilize AWS Showback When Shared Discounts Move

## Status
validated

## Post Type
Technical guide / FinOps design reference

## Technologies Covered
- AWS Organizations consolidated billing
- AWS Cost and Usage Reports (AWS CUR) and Data Exports
- AWS Savings Plans
- Amazon EC2 Reserved Instances
- Showback, rate cards, and cost allocation
- Commitment utilization and amortized cost reconciliation

## Sources Consulted
- [AWS Billing: Reserved Instances and Savings Plans discount sharing](https://docs.aws.amazon.com/awsaccountbilling/latest/aboutv2/ri-turn-off.html)
- [AWS Savings Plans: Understanding how Savings Plans apply to usage](https://docs.aws.amazon.com/savingsplans/latest/userguide/sp-applying.html)
- [AWS Billing: Understanding consolidated bills](https://docs.aws.amazon.com/awsaccountbilling/latest/aboutv2/con-bill-blended-rates.html)
- [Amazon EC2: How Reserved Instance discounts are applied](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/apply_ri.html)
- [AWS Data Exports: Understanding Savings Plans](https://docs.aws.amazon.com/cur/latest/userguide/cur-sp.html)
- [AWS Data Exports: Understanding reservation line items](https://docs.aws.amazon.com/cur/latest/userguide/regular-reserved-instances.html)
- [AWS Data Exports: Reservation details](https://docs.aws.amazon.com/cur/latest/userguide/reservation-columns.html)
- [AWS Data Exports: Savings Plan columns](https://docs.aws.amazon.com/cur/latest/userguide/table-dictionary-cur2-savings-plan.html)
- [AWS Data Exports: Cost and usage dashboard columns](https://docs.aws.amazon.com/cur/latest/userguide/table-dictionary-cur-dashboard.html)
- [AWS Data Exports: Understanding report versions](https://docs.aws.amazon.com/cur/latest/userguide/understanding-report-versions.html)

## Issues Found
1. **The displacement example omitted two conditions required by AWS's allocation rules.** A development usage spike cannot displace Savings Plan coverage from the owner account, because AWS applies the plan to eligible owner-account usage first. Among usage in the applicable sharing scope, displacement also depends on AWS's savings-percentage ordering. The example now states that owner-account usage is handled first and that the development fleet ranks ahead of some production usage under that ordering.

## Review Notes
- The post correctly describes current Savings Plan ordering: eligible owner-account usage receives priority, followed—within the configured sharing scope—by usage with the highest savings percentage; ties are resolved by the lowest Savings Plan rate.
- The `DiscountedUsage`, `SavingsPlanCoveredUsage`, `RIFee`, and `SavingsPlanRecurringFee` line-item types are current AWS CUR values. The referenced RI and Savings Plan ARN and effective-cost fields are also current.
- The unused-cost guidance is correct: amortized CUR logic uses the RI unused amortized-upfront and unused recurring-fee fields for `RIFee` lines, and total commitment to date minus used commitment for `SavingsPlanRecurringFee` lines.
- The RI matching and normalization caveats are correct. Instance size flexibility is limited to eligible Regional RIs and uses normalization factors; zonal RIs require matching attributes including Availability Zone and instance size.
- AWS documents CUR updates as provisional until charges are finalized, so freezing a finalized allocation snapshot and treating later adjustments as restatements is technically sound.
- The rate-card, entitlement, variance-pool, and three-amount data-model recommendations are internal FinOps policy patterns rather than AWS guarantees; the post labels them accordingly.
