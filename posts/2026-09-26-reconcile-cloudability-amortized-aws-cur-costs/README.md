# How to Reconcile Cloudability’s Amortized AWS Costs with CUR Line Items, RIs, and Savings Plans

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: AWS, FinOps, Cost and Usage Report, Reserved Instances, Savings Plans

Description: Reconcile Cloudability AWS amortized costs by charge class, consuming account, commitment owner, and CUR effective-cost fields without double counting fees.

Summing AWS CUR unblended cost and comparing it directly with Cloudability Cost (Amortized) is not an amortization reconciliation. It compares two treatments of commitment charges. A useful reconciliation explains the difference through line-item classes and then tests that every economic amount is counted once.

Start with one closed billing month and one payer. Avoid beginning with an organization-wide report containing multiple currencies, custom pricing, shared-cost allocations, and an open billing period.

## Freeze the Cloudability comparison

Export a report with Cost (Amortized), the payer and account identifiers, and enough billing dimensions to distinguish usage from commitment charges. Record its view, filters, extraction time, currency, and allocation settings.

Keep Cost (Adjusted Amortized) out of the initial comparison unless you also intend to reproduce the configured custom pricing. IBM distinguishes that adjusted measure from the underlying amortized measure. [Cloudability cost glossary](https://www.ibm.com/docs/en/cloudability-commercial/cloudability-standard/saas?topic=reference-cloudability-glossary-cost-dimensions-metrics)

Archive the matching CUR manifest and source version used for your analysis. A newly revised export compared against an older Cloudability result can produce a timing discrepancy that no SQL correction will fix.

If the discrepancy changes between repeated extracts, resolve source freshness before refining the calculation.

## Classify rows before aggregating

Use the original CUR field names as the semantic reference. Athena or warehouse column names can differ by export format and table setup.

| CUR class | Component to inspect for ordinary amortized reconciliation |
| --- | --- |
| Ordinary `Usage` | `lineItem/UnblendedCost` |
| RI `DiscountedUsage` | `reservation/EffectiveCost` |
| `RIFee` | Unused upfront amortization plus unused recurring fee |
| `SavingsPlanCoveredUsage` | `savingsPlan/SavingsPlanEffectiveCost` |
| `SavingsPlanRecurringFee` | Unused commitment component |
| Commitment upfront purchase | Timing bridge; avoid adding the purchase again |
| `SavingsPlanNegation` | Avoid subtracting it again after using effective cost |
| Other fees and adjustments | Classify explicitly; do not discard wholesale |

AWS documents the line-item types and their billing roles in the [CUR line-item reference](https://docs.aws.amazon.com/cur/latest/userguide/Lineitem-columns.html). Treat this table as the structure of the investigation, not a complete accounting query for every AWS charge type.

## Prove the Reserved Instance components

For RI-covered usage, `reservation/EffectiveCost` combines the amortized upfront cost attributed to usage and its recurring fee. For the unused component, inspect `reservation/UnusedAmortizedUpfrontFeeForBillingPeriod` and `reservation/UnusedRecurringFee` on the applicable fee records. Preserve the reservation ARN for grouping. [AWS reservation fields](https://docs.aws.amazon.com/cur/latest/userguide/reservation-columns.html)

Choose one reservation and compare three subtotals:

```text
consumed effective cost
+ unused amortized upfront cost
+ unused recurring cost
= reservation economic cost represented for the period
```

Do not add the original upfront purchase on top of this result. Also do not discard every CUR `Fee` row: a fee unrelated to an amortized commitment may belong in the period's cost.

If one reservation fails the control, examine the service, commitment term, billing period boundaries, and applicable fields before generalizing the calculation. Some reservation products have different field availability; a missing field is evidence to investigate, not permission to invent a value.

## Prove the Savings Plan components

AWS exposes the effective amount attributed to covered usage in `savingsPlan/SavingsPlanEffectiveCost`. On recurring fee records, `savingsPlan/TotalCommitmentToDate` and `savingsPlan/UsedCommitment` provide the components used to identify unused commitment. [AWS Savings Plans fields](https://docs.aws.amazon.com/cur/latest/userguide/savingsplans-columns.html)

Work at the source record's grain before rolling up. Do not join one recurring fee row onto hundreds of covered-usage rows and then sum the duplicated fee.

For an illustrative hour, suppose effective covered usage is $8 and the applicable commitment is $10. The unused portion is $2 and the economic total is $10. If your report gives $18, it probably added the full commitment to consumed effective cost. If it gives a negative result, inspect whether Savings Plan negations were applied after replacing on-demand-equivalent usage with effective cost.

Retain commitment identifiers, owner account, consuming account, and period in the intermediate output. Those keys make duplication and attribution errors visible.

## Reconcile ownership separately from amount

IBM states that consumed AWS commitment costs follow the account or resource that used the commitment, while unused amounts remain with the commitment holder. Consequently, owner-account totals and consuming-account totals answer different questions. [IBM amortized cost behavior](https://www.ibm.com/support/pages/node/7283570)

Build two controls: one grouped by commitment identity and one by consuming account. First verify that each commitment balances. Then verify that consumed account allocations plus the unused owner residual equal the payer total.

A filtered view that excludes the commitment owner can legitimately omit unused cost. That is a scope difference, not necessarily an amortization defect.

## Turn the remaining difference into named buckets

Use a reconciliation worksheet with these columns:

```text
period | payer | charge_class | cur_amount | cloudability_amount
       | difference | explanation | evidence
```

Separate differences caused by freshness, scope, currency conversion, custom pricing, source duplication, and unsupported or exceptional charge treatment. Keep credits, refunds, tax, Marketplace, and support visible as their own categories where applicable.

Use decimal arithmetic and compare unrounded values before applying presentation rounding. A rounding tolerance should explain pennies, not hide an omitted commitment purchase or a duplicated fee.

When escalating, provide one narrowly scoped failing example with identifiers, field values, source manifest, report settings, and expected arithmetic. A reproducible commitment-level discrepancy is much easier to resolve than a screenshot showing two different organization totals.
