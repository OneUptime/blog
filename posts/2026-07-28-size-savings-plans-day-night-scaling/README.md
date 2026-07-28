# How to Size Savings Plans for Workloads That Scale Up by Day and Down at Night

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: AWS, Savings Plans, Auto Scaling, Capacity Planning, FinOps

Description: Size Savings Plans around a workload's durable hourly floor while keeping variable daytime demand flexible.

---

For a workload that scales up during the day and down at night, start by committing only the durable hourly floor. Do not size a Savings Plan from the daily average unless other eligible usage reliably fills the night-time gap.

Savings Plans commitments are evaluated every hour, and unused commitment does not roll forward. A plan sized to daytime demand can therefore waste commitment every night, while a plan sized to the baseline preserves flexibility and lets daytime peaks use On-Demand pricing.

## Separate the Baseline from the Peak

Represent the workload as layers:

```text
hourly eligible usage
  = always-on baseline
  + recurring daytime layer
  + irregular peak layer
```

The baseline is the strongest initial Savings Plans candidate. The recurring daytime layer may justify a smaller second commitment if it is filled by other workloads during off-hours. The irregular layer usually benefits from On-Demand flexibility or Spot when interruption tolerance permits.

This is a risk framework, not an AWS allocation rule. AWS automatically applies active plan rates according to eligibility and discount-priority rules.

## Work in Dollars at Savings Plans Rates

Do not size the baseline as an instance count. Savings Plans commit to dollars per hour, and the same fleet can have different relevant rates depending on:

- Compute versus EC2 Instance Savings Plans;
- one-year versus three-year term;
- All Upfront, Partial Upfront, or No Upfront;
- instance family and Region for an EC2 Instance plan;
- operating system, tenancy, and usage type;
- changes among EC2, Fargate, and Lambda for a Compute plan.

Build an hourly dataset and value qualifying usage with the actual rates for each candidate offering. Remove usage already covered by RIs, because AWS applies those before Savings Plans. Also account for active plans and their expiration dates.

## Build a Day-and-Night Profile

Group several representative weeks into local business periods while preserving the underlying billing hour:

| Segment | Questions |
| --- | --- |
| Weekday night | What is the true minimum after backups and batch work? |
| Weekday business hours | How stable is the daytime scale-out layer? |
| Weekend | Does the workload resemble a night or a normal day? |
| Release window | Are deployments creating temporary overlap? |
| Holiday or shutdown | What is the credible downside floor? |

Map local schedules carefully to billing timestamps, including daylight-saving changes where applicable. Analyze individual hours rather than combining all “day” or “night” spend into a single average.

For each hour, derive remaining eligible spend at the candidate plan rate. Plot the distribution by hour of day and day of week. A heat map often reveals whether the apparent baseline is genuinely continuous.

## Test Several Commitment Levels

Evaluate at least:

- the credible minimum;
- a low-percentile hourly value;
- the night-time median;
- the full-day median;
- the AWS recommendation;
- a custom value matching an approved coverage target.

Choosing a percentile is a business decision, not an AWS best-practice threshold. For every candidate, calculate historical:

```text
unused commitment(h) = max(0, commitment - eligible_plan_rate_usage(h))
```

Then estimate eligible usage that would remain On-Demand. Compare total net savings, unused commitment, and coverage across the entire period. A higher commitment may increase modeled discount while also increasing downside risk.

Savings Plans Purchase Analyzer supports recommended, custom, and target-coverage scenarios. Its analysis is historical, so apply future workload changes separately.

## Pool Complementary Workloads Carefully

A broad Compute Savings Plan can apply to eligible EC2, Fargate, and Lambda usage across Regions. If one service peaks during the day and another consumes eligible compute at night, their combined floor may support a larger commitment.

Before relying on this complement:

- confirm both workloads are present in the same hours, not merely in the same month;
- confirm discount sharing includes the relevant accounts;
- account for the owner account being considered before shared accounts;
- verify that both usage types are eligible;
- test whether one workload may move to Spot, retire, or leave the organization;
- avoid counting the same usage in another RI or plan purchase.

An EC2 Instance Savings Plan has a narrower pool. Complementary usage must match the committed family and Region. Fargate and Lambda cannot consume it.

Current AWS Billing preferences can make discounts available through open sharing or prioritized/restricted account groups. Those settings affect the available pool and should be recorded as part of the sizing assumption.

## Decide How Much Daytime Demand to Leave On-Demand

On-Demand usage is not evidence that optimization failed. It is the flexible portion of the portfolio. Leaving a daytime layer uncovered can be correct when:

- scale-out magnitude varies materially;
- the layer exists for only a few hours;
- product demand is uncertain;
- rightsizing or architecture changes are pending;
- a workload can shift to Spot;
- another commitment expires soon and will change the baseline.

Calculate the additional commitment's break-even across all hours, not just the hours when it would be used. A commitment that saves money for eight business hours but remains unused for sixteen hours may cost more overall.

## Consider Compute and EC2 Instance Plans Separately

Use an EC2 Instance Savings Plan only for a family-and-Region baseline expected to survive the term. It may offer a higher discount, but the night-time floor can vanish if the fleet changes family or Region.

Use a Compute Savings Plan for a baseline likely to migrate across families, Regions, or eligible compute services. Its broader scope reduces architecture lock-in, which can be especially valuable for workloads actively moving between EC2 and Fargate.

AWS creates Compute and EC2 Instance recommendations from the same usage set. Do not add the two recommendation amounts together. A layered purchase must divide the usage deliberately and then model how EC2 Instance plans apply before Compute plans.

## Purchase in Layers

A conservative sequence is:

1. Cover only the proven always-on floor.
2. Observe utilization and coverage through a complete operating cycle.
3. Re-run recommendations after the purchase is visible.
4. Add a smaller layer only when new baseline demand is established.
5. Stagger expiration dates where that improves future flexibility.

AWS allows multiple active Savings Plans. Adding a plan later is supported; changing the hourly commitment of an existing active plan is not.

This staged approach is particularly useful for a growing service. It prevents forecast growth from becoming committed spend before it appears.

## Monitor after Purchase

Track hourly or daily:

- Savings Plans utilization;
- unused commitment;
- coverage and uncovered On-Demand spend;
- day-versus-night utilization;
- eligible spend by service and account;
- autoscaling minimum and desired capacity;
- rightsizing, Spot, and migration changes.

Use AWS Budgets for utilization and coverage alerts, recognizing that Savings Plans reporting is not real time. Investigate sustained variance rather than reacting to a single low hour.

The safest design covers the part of the graph that rarely disappears. If another workload reliably fills the valleys, evaluate the combined floor. Otherwise, let the Savings Plan cover the night-time baseline and let On-Demand pricing absorb the daytime elasticity.

## Official Documentation

- [Understanding how Savings Plans apply to your usage](https://docs.aws.amazon.com/savingsplans/latest/userguide/sp-applying.html)
- [Understanding Savings Plans recommendation calculations](https://docs.aws.amazon.com/savingsplans/latest/userguide/sp-rec-calculations.html)
- [Running a Savings Plan purchase analysis](https://docs.aws.amazon.com/savingsplans/latest/userguide/sp-purchase-analysis.html)
- [Understanding utilization metrics and calculations](https://docs.aws.amazon.com/savingsplans/latest/userguide/ce-sp-pr-metrics.html)
- [Understanding coverage metrics and calculations](https://docs.aws.amazon.com/savingsplans/latest/userguide/ce-sp-cr-metrics.html)
