# AWS Savings Plans Coverage vs Utilization: What Is the Difference?

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: AWS, Savings Plans, Cost Explorer, Coverage, Utilization

Description: Interpret Savings Plans coverage and utilization as separate measures of eligible demand and committed supply.

---

Savings Plans utilization measures how much of the commitment you purchased was consumed. Coverage measures how much eligible usage received Savings Plans benefit. One looks from the commitment side; the other looks from the usage side.

You need both. High utilization does not prove that most eligible usage is covered, and high coverage does not prove that the commitment was efficiently sized.

## Utilization Starts with the Commitment

AWS defines Savings Plans utilization as:

```text
utilization percentage
  = used commitment / total commitment
```

The utilization data model includes:

- **Total commitment:** the amount of Savings Plans commitment purchased for the selected scope and period.
- **Used commitment:** the amount consumed by eligible usage.
- **Unused commitment:** the amount not consumed.
- **Utilization percentage:** used divided by total.

AWS gives a simple example: if a plan commits `$10` per hour and usage billed at Savings Plans rates consumes `$9.80` in an hour, utilization is 98%.

The report also exposes Savings Plans spend, the On-Demand equivalent of the same usage, and total net savings over the selected period. It can be viewed at hourly, daily, or monthly granularity and filtered by member account, Region, plan type, and instance family.

Utilization answers: **Did we use what we bought?**

## Coverage Starts with Eligible Usage

AWS calculates coverage using On-Demand-equivalent values:

```text
coverage percentage
  =
  On-Demand equivalent of usage covered by Savings Plans
  /
  (
    On-Demand equivalent of usage covered by Savings Plans
    + Savings Plans-eligible usage billed at On-Demand rates
  )
```

The coverage report includes:

- **On-Demand spend not covered:** eligible spend not covered by Savings Plans or RIs in the selected period.
- **Average coverage:** aggregated coverage for the chosen filters and lookback.
- **Potential monthly savings versus On-Demand:** an estimate based on Savings Plans recommendations.

It supports filters including member account, Region, instance family, service, and Cost Category. A management-account user can view aggregated coverage for the consolidated billing family.

Coverage answers: **How much of our eligible usage received the benefit?**

## Four Possible Combinations

| Utilization | Coverage | Typical interpretation |
| --- | --- | --- |
| High | High | Existing commitment is well used and covers most eligible demand |
| High | Low | Commitment is well used, but substantial eligible usage remains On-Demand |
| Low | High | Most eligible usage is covered, but the commitment is larger than current demand |
| Low | Low | Scope, sizing, workload, or allocation needs investigation |

These are diagnostic patterns, not automatic purchase instructions.

### High utilization, low coverage

The commitment is nearly or fully consumed, so utilization looks healthy. Eligible demand beyond the commitment remains On-Demand, reducing coverage. This can be a conservative and intentional design for bursty workloads.

Before buying more, determine whether uncovered usage is a persistent hourly floor or a peak. A larger plan can improve coverage but create unused commitment in quiet hours.

### Low utilization, high coverage

The available eligible usage is mostly covered, but there is not enough of it to consume the entire plan. This can happen after a scale-down, retirement, Region or family move, or rightsizing effort.

Buying another plan would make the problem worse. Investigate the unused commitment and future workload first.

### High utilization, high coverage

This is usually desirable, but inspect net savings and hourly variance. Monthly averages can hide quiet hours with unused commitment and busy hours with spillover. Also verify that high utilization is not being achieved by unnecessary or oversized compute.

### Low utilization, low coverage

This combination can arise when a narrow EC2 Instance Savings Plan does not match much of the current family-and-Region usage while other eligible demand remains outside its scope. Filters, sharing configuration, RI application, and recent portfolio changes can also create it.

## Why the Denominators Matter

Utilization uses commitment dollars at Savings Plans economics. Coverage uses the On-Demand equivalent of eligible usage. The percentages therefore cannot be compared as if they were portions of the same total.

For example, a commitment can be fully consumed by usage with a large discount percentage, producing 100% utilization, while a much larger amount of lower-discount eligible usage remains On-Demand. Coverage may still be low.

Savings Plans apply after EC2 Reserved Instances. Within Savings Plans, EC2 Instance Savings Plans apply before Compute Savings Plans, and AWS applies commitments to eligible usage with the highest potential savings percentage first. The ordering seeks to maximize benefit but can make account or service allocation differ from an intuitive “largest bill first” assumption.

## Scope and Filters Can Change the Story

Always record:

- date range and granularity;
- management or member account view;
- member-account filter;
- Region, service, family, and plan-type filters;
- Cost Category filter;
- discount-sharing settings;
- plan and RI activations or expirations during the period.

A management-account aggregate can show high utilization because another member account consumes excess commitment when discount sharing is enabled. The purchasing account alone may show a different usage pattern. Likewise, changing from a 7-day to a 30-day report can blend a recent drop with an earlier stable period.

When Billing Conductor or billing transfer is involved, AWS documents that some Savings Plans reports show pro forma data. Confirm which cost view the audience expects.

## Use Both Metrics for Purchase Decisions

A sound review sequence is:

1. Check utilization and unused commitment.
2. If utilization is low, do not add commitment until the cause is understood.
3. If utilization is high, inspect coverage and uncovered On-Demand spend.
4. Analyze uncovered usage hourly to identify the durable floor.
5. Exclude anomalies, waste, and planned retirements from the commitment estimate.
6. Enter a custom commitment sized to the remaining floor in Purchase Analyzer, remembering that the analysis still uses historical usage.
7. Stress the candidate against lower demand.

Coverage is an opportunity signal, not a target that must reach 100%. The more variable the demand, the more On-Demand coverage can be intentional.

## Monitor Changes, Not One Snapshot

Track time series for:

- used and unused commitment;
- utilization percentage;
- On-Demand spend not covered;
- coverage percentage;
- total net savings;
- plan and RI inventory changes;
- service, family, Region, and account mix.

Use AWS Budgets to alert when utilization or coverage falls below a chosen threshold. AWS notes that Savings Plans utilization and coverage metrics can take up to 48 hours to generate, so allow for reporting delay.

Export CSV data for deeper analysis and retain the filters with each report. A percentage without scope is not reproducible.

The simplest mental model is supply and demand: utilization asks whether committed discount capacity found eligible demand, while coverage asks whether eligible demand found committed discount capacity.

## Official Documentation

- [Using the Savings Plans utilization report](https://docs.aws.amazon.com/savingsplans/latest/userguide/ce-sp-usingPR.html)
- [Understanding utilization metrics and calculations](https://docs.aws.amazon.com/savingsplans/latest/userguide/ce-sp-pr-metrics.html)
- [Understanding coverage metrics and calculations](https://docs.aws.amazon.com/savingsplans/latest/userguide/ce-sp-cr-metrics.html)
- [Monitoring your Savings Plans](https://docs.aws.amazon.com/savingsplans/latest/userguide/sp-monitoring.html)
- [Creating a Savings Plans budget](https://docs.aws.amazon.com/cost-management/latest/userguide/create-savingsplans-budget.html)
