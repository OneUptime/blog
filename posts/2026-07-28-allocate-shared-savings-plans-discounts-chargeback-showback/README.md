# How to Allocate Shared Savings Plans Discounts for Chargeback and Showback

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: AWS, Savings Plans, Chargeback, Showback, Cost and Usage Report

Description: Allocate shared Savings Plans cost from covered-usage effective cost while handling owner fees, unused commitment, and internal policy explicitly.

---

Allocate the used portion of shared Savings Plans from each covered-usage line's `savingsPlan/SavingsPlanEffectiveCost`. This field represents the proportion of the plan's monthly upfront and recurring commitment allocated to that usage line. Then treat unused commitment according to a separate, documented internal policy.

Do not charge every Savings Plan fee to the purchasing account and assume it received every benefit. Under AWS Organizations sharing, the owner carries the fee while covered usage can appear in several accounts.

## Separate AWS Billing from Internal Allocation

AWS billing has three different roles:

- **Owner account:** purchased the plan and is responsible for the commitment.
- **Usage account:** generated eligible usage to which the plan applied.
- **Management account:** receives and pays the consolidated organization bill.

These can be different accounts. Chargeback decides who is internally responsible for the cost; showback reports the same allocation without posting an internal charge.

AWS does not mandate the organization's internal policy. It provides line-item data that supports a reproducible one.

## Use CUR 2.0 through AWS Data Exports

Create a CUR 2.0 standard data export with:

- hourly granularity;
- Parquet format for efficient querying;
- delivery to a controlled Amazon S3 bucket;
- an AWS Glue Data Catalog table;
- Amazon Athena or another query engine.

Resource IDs and split cost allocation data are optional for the account-level Savings Plans method described in AWS's chargeback article, though they may be useful for broader allocation.

Protect the export because it contains account and cost data. Version the allocation query and retain monthly outputs.

## Know the Relevant Line Items

`SavingsPlanRecurringFee` represents the commitment fee charged to the owner account. Its relevant CUR fields include:

- `savingsPlan/RecurringCommitmentForBillingPeriod`;
- `savingsPlan/AmortizedUpfrontCommitmentForBillingPeriod`;
- `savingsPlan/UsedCommitment`;
- `savingsPlan/SavingsPlanARN`;
- payment option, offering type, start, and end.

`SavingsPlanCoveredUsage` represents eligible usage that received a Savings Plans rate. Its key field is:

- `savingsPlan/SavingsPlanEffectiveCost`.

AWS defines effective cost as the proportion of the plan's monthly commitment amount—upfront and recurring—allocated to each covered-usage line. In CUR 2.0 Athena naming, it commonly appears as:

```text
savings_plan_savings_plan_effective_cost
```

Group those covered-usage lines by `line_item_usage_account_id` and Savings Plan ARN to identify beneficiaries.

## Allocate Used Commitment by Effective Cost

For each billing period:

1. Select `SavingsPlanCoveredUsage` lines.
2. Group by usage account and Savings Plan ARN.
3. Sum `SavingsPlanEffectiveCost`.
4. Attribute that sum as the plan cost consumed by the usage account.
5. Reconcile all beneficiary sums with used commitment.

A simplified query shape for June 2026 is:

```sql
SELECT
  line_item_usage_account_id,
  savings_plan_savings_plan_a_r_n,
  SUM(savings_plan_savings_plan_effective_cost) AS allocated_plan_cost
FROM cur2
WHERE line_item_line_item_type = 'SavingsPlanCoveredUsage'
  AND bill_billing_period_start_date = TIMESTAMP '2026-06-01 00:00:00'
GROUP BY 1, 2;
```

Column spelling depends on the Data Exports table schema. Inspect the generated table rather than copying a name blindly.

For net views where applicable discounts are present, use `savingsPlan/NetSavingsPlanEffectiveCost` with `savingsPlan/NetRecurringCommitmentForBillingPeriod` and `savingsPlan/NetAmortizedUpfrontCommitmentForBillingPeriod`. AWS does not document a net equivalent of `UsedCommitment`, so derive net unused commitment as the net plan fee minus the sum of net effective cost. Align the chosen cost basis with finance policy, and do not mix net and non-net values in one reconciliation.

## Calculate and Assign Unused Commitment

The plan fee can exceed the effective cost allocated to covered usage. On a non-net basis:

```text
plan fee
  = recurring commitment for period
  + amortized upfront commitment for period

unused commitment
  = plan fee - used commitment
```

AWS's example query uses recurring and amortized upfront fee fields from `SavingsPlanRecurringFee` lines and compares them with `UsedCommitment`.

Choose an explicit policy for unused commitment:

- **Purchaser pays:** appropriate when a business unit independently chose the commitment.
- **Central FinOps pays:** appropriate for a centrally managed pooled portfolio.
- **Group pays:** distribute within the Cost Category group that approved the plan.
- **Proportional beneficiaries pay:** spreads waste with used allocation, but can charge teams for a sizing decision they did not control.

There is no universally correct answer. Keep unused commitment visible rather than silently blending it into resource rates; otherwise teams cannot distinguish compute efficiency from purchasing error.

## Show Both Cost and Benefit

An effective showback report should include:

| Field | Purpose |
| --- | --- |
| Purchasing account | Contract owner and fee source |
| Beneficiary usage account | Account whose usage received the plan |
| Savings Plan ARN and type | Traceability |
| Effective cost allocated | Share of used commitment |
| On-Demand equivalent | Counterfactual reference |
| Estimated realized savings | On-Demand equivalent minus allocated effective cost |
| Unused commitment | Portfolio waste |
| Sharing group | Policy boundary |

Use the AWS-provided On-Demand-equivalent and line-item data consistently. Credits, private pricing, refunds, taxes, and support may require separate treatment.

Do not present an On-Demand list-price difference as cash savings without explaining the cost basis.

## Account for Current Sharing Modes

AWS now supports:

- organization-wide sharing;
- prioritized Cost Category group sharing;
- restricted Cost Category group sharing;
- account-level activation and deactivation.

Owner usage always comes first. Prioritized groups receive benefit before the wider organization, while restricted groups keep benefit inside the group even if commitment is unused.

Group sharing can reduce synthetic reallocation by directing benefit toward intended accounts, but it does not eliminate chargeback:

- owner fees can still differ from beneficiary usage;
- multiple accounts can share one plan;
- unused commitment still needs an owner;
- the management account cannot belong to a group;
- each account can belong to only one sharing group.

Store the sharing mode and group membership effective for each billing period with the allocation output.

## Reconcile before Publishing

Run these controls monthly:

1. Sum owner recurring and amortized upfront commitment.
2. Sum effective cost on covered usage by plan ARN.
3. Calculate unused commitment.
4. Verify allocated effective cost plus unused policy allocation equals the plan fee, subject to the chosen net or non-net basis.
5. Compare plan inventory start and end dates.
6. Check returned and expired plans.
7. Review sharing-preference and account-membership changes.
8. Tie the result to the finalized AWS bill.

AWS currently says the final monthly bill uses sharing preferences set at the end of the last day of the month in UTC. Reconcile after finalization rather than treating an earlier estimated bill as final.

## Make the Policy Governable

Document:

- allocation grain and cost basis;
- treatment of unused commitment;
- credits and private discounts;
- rounding;
- late-arriving adjustments;
- account moves and closures;
- dispute process;
- report owner and publication date.

For showback, publish beneficiary cost, savings, and waste without journal entries. For chargeback, use the same reconciled dataset to create internal postings.

The essential principle is to follow actual benefit. `SavingsPlanEffectiveCost` allocates used commitment to the line that consumed it; a separate policy assigns the part no usage consumed.

## Official Documentation

- [Savings Plans columns in AWS Data Exports and CUR](https://docs.aws.amazon.com/cur/latest/userguide/savingsplans-columns.html)
- [AWS Savings Plans chargeback strategy](https://aws.amazon.com/blogs/aws-cloud-financial-management/aws-savings-plans-how-to-implement-an-effective-chargeback-strategy/)
- [Reserved Instances and Savings Plans discount sharing](https://docs.aws.amazon.com/awsaccountbilling/latest/aboutv2/ri-turn-off.html)
- [Creating standard data exports](https://docs.aws.amazon.com/cur/latest/userguide/dataexports-create-standard.html)
- [Understanding consolidated bills](https://docs.aws.amazon.com/awsaccountbilling/latest/aboutv2/con-bill-blended-rates.html)
