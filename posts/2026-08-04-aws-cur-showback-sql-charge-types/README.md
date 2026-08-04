# AWS CUR Showback SQL for Usage, Commitments, and Fees

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: AWS, Athena, SQL, Showback, Cost and Usage Report, Savings Plans, Reserved Instances

Description: Build an auditable AWS CUR amortized-cost query that handles usage, commitment coverage, unused commitments, fees, and billing adjustments once.

---

An AWS Cost and Usage Report cannot be converted to amortized showback by summing one column. `Usage`, `DiscountedUsage`, and `SavingsPlanCoveredUsage` store their economic cost differently. `RIFee`, `SavingsPlanRecurringFee`, and `Fee` require different treatment again.

The safest query classifies every row into a named component, sums those components, and reports anything unmatched. This article uses the Athena column names generated for a legacy CUR. Cost and Usage Report 2.0 uses the same snake-case names in its fixed table dictionary, but always inspect the schema of the export you actually query.

## Understand the Branches First

Use these non-net amortized branches:

| `line_item_line_item_type` | Amount used for amortized showback | Reason |
| --- | --- | --- |
| `Usage` | `line_item_unblended_cost` | On-Demand, Spot, and other ordinary billed usage |
| `DiscountedUsage` | `reservation_effective_cost` | RI-covered usage receives its used amortized cost here |
| `SavingsPlanCoveredUsage` | `savings_plan_savings_plan_effective_cost` | Covered usage receives its share of the Savings Plan commitment |
| `RIFee` | unused upfront amortization plus unused recurring fee | Only the unused RI portion remains after used cost is assigned above |
| `SavingsPlanRecurringFee` | total commitment to date minus used commitment | Remaining Savings Plan commitment for the row |
| `Fee` without an RI ARN | `line_item_unblended_cost` | Non-RI subscription or other fee that has not been amortized elsewhere |
| `Fee` with an RI ARN | zero in this view | RI purchase cash must not be added to RI amortization again |
| `SavingsPlanNegation` | zero | It offsets the covered row's On-Demand-equivalent unblended amount |
| `SavingsPlanUpfrontFee` | zero | Purchase-time cash is represented through Savings Plan amortization |

Credits, refunds, and tax are adjustments rather than consumed resource cost. Keep them in separate columns so policy can include, centralize, or allocate them without changing the core calculation.

## Use a Component Query

Replace `cur_database.cur_table` and the billing-period dates. This is Athena SQL over a Parquet CUR table:

```sql
WITH classified AS (
    SELECT
        identity_line_item_id,
        bill_billing_period_start_date,
        line_item_usage_account_id,
        line_item_product_code,
        line_item_resource_id,
        line_item_line_item_type,

        CASE
            WHEN line_item_line_item_type = 'Usage'
                THEN COALESCE(line_item_unblended_cost, 0)
            WHEN line_item_line_item_type = 'DiscountedUsage'
                THEN COALESCE(reservation_effective_cost, 0)
            WHEN line_item_line_item_type = 'SavingsPlanCoveredUsage'
                THEN COALESCE(savings_plan_savings_plan_effective_cost, 0)
            ELSE 0
        END AS consumed_effective_cost,

        CASE
            WHEN line_item_line_item_type = 'RIFee'
                THEN COALESCE(
                    reservation_unused_amortized_upfront_fee_for_billing_period,
                    0
                ) + COALESCE(reservation_unused_recurring_fee, 0)
            WHEN line_item_line_item_type = 'SavingsPlanRecurringFee'
                THEN COALESCE(savings_plan_total_commitment_to_date, 0)
                   - COALESCE(savings_plan_used_commitment, 0)
            ELSE 0
        END AS unused_commitment_cost,

        CASE
            WHEN line_item_line_item_type = 'Fee'
             AND COALESCE(reservation_reservation_a_r_n, '') = ''
                THEN COALESCE(line_item_unblended_cost, 0)
            ELSE 0
        END AS noncommitment_fee,

        CASE
            WHEN line_item_line_item_type IN ('Credit', 'Refund', 'Tax')
                THEN COALESCE(line_item_unblended_cost, 0)
            ELSE 0
        END AS billing_adjustment,

        CASE
            WHEN line_item_line_item_type NOT IN (
                'Usage',
                'DiscountedUsage',
                'SavingsPlanCoveredUsage',
                'RIFee',
                'SavingsPlanRecurringFee',
                'Fee',
                'SavingsPlanNegation',
                'SavingsPlanUpfrontFee',
                'Credit',
                'Refund',
                'Tax'
            )
                THEN COALESCE(line_item_unblended_cost, 0)
            ELSE 0
        END AS unclassified_cost
    FROM cur_database.cur_table
    WHERE bill_billing_period_start_date >= TIMESTAMP '2026-07-01 00:00:00'
      AND bill_billing_period_start_date <  TIMESTAMP '2026-08-01 00:00:00'
)
SELECT
    date_trunc('month', bill_billing_period_start_date) AS billing_month,
    line_item_usage_account_id,
    line_item_product_code,
    SUM(consumed_effective_cost) AS consumed_effective_cost,
    SUM(unused_commitment_cost) AS unused_commitment_cost,
    SUM(noncommitment_fee) AS noncommitment_fee,
    SUM(billing_adjustment) AS billing_adjustment,
    SUM(unclassified_cost) AS unclassified_cost,
    SUM(
        consumed_effective_cost
      + unused_commitment_cost
      + noncommitment_fee
      + billing_adjustment
    ) AS amortized_total_with_adjustments
FROM classified
GROUP BY 1, 2, 3
ORDER BY 1, 2, 3;
```

This query includes `SavingsPlanRecurringFee` even though many simplified descriptions list only the covered-usage types. Without it, unused Savings Plan commitment disappears.

`unclassified_cost` is a control column, not part of `amortized_total_with_adjustments`. A nonzero value means the source contains a line-item type that this formula has not classified. Review it and add an intentional billing-semantic branch before publishing; do not automatically add every unfamiliar signed amount to amortized cost.

## Why `Fee` Needs the RI ARN Test

AWS defines `Fee` broadly, including upfront annual subscription fees. Some `Fee` rows belong to RI purchase activity and carry `reservation/ReservationARN`. Their upfront value is already represented in `reservation/EffectiveCost` for used capacity and the unused RI fields for unused capacity.

A non-RI fee has no reservation ARN and is not captured by those RI fields, so the query retains its unblended amount. Do not replace the ARN test with a description substring; descriptions are human-readable detail, not a stable charge classification.

If the business wants a narrower fee scope, classify non-RI fees by product, billing entity, and an approved fee policy after this billing-semantic branch.

## Keep the Savings Plan Difference Signed

It is tempting to write:

```sql
greatest(total_commitment_to_date - used_commitment, 0)
```

Do not do that in the canonical layer. A negative amount can reveal mixed report versions, duplicated rows, incorrect field types, or unexpected billing data. Preserve the signed difference, aggregate it at Savings Plan ARN and period, and investigate values outside the rounding tolerance. Presentation code can display a reviewed zero only after the control passes.

## Add Net Amortized Cost Deliberately

For net amortized showback, use the documented net counterparts when they exist:

- `reservation_net_effective_cost` for `DiscountedUsage`;
- `reservation_net_unused_amortized_upfront_fee_for_billing_period` and `reservation_net_unused_recurring_fee` for `RIFee`;
- `savings_plan_net_savings_plan_effective_cost` for covered Savings Plan usage;
- `line_item_net_unblended_cost` for ordinary usage, eligible non-RI fees, credits, refunds, and tax.

The unused Savings Plan amount needs a discount factor because `TotalCommitmentToDate` and `UsedCommitment` are not themselves net fields. AWS's Cloud Intelligence Dashboards guidance scales their difference using the applicable net versus non-net upfront commitment ratio. Use that documented expression rather than merely coalescing a nonexistent `net_used_commitment` column.

Net columns are conditional in billing data. Test the exact monthly schema and record whether a fallback to non-net cost occurred.

## Prevent Resource-Level Misallocation

Covered usage has consumer context. Unused commitment rows generally point to the commitment owner, not to the workload that might have consumed more capacity. Noncommitment fees and adjustments can also lack a resource ID or team tag.

Therefore, do not group the query by `line_item_resource_id` and convert null to a product team's name. Produce separate pools:

- direct consumed effective cost;
- unused commitment;
- noncommitment fees;
- credits and refunds;
- tax;
- unresolved or unsupported line-item types.

Allocate the pools in a second, versioned policy step.

## Run Coverage and Double-Count Controls

Start with a line-type inventory:

```sql
SELECT
    line_item_line_item_type,
    COUNT(*) AS rows,
    SUM(COALESCE(line_item_unblended_cost, 0)) AS unblended_cost
FROM cur_database.cur_table
WHERE bill_billing_period_start_date >= TIMESTAMP '2026-07-01 00:00:00'
  AND bill_billing_period_start_date <  TIMESTAMP '2026-08-01 00:00:00'
GROUP BY 1
ORDER BY 1;
```

Then verify:

- every observed type is intentionally included, excluded, or routed to a residual;
- each row contributes to no more than one core component;
- RI `Fee` and Savings Plan upfront rows contribute zero to amortized cost;
- `SavingsPlanNegation` contributes zero after effective cost is selected;
- commitment used plus unused totals reconcile at commitment ARN grain;
- the CUR status is `READY` before running the published snapshot;
- only files referenced by the current manifest or export version are loaded.

If CUR 2.0 discount automation is enabled, also account for its `discount` map and `discount_total_discount` behavior. The manual-discount-compatibility configuration can instead present discounts as separate lines, so a query must match the export configuration.

## Official Documentation

- [AWS Data Exports: Line item details and exact charge types](https://docs.aws.amazon.com/cur/latest/userguide/Lineitem-columns.html)
- [AWS Data Exports: Reservation details and effective-cost fields](https://docs.aws.amazon.com/cur/latest/userguide/reservation-columns.html)
- [AWS Data Exports: Savings Plan columns](https://docs.aws.amazon.com/cur/latest/userguide/table-dictionary-cur2-savings-plan.html)
- [AWS Data Exports: Understanding Savings Plans line items](https://docs.aws.amazon.com/cur/latest/userguide/cur-sp.html)
- [AWS Data Exports: Running Athena queries and column-name conversion](https://docs.aws.amazon.com/cur/latest/userguide/cur-ate-run.html)
- [AWS Cloud Intelligence Dashboards: Net amortized cost calculation](https://docs.aws.amazon.com/guidance/latest/cloud-intelligence-dashboards/net-amortized-cost.html)
- [AWS Data Exports: CUR 2.0 table and discount configuration](https://docs.aws.amazon.com/cur/latest/userguide/table-dictionary-cur2.html)

## Conclusion

Correct AWS CUR showback SQL selects unblended cost for ordinary usage, effective fields for covered usage, dedicated unused fields for commitments, and only non-RI `Fee` rows as additional period fees. Keep adjustments and residuals visible, validate the active schema, and allocate indirect pools only after the billing calculation reconciles.
