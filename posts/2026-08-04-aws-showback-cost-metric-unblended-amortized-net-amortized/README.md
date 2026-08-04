# Choose the Right AWS Cost Metric for Showback

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: AWS, Showback, FinOps, Cost and Usage Report, Cost Explorer, Savings Plans, Reserved Instances

Description: Learn when unblended, amortized, and net amortized AWS costs are appropriate for showback, and how to keep commitment and discount policy explicit.

---

An AWS showback can be perfectly reconciled and still tell the wrong economic story. The most common reason is that the pipeline starts with whichever cost column was easiest to query, without first deciding what the report is meant to represent.

Unblended, amortized, and net amortized cost answer different questions. The right choice depends on whether teams should see purchase-time cash charges, the effective cost of commitments as they are consumed, or that effective cost after applicable private discounts. None of those metrics decides who should absorb unused commitments, credits, tax, or shared platform costs. Those are allocation policies owned by the organization.

## Start with the Question the Report Must Answer

Use three separate views rather than asking one number to serve every audience:

| View | Primary question | Suitable AWS cost basis |
| --- | --- | --- |
| Invoice operations | What did AWS bill or adjust? | Invoice and unblended line items, kept by charge type |
| Economic showback | What did consumed capacity effectively cost this period? | Amortized or net amortized cost |
| Optimization | What behavior caused demand and waste? | Usage, requests, coverage, utilization, and public-rate comparisons |

The finance ledger may need cash timing. An engineering showback usually needs period economics. A rightsizing report needs quantities and utilization, not merely dollars. Publish the basis in the report header so recipients do not compare unlike views.

## What Unblended Cost Actually Represents

In AWS Cost and Usage Reports, `lineItem/UnblendedCost` is `UnblendedRate` multiplied by `UsageAmount`. In an organization, the unblended rate is associated with an individual account's service usage.

That sounds like an obvious team cost until commitments enter the picture:

- On-Demand consumption appears as `Usage` and normally carries its billed unblended cost.
- For Amazon EC2 and Amazon RDS, RI-covered consumption appears as `DiscountedUsage`. AWS documents the unblended rate on those usage rows as zero, which also makes the unblended cost zero because the RI charges are represented elsewhere.
- Savings Plan-covered consumption appears as `SavingsPlanCoveredUsage` at its On-Demand-equivalent unblended cost, together with a `SavingsPlanNegation` row that offsets it. The effective Savings Plan amount is in `savingsPlan/SavingsPlanEffectiveCost`.
- Upfront and recurring commitment charges are separate line-item types.

Consequently, summing `line_item_unblended_cost` by resource can make RI-covered resources look free. Summing Savings Plan covered usage without its negation can make those resources look On-Demand-priced. Summing both commitment fees and effective usage can double count the same commitment.

Unblended cost remains useful for invoice-oriented analysis, non-commitment usage, fees, credits, refunds, and tax. It is not, by itself, a complete effective-cost measure for committed usage.

## What Amortized Cost Changes

Amortization spreads a commitment's upfront payment over the period that receives the benefit. AWS exposes the components in CUR rather than a universal legacy CUR column named `amortized_cost`.

For the main compute cases:

- `Usage`: use `lineItem/UnblendedCost`.
- `DiscountedUsage`: use `reservation/EffectiveCost`, which AWS defines as amortized upfront cost for usage plus recurring fee for usage.
- `SavingsPlanCoveredUsage`: use `savingsPlan/SavingsPlanEffectiveCost`.
- `RIFee`: the unused RI portion is represented by `reservation/UnusedAmortizedUpfrontFeeForBillingPeriod` plus `reservation/UnusedRecurringFee`.
- `SavingsPlanRecurringFee`: unused commitment can be derived from `savingsPlan/TotalCommitmentToDate` minus `savingsPlan/UsedCommitment` for the row.

RI upfront `Fee` and `SavingsPlanUpfrontFee` purchase rows must not be added again when the same upfront value is already being amortized. Non-commitment `Fee` rows may still belong in the period cost. Classification therefore requires line-item type and commitment metadata, not a blanket exclusion of every fee.

Cost Explorer's amortized view follows the same economic intent: it spreads reservation and Savings Plans upfront and recurring fees across the period. AWS notes that its daily view places unused commitment fees on the first day of the month or purchase date. That date presentation can create a daily spike even though the monthly total is the important control.

## What Net Amortized Cost Adds

Net amortized cost applies the amortization logic after applicable discounts. In CUR, net fields such as `reservation/NetEffectiveCost` and `savingsPlan/NetSavingsPlanEffectiveCost` are included only when the account has a discount in the applicable billing period. Cost Explorer exposes `NetAmortizedCost` as a separate metric.

Net amortized cost is usually the strongest economic basis when the goal is to show teams the organization's actual post-discount cost of their consumed services. It is not automatically the correct internal price. An enterprise may deliberately centralize a negotiated discount, pass it through, or publish a stable rate card. AWS reports the financial outcome; it does not define that governance choice.

Do not silently mix net and non-net values by service. Net amortized calculations also need the applicable net fields for ordinary usage and unused commitments, not only the net effective fields for covered usage. Establish a documented fallback:

1. use the relevant net cost field when it is populated, such as `lineItem/NetUnblendedCost` for ordinary usage, the net effective fields for covered usage, the net unused fields for RIs, and the net commitment components when deriving unused Savings Plans cost;
2. use the corresponding non-net field when the net field is unavailable;
3. record which basis was selected on every output row;
4. reconcile the resulting total to a separately calculated monthly control.

The fallback is a pipeline rule, not evidence that the two cost bases mean the same thing.

## Keep Cost Basis and Allocation Policy Separate

A maintainable showback first calculates an economic amount and then applies ownership policy:

```text
reported_amount
  = billing_amount_under_selected_cost_basis
  x allocation_weight_under_versioned_policy
```

The first term comes from AWS billing semantics. The second belongs to the organization. Examples of policy decisions include:

- whether unused RI and Savings Plan cost stays with a central FinOps portfolio;
- whether enterprise discounts are passed to consumers;
- whether support is allocated by eligible spend;
- whether shared Kubernetes idle cost is distributed or shown separately;
- whether credits follow the original service, the receiving account, or a central budget.

Do not bury these decisions inside a SQL `CASE` expression called `amortized_cost`. Give each component a name such as `consumed_effective_cost`, `unused_commitment_cost`, `shared_cost`, and `billing_adjustment`.

## A Practical Selection Rule

For a consumption-oriented AWS showback, a defensible default is:

1. calculate the relevant net cost for each cost class where corresponding net fields exist;
2. otherwise calculate the corresponding non-net cost;
3. preserve unused commitment as its own pool;
4. keep credits, refunds, support, Marketplace, and tax as explicit adjustment classes;
5. apply approved ownership and distribution rules only after those classes are visible;
6. show both the cost-basis version and allocation-policy version on the report.

Also retain unblended and public On-Demand comparisons for analysis. A team's economic cost can fall because it received a commitment benefit even while its underlying demand increased. Showing quantities and the comparison basis prevents a favorable rate from hiding waste.

## Reconcile Before Publishing

Run at least these controls for every billing period:

- exactly one effective-cost branch contributes for each line item;
- RI and Savings Plan upfront purchase rows are not counted both as cash fees and amortization;
- Savings Plan negations do not reduce an already-effective Savings Plan cost a second time;
- used cost plus unused cost agrees with the selected commitment total within a documented tolerance;
- allocated team totals plus central and unresolved residuals equal the showback control total;
- the chosen net or non-net basis is consistent and visible.

Finally, keep invoice reconciliation distinct from amortized showback reconciliation. An upfront purchase can create a legitimate timing bridge between cash billed this month and economic cost spread across the commitment term.

## Official Documentation

- [AWS Cost Explorer: Exploring unblended, amortized, and net amortized costs](https://docs.aws.amazon.com/cost-management/latest/userguide/ce-exploring-data.html)
- [AWS Cost Explorer API: GetCostAndUsage metrics](https://docs.aws.amazon.com/aws-cost-management/latest/APIReference/API_GetCostAndUsage.html)
- [AWS Data Exports: Line item details and line-item types](https://docs.aws.amazon.com/cur/latest/userguide/Lineitem-columns.html)
- [AWS Data Exports: Understanding amortized reservation data](https://docs.aws.amazon.com/cur/latest/userguide/amortized-reservation.html)
- [AWS Data Exports: Reservation details](https://docs.aws.amazon.com/cur/latest/userguide/reservation-columns.html)
- [AWS Data Exports: Understanding Savings Plans](https://docs.aws.amazon.com/cur/latest/userguide/cur-sp.html)
- [AWS Data Exports: Savings Plans details](https://docs.aws.amazon.com/cur/latest/userguide/savingsplans-columns.html)

## Conclusion

Use unblended cost to understand billed line items, amortized cost to place commitment economics in the periods that consume them, and net amortized cost when post-discount economics should reach the showback. Then apply unused commitment, discount, and shared-cost policy explicitly. A cost metric describes AWS billing treatment; it does not decide organizational accountability.
