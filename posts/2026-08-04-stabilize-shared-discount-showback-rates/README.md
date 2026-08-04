# Stabilize AWS Showback When Shared Discounts Move

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: AWS, Showback, FinOps, Savings Plans, Reserved Instances, Rate Cards, Cost Allocation

Description: Prevent one team's usage spike from changing another team's showback rate by separating AWS discount outcomes from stable internal pricing policy.

---

Shared AWS commitments create a useful company-wide saving and a difficult internal signal. A development spike can absorb Savings Plan benefit that production received yesterday. If showback simply passes through every hourly effective cost, production's apparent unit rate can change even though its architecture and demand did not.

That movement is valid AWS billing data. It is often poor performance feedback. Stabilization means preserving the AWS result for reconciliation while using a deliberate internal rate or entitlement policy for team reporting.

## Why the Effective Rate Moves

In consolidated billing, eligible Reserved Instance and Savings Plans benefits can be shared across accounts. AWS first applies a Savings Plan to eligible usage in the owner account. Subject to the configured sharing scope, AWS then applies remaining benefit to usage with the highest savings percentage; when percentages are equal, the usage with the lowest Savings Plan rate is applied first.

The result depends on the whole eligible demand set in an hour. For example:

1. after the Savings Plan is applied to eligible usage in its owner account, production and development both run eligible compute at the same configured sharing priority;
2. production normally receives most of a shared commitment;
3. development launches a large eligible test fleet that ranks ahead of some production usage under AWS's savings-percentage ordering;
4. the billing engine applies benefit across the new set according to AWS rules;
5. some production usage is now On-Demand while development receives covered usage.

AWS Cost and Usage Reports accurately record this through `DiscountedUsage`, `SavingsPlanCoveredUsage`, commitment ARNs, and effective-cost fields. AWS does not promise that a workload will retain a particular internal effective rate from one hour to the next.

## Decide Whether the Showback Is an Invoice Mirror or a Behavior Signal

There are two legitimate products:

- **Pass-through showback** reports the exact effective cost AWS assigned to each consumer. It reconciles naturally but inherits cross-team rate volatility.
- **Stable-rate showback** prices usage under a published internal rule. It gives teams a predictable signal but requires a separate variance bridge to the AWS bill.

Do not switch between the two implicitly. Put `pricing_model`, `rate_card_version`, and `cost_basis` on each report.

## Model 1: Publish a Stable Rate Card

Set internal rates before the usage period, commonly by service, Region, instance family, operating system, and purchase-option eligibility. Multiply measured usage by those rates:

```text
team_variable_cost
  = eligible_usage_quantity * published_internal_rate
```

The rate might be based on a trailing effective rate, forecast commitment mix, or approved budget rate. That derivation is a FinOps policy, not an AWS rate guarantee.

Calculate a monthly variance pool separately:

```text
discount_variance
  = reconciled_AWS_economic_cost
  - sum(team_variable_cost)
```

A negative variance means the internal charges exceeded the selected AWS economic cost; a positive variance means they fell short. Route the variance to a named portfolio, distribute it under a versioned rule, or carry it as a transparent management adjustment. Never force it to zero by editing team usage.

### Rate-card guardrails

- Use a unit that matches the billed product; do not sum incompatible `UsageAmount` units.
- State whether rates include enterprise discounts, unused commitment, support, and tax.
- Set effective dates and prohibit retroactive replacement without a restatement.
- Keep a fallback for new SKUs and send unmatched usage to a review queue.
- Reconcile currency and rounding after aggregation, not on each microscopic line.

## Model 2: Allocate Commitment Entitlements

Instead of a dollar rate, grant teams a defined share of a commitment pool. For each hour, compare eligible usage with entitlement:

```text
covered_units_for_team
  = min(eligible_units, entitlement_units)

excess_units_for_team
  = eligible_units - covered_units_for_team
```

Price the covered and excess portions under the approved schedule. This is useful when products explicitly reserve baseline capacity and own their forecast.

Entitlements must use compatible dimensions. An EC2 RI may require matching attributes and can use normalization for size flexibility; a Savings Plan is a dollar-per-hour commitment and has its own eligibility. Do not create a generic `compute_hours` pool that assumes unlike benefits are interchangeable.

AWS can apply the actual billing benefit differently from the internal entitlement. The difference belongs in the variance bridge, not in a rewrite of CUR history.

## Model 3: Freeze Actual Rates After Close

Some organizations want pass-through economics but only need to stop reports from changing after publication. In that case:

1. treat month-to-date rates as provisional;
2. ingest the finalized CUR version;
3. calculate actual effective cost by consumer;
4. approve and freeze the monthly allocation snapshot;
5. publish later AWS adjustments as explicit restatements.

This removes post-publication churn, not intra-month cross-team dependence. It is simpler than a rate card but does not provide a stable forecast signal.

## Keep Three Amounts in the Data Model

For every team and period, preserve:

| Amount | Meaning |
| --- | --- |
| `aws_assigned_effective_cost` | Effective cost on the covered and On-Demand usage according to AWS billing data |
| `internal_stable_cost` | Amount calculated under the approved rate or entitlement model |
| `variance_allocation` | Explicit bridge between internal pricing and the reconciled company total |

This prevents a dashboard from presenting an internal rate as though AWS had billed it. It also lets FinOps explain why the company saved money while one team's stable showback did not move.

## Example

Assume production uses 100 eligible units every day. Development usually uses 10, then uses 100 during a load test. The shared benefit is insufficient to cover both peaks.

Under pass-through showback, production may receive more On-Demand cost during the test. Under a stable rate of $0.06 per eligible unit, production remains at $6 for the period's 100 units. Development's quantity increases and its stable charge increases. The difference between all stable charges and actual AWS effective cost goes to the discount variance pool.

This does not claim that development caused a specific AWS dollar to move from production. It gives each team a consistent behavioral signal and leaves exact billing attribution intact in the reconciliation layer.

## Handle Unused Commitment Separately

Stable pricing does not eliminate unused commitment. Calculate unused RI cost from the `RIFee` unused fields and unused Savings Plan commitment from the `SavingsPlanRecurringFee` commitment fields. Keep that amount in a portfolio pool unless the rate-card policy explicitly recovers it.

If rates are designed to recover expected unused cost, disclose that loading. Otherwise recipients will mistake a management recovery rate for the cost of their consumed AWS benefit.

## Controls That Prevent Hidden Subsidies

- Compare stable charge, AWS effective cost, and public On-Demand equivalent independently.
- Cap neither usage nor variance merely to make a team trend smooth.
- Test that every rate matches exactly one SKU classification.
- Measure the variance pool as a percentage of total cost and investigate threshold breaches.
- Record changes to AWS discount-sharing preferences because they can change the bill.
- Keep the purchasing account, beneficiary account, and internal owner as separate fields.
- Version exceptions, including launch credits and temporary migration rates.

The objective is not zero variance every day. The objective is a predictable team signal and a fully explained company-level reconciliation.

## Official Documentation

- [AWS Billing: Reserved Instances and Savings Plans discount sharing](https://docs.aws.amazon.com/awsaccountbilling/latest/aboutv2/ri-turn-off.html)
- [AWS Savings Plans: Understanding how Savings Plans apply to usage](https://docs.aws.amazon.com/savingsplans/latest/userguide/sp-applying.html)
- [AWS Billing: Understanding consolidated bills](https://docs.aws.amazon.com/awsaccountbilling/latest/aboutv2/con-bill-blended-rates.html)
- [AWS Data Exports: Understanding Savings Plans](https://docs.aws.amazon.com/cur/latest/userguide/cur-sp.html)
- [AWS Data Exports: Understanding reservation line items](https://docs.aws.amazon.com/cur/latest/userguide/regular-reserved-instances.html)
- [AWS Data Exports: Reservation details](https://docs.aws.amazon.com/cur/latest/userguide/reservation-columns.html)
- [AWS Data Exports: Savings Plan columns](https://docs.aws.amazon.com/cur/latest/userguide/table-dictionary-cur2-savings-plan.html)

## Conclusion

AWS effective costs can move because shared benefits follow organization-wide eligible usage. Preserve that result, but do not let it accidentally define the engineering signal. A published rate card, explicit entitlement, or frozen post-close actual model can stabilize showback as long as the variance, unused commitment, and policy version remain visible and reconciled.
