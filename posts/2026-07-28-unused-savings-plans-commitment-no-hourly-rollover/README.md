# Why Unused Savings Plans Commitment Does Not Roll Over to the Next Hour

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: AWS, Savings Plans, Hourly Commitment, Utilization, FinOps

Description: Explain the hourly boundary of AWS Savings Plans and how it changes sizing, scheduling, and interpretation of monthly utilization.

---

Unused Savings Plans commitment does not roll over because the product is a commitment to a consistent dollar amount in every hour, not a prepaid balance of compute credits. AWS evaluates eligible usage against the commitment hour by hour. Once an hour ends, any unconsumed commitment for that hour is gone.

This behavior is central to Savings Plans economics. A monthly bill can contain both unused commitment and On-Demand overage even when total eligible usage for the month appears large enough to cover the total commitment.

## The Commitment Is a Rate per Hour

Savings Plans commit to an amount of eligible usage measured in dollars per hour. Compute, EC2 Instance, and SageMaker AI Savings Plans offer one- or three-year terms; Database Savings Plans currently offer a one-year, No Upfront term. The plan automatically supplies discounted rates to eligible usage up to the commitment during each hour.

For a simplified planning model, let:

- `C` be the hourly commitment;
- `S(h)` be eligible usage in hour `h`, valued at the applicable Savings Plans rates.

Then:

```text
used(h)   = min(C, S(h))
unused(h) = max(0, C - S(h))
```

There is no term such as `unused(h - 1)` in the next hour's calculation. AWS explicitly notes in its application example that each hour's commitment can only be used in that hour and cannot be carried over.

Where offered, All Upfront, Partial Upfront, and No Upfront affect how the commitment is paid and the offered price, but none changes the hourly boundary or creates a reusable credit wallet.

## Why Monthly Totals Can Be Misleading

Consider an intentionally simple two-hour pattern:

| Hour | Commitment | Eligible usage at plan rates | Result |
| --- | ---: | ---: | --- |
| Quiet hour | `$10` | `$5` | `$5` unused |
| Busy hour | `$10` | `$15` | commitment exhausted; excess usage remains |

Across both hours, commitment and eligible usage each total `$20`. A monthly-average method would suggest a perfect match. Hourly billing produces a different result: `$5` is unused in the quiet hour, while eligible usage beyond the commitment in the busy hour is charged at the applicable On-Demand rates.

The excess is not literally a `$5` On-Demand charge because Savings Plans and On-Demand rates differ. The table demonstrates timing, not a complete invoice calculation.

This is why dividing monthly eligible spend by the number of hours in a month is not a reliable sizing method. The sequence of usage matters.

## The Rule Works the Same Across Eligible Services

A Compute Savings Plan can combine eligible EC2, Fargate, and Lambda usage within an hour. It can also apply across Regions and supported EC2 configurations. This broad pool improves the chance of using the commitment, but it does not permit transfer between hours.

An EC2 Instance Savings Plan has a smaller pool: qualifying usage in the committed instance family and Region. Size, operating system, and tenancy can vary within that boundary. If the family-specific workload scales down overnight, unrelated Lambda or Fargate usage cannot consume that narrow plan.

In an AWS Organizations consolidated billing family, eligible usage from participating accounts can consume shared discounts after the owner account under the configured sharing rules. Cross-account sharing broadens the hourly pool; it still does not create rollover.

## Autoscaling Does Not Average the Commitment

Autoscaling can make resource use efficient while making a commitment harder to size. A service that runs at a small night-time footprint and a large daytime footprint creates two financial layers:

- a steady base that exists most hours;
- a variable layer that may remain On-Demand.

Buying a commitment for the daily average overcommits the quiet period. Buying for the stable base leaves more daytime usage On-Demand but protects utilization.

The correct balance depends on actual rates and risk tolerance. It is not an AWS requirement to reach 100% coverage. In many environments, some On-Demand spillover is the price of avoiding unused commitment.

## Scheduling Can Help, but Only for Real Work

Some flexible workloads can be placed in naturally quiet hours:

- batch transforms;
- media processing;
- CI jobs;
- report generation;
- data compaction;
- non-urgent test suites.

If these jobs already need to run, shifting them can consume commitment that would otherwise be unused. This can improve realized savings without increasing total useful compute.

Do not launch unnecessary resources solely to improve utilization. Paying for additional usage to make a dashboard percentage look better increases cost. Scheduling must also respect business deadlines, data availability, failure-retry windows, and operational support hours.

For Compute Savings Plans, jobs may consume the same broad commitment even if they use a different eligible service or Region. For EC2 Instance Savings Plans, the scheduled usage must still match the family and Region.

## How AWS Chooses Usage Within the Hour

Before a Savings Plan applies, matching EC2 Reserved Instance benefits are used. EC2 Instance Savings Plans are applied before Compute Savings Plans. AWS then prioritizes eligible usage by the percentage saved relative to current On-Demand rates; if percentages tie, it uses the lower Savings Plans rate first.

That ordering maximizes the documented billing benefit within the available scope. It does not change the total commitment available in that hour or preserve unused value for later.

In an organization, the owner account's eligible usage is considered before shared use by other accounts, subject to discount-sharing configuration. Current billing preferences also support prioritized and restricted sharing groups. These controls can influence which account receives the benefit, but the hourly limit remains.

## Detect the Pattern in Reports

Use both utilization and coverage:

- **Utilization** measures used commitment divided by total commitment.
- **Coverage** measures the On-Demand-equivalent share of eligible usage receiving Savings Plans benefit.

An oversized average-based purchase often shows low utilization in quiet hours and lower coverage in busy hours. A monthly aggregate can soften both patterns, so inspect hourly and daily granularity.

Useful fields and metrics include:

- total, used, and unused commitment;
- utilization percentage;
- On-Demand spend not covered;
- coverage percentage;
- service, account, Region, and family filters;
- upcoming plan and RI expiration times.

AWS Budgets can monitor Savings Plans utilization and coverage. AWS notes that these metrics can take up to 48 hours to generate, so use them for financial governance rather than real-time workload scheduling.

## Design Around the Hourly Boundary

Before purchasing:

1. Build an hourly series of remaining eligible usage.
2. Remove RI-covered and existing-plan-covered usage.
3. Use the candidate plan's rates, not only On-Demand spend.
4. Separate the persistent base from recurring and irregular peaks.
5. Test weekends, holidays, maintenance, and seasonal lows.
6. Apply known workload retirements and migrations.
7. Model multiple smaller commitment levels in Purchase Analyzer.

AWS recommendations offer 7-, 30-, and 60-day historical lookbacks, but do not forecast the future. Use a period representative of the intended term and apply forward-looking adjustments explicitly.

A useful commitment does not need rollover. It needs a sufficiently stable and eligible hourly floor. Treat every hour as its own small use-it-or-lose-it decision, and the utilization results will make much more sense.

## Official Documentation

- [What are Savings Plans?](https://docs.aws.amazon.com/savingsplans/latest/userguide/what-is-savings-plans.html)
- [AWS Savings Plans FAQ](https://aws.amazon.com/savingsplans/faqs/)
- [Understanding how Savings Plans apply to your usage](https://docs.aws.amazon.com/savingsplans/latest/userguide/sp-applying.html)
- [Using the Savings Plans utilization report](https://docs.aws.amazon.com/savingsplans/latest/userguide/ce-sp-usingPR.html)
- [Understanding coverage metrics and calculations](https://docs.aws.amazon.com/savingsplans/latest/userguide/ce-sp-cr-metrics.html)
- [Customizing AWS Billing discount-sharing preferences](https://docs.aws.amazon.com/awsaccountbilling/latest/aboutv2/billing-pref.html)
