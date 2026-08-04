# Allocate Unused AWS Commitments Without Distorting Showback

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: AWS, Showback, FinOps, Savings Plans, Reserved Instances, Cost Allocation, Cloud Economics

Description: Separate used and unused AWS commitments, then assign the unused pool with an explicit policy that preserves accountability and stable team signals.

---

A Savings Plan or Reserved Instance can be financially sound for the company while being partly unused in one month. The unused amount is real economic cost, but it is not evidence that a particular workload consumed capacity. Putting it directly onto whichever team happens to have covered usage creates a false usage signal. Hiding it makes the showback incomplete.

The solution is to calculate used and unused commitment cost separately, reconcile the two, and only then apply an approved allocation policy.

## Identify the Cost Before Choosing an Owner

AWS Cost and Usage Reports expose different fields for Reserved Instances and Savings Plans.

For an RI:

- covered instance use has `lineItem/LineItemType` equal to `DiscountedUsage`;
- `reservation/EffectiveCost` assigns the used portion's amortized upfront and recurring cost to that usage;
- the `RIFee` row carries `reservation/UnusedAmortizedUpfrontFeeForBillingPeriod` and `reservation/UnusedRecurringFee`;
- an All Upfront RI can still have a zero-dollar `RIFee` line because that row carries reservation and amortization metadata.

For a Savings Plan:

- covered use has type `SavingsPlanCoveredUsage` and receives `savingsPlan/SavingsPlanEffectiveCost`;
- the corresponding `SavingsPlanNegation` offsets the covered row's On-Demand-equivalent unblended charge;
- `SavingsPlanRecurringFee` carries `savingsPlan/TotalCommitmentToDate` and `savingsPlan/UsedCommitment`;
- the unused amount for that recurring-fee row is the former minus the latter;
- `SavingsPlanUpfrontFee` is the purchase-time cash line, not an additional amortized showback amount.

Do not derive unused commitment as public On-Demand cost minus effective cost. That difference measures savings relative to a comparison price, not unused contracted spend.

## Build a Commitment Ledger

Create one ledger at commitment and billing-period grain before allocating anything to teams:

| Field | Purpose |
| --- | --- |
| `commitment_arn` | Stable key from the RI or Savings Plan metadata |
| `billing_period` | Month being reported |
| `purchasing_account_id` | Account that owns the commitment |
| `beneficiary_account_id` | Account whose usage received a benefit, when applicable |
| `used_effective_cost` | Sum attached to covered usage |
| `unused_commitment_cost` | Sum carried on RI or Savings Plan fee rows |
| `selected_cost_basis` | Amortized or net amortized |
| `allocation_policy_version` | Approved internal rule set |

At minimum, enforce this control:

```text
commitment_period_cost
  = used_effective_cost
  + unused_commitment_cost
  + explained_adjustments
```

Rounding and post-close adjustments may require a small tolerance, but do not clamp a negative residual to zero before investigating it. A sign error, duplicated CUR version, or mixed net and non-net fields can otherwise disappear inside the allocation.

## AWS Benefit Sharing Is Not Showback Policy

AWS Organizations can share RI and Savings Plans discounts. Current AWS billing preferences support organization-wide and group-based modes, and the benefit is first applied to the owner before eligible sharing according to the configured mode. AWS also states that the final bill for a month uses the preferences in effect at the end of the month.

Those rules determine which usage receives AWS's billing benefit. They do not decide which internal budget should own unused commitment cost. A showback can follow the AWS beneficiary, the purchasing account, a central portfolio, or another approved model. Label that choice as company policy.

## Choose One of Three Defensible Policies

### Central portfolio ownership

Put unused cost in a central `commitment-portfolio` bucket. This is usually the cleanest default when a FinOps or infrastructure function chooses commitment amounts for an organization-wide pool.

Advantages:

- workload teams see only cost associated with their consumed benefit;
- teams are not penalized for demand changes elsewhere;
- the buyer has a clear utilization KPI and budget.

The central pool must remain visible. It should not become an unreported reconciliation plug.

### Purchaser ownership

Assign unused cost to the account, business unit, or platform that explicitly bought or requested the commitment. This is useful where buying authority is delegated and the buyer controls the forecast.

Record the purchaser from commitment metadata or an approved registry. The `lineItem/UsageAccountId` on a fee row can identify the account where a charge appears, but internal ownership may be a business entity rather than that AWS account.

### Beneficiary distribution

Distribute unused cost among teams that received commitment benefit, commonly in proportion to used effective cost, covered units, or a pre-agreed reservation share.

This can produce full-cost business-unit reporting, but it changes a team's rate because another team underused the pool. Use it only when recipients understand that the amount is portfolio overhead rather than their direct consumption.

For proportional distribution:

```text
team_weight
  = team_used_effective_cost / total_used_effective_cost

team_unused_share
  = unused_commitment_cost * team_weight
```

If total used effective cost is zero, the formula has no valid beneficiary. Route the entire amount to the documented fallback owner rather than dividing by zero or spreading it across unrelated cloud spend.

## Prefer a Hybrid for Mature Programs

A practical policy often combines the models:

- centrally purchased organization-wide commitments: central unused pool;
- commitments requested by a named product: purchaser owns unused cost up to its approved reservation share;
- temporary migration or launch variance: central exception with an expiry date;
- used effective cost: assigned to the workload that AWS shows as covered;
- material residual: unresolved until investigated, never silently prorated.

Version thresholds and exception dates. Otherwise, teams cannot reproduce why the same commitment was treated differently in two months.

## Keep Utilization and Accountability Visible

Publish commitment performance alongside showback:

- commitment period cost;
- used effective cost;
- unused commitment cost;
- utilization percentage;
- purchasing owner;
- consuming beneficiaries;
- unused-cost policy and recipient;
- expiring exceptions.

Avoid ranking application teams by a blended effective rate that includes centralized unused cost unless that is the intended contract. A low utilization percentage is primarily a portfolio-sizing signal; a workload's inefficient compute use is a different signal.

## Common Failure Modes

- Charging the `SavingsPlanUpfrontFee` and also the amortized Savings Plan effective cost.
- Treating `SavingsPlanNegation` as an additional discount after selecting effective cost.
- Dropping zero-dollar `RIFee` rows and losing All Upfront RI unused metadata.
- Adding unused cost to covered resources in proportion to On-Demand savings without approval.
- Mixing `NetEffectiveCost` for used RI consumption with non-net unused RI fields.
- Assuming AWS's cross-account benefit application establishes internal ownership.
- Recomputing last month's allocation with this month's ownership table.

Each is preventable when the commitment ledger is calculated independently from the team allocation.

## Official Documentation

- [AWS Data Exports: Understanding unused reservation costs](https://docs.aws.amazon.com/cur/latest/userguide/unused-reservation-costs.html)
- [AWS Data Exports: Understanding amortized reservation data](https://docs.aws.amazon.com/cur/latest/userguide/amortized-reservation.html)
- [AWS Data Exports: Reservation details](https://docs.aws.amazon.com/cur/latest/userguide/reservation-columns.html)
- [AWS Data Exports: Understanding Savings Plans line items](https://docs.aws.amazon.com/cur/latest/userguide/cur-sp.html)
- [AWS Data Exports: Savings Plan columns](https://docs.aws.amazon.com/cur/latest/userguide/table-dictionary-cur2-savings-plan.html)
- [AWS Billing: Reserved Instances and Savings Plans discount sharing](https://docs.aws.amazon.com/awsaccountbilling/latest/aboutv2/ri-turn-off.html)
- [AWS Billing: Understanding consolidated bills](https://docs.aws.amazon.com/awsaccountbilling/latest/aboutv2/con-bill-blended-rates.html)

## Conclusion

Unused commitment cost belongs in the showback, but not in direct workload consumption by default. Calculate it from the dedicated RI and Savings Plan fields, reconcile it to the commitment, and send it to a named central, purchaser, or beneficiary policy. AWS determines billing benefit application; your organization must explicitly determine accountability.
