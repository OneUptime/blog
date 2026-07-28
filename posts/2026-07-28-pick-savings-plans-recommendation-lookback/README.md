# How to Pick a 7-, 30-, or 60-Day Lookback for AWS Savings Plans Recommendations

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: AWS, Savings Plans, Cost Explorer, Forecasting, FinOps

Description: Choose a Savings Plans recommendation lookback that reflects the future workload instead of merely smoothing the past.

---

Choose the shortest Savings Plans lookback that contains a representative operating cycle, then compare it with the longer options. Seven days responds quickly to a changed environment, 30 days captures more routine variation, and 60 days reduces short-term noise. None can represent seasonality outside its window.

AWS supports 7-, 30-, and 60-day recommendation lookbacks. It calculates what the bill could have been with an additional commitment during that historical period and selects the amount estimated to produce the largest savings. AWS explicitly says this is not a usage forecast.

## What the Recommendation Actually Uses

The recommendation depends on more than the lookback:

- selected plan type: Compute, Database, EC2 Instance, or SageMaker AI Savings Plans;
- an available term and payment option for that plan type;
- management-account or member-account scope;
- current Savings Plans inventory and existing RI coverage;
- discount-sharing preferences;
- eligible usage in the chosen period and Savings Plans rates for the selected offering.

AWS generates management-account recommendations from participating organization usage under the sharing configuration. Member-account recommendations optimize that account in isolation.

Recommendations assume an immediate purchase. They do not account for queued or scheduled purchases. Compute and EC2 Instance recommendations are based on the same usage set and are not intended to be added together.

The current Database Savings Plans offering is one year and No Upfront, while Compute, EC2 Instance, and SageMaker AI plans offer one- and three-year terms and the three standard payment options. Compare only parameter combinations that AWS actually offers for the selected type.

Hold all these settings constant when comparing lookbacks.

## When Seven Days Is Most Useful

A 7-day window is responsive. Prefer it when a recent structural change makes older data misleading:

- a major migration completed;
- a large service was retired;
- an acquisition or account move changed the billing family;
- rightsizing materially reduced usage;
- an RI or Savings Plan recently expired;
- an EC2 fleet moved to a different family or pricing model;
- a new steady workload has reached normal operation.

The weakness is sensitivity. A release, incident, holiday, performance test, or unusual batch run can dominate a single week. Ensure the window contains a full weekday/weekend cycle and annotate exceptional events.

Do not use seven days for a new launch whose initial traffic is still ramping unless the commitment decision intentionally assumes that current level will persist.

## When Thirty Days Is Most Useful

A 30-day lookback often captures:

- several weekly cycles;
- month-end or periodic jobs;
- deployment cadence;
- normal autoscaling variation;
- short maintenance events.

It is a useful primary view for stable workloads without major monthly seasonality. Its weakness is inertia after a recent change: if a retirement occurred a week ago, most of the period still represents the old, larger footprint.

Compare the first and last weeks. A trend hidden inside the monthly aggregate signals that the full period may not represent the future.

## When Sixty Days Is Most Useful

A 60-day lookback is the most stable of the three supported options. It can dilute isolated anomalies and include more billing and operating cycles.

Use it when:

- usage has been structurally stable;
- the workload has irregular events that need averaging;
- one month alone contains an unusual close, launch, or incident;
- the organization wants a conservative long-run baseline comparison.

Its weakness is slow response. It can include decommissioned workloads, old sharing arrangements, obsolete RI coverage, and pre-migration architecture. More data is not automatically more representative data.

## Run All Three and Explain the Difference

Create a comparison table:

| Input or output | 7 days | 30 days | 60 days |
| --- | --- | --- | --- |
| Recommendation timestamp | | | |
| Plan type, term, payment | | | |
| Account and sharing scope | | | |
| Recommended commitment | | | |
| Estimated monthly savings | | | |
| Estimated coverage | | | |
| Known anomalies included | | | |
| Structural changes included | | | |

The pattern is diagnostic:

- similar outputs suggest a stable eligible baseline;
- a larger 7-day result can indicate growth or a temporary spike;
- a smaller 7-day result can indicate a recent scale-down;
- a larger 60-day result can indicate old usage that no longer exists;
- alternating results can indicate weekly, monthly, or event-driven variability.

Investigate the reason rather than averaging the three recommendations. An arithmetic mean has no documented AWS meaning.

## Match the Window to the Future Start Date

AWS recommendations are for immediate purchase. If the plan will start later:

1. identify commitments expiring before the intended start;
2. inventory queued purchases;
3. remove workloads retiring before that date;
4. add only approved, high-confidence workloads active by then;
5. adjust sharing and account changes;
6. re-run the analysis close to purchase.

Savings Plans Purchase Analyzer can exclude selected plans expiring within its supported horizon and analyze custom commitments or target coverage. It remains based on historical usage, so the future adjustment still belongs to the buyer.

## Look Beyond Sixty Days for Seasonality

The longest standard recommendation window cannot observe an annual event that occurred more than 60 days ago. For retail holidays, tax seasons, school calendars, media events, or periodic research workloads:

- query at least one complete seasonal cycle from Cost and Usage Report or Data Exports;
- separate durable baseline from event capacity;
- compare peak, shoulder, and trough periods;
- commit only to usage expected in the low period unless complementary workloads fill it.

Do not choose 60 days merely because it is the longest available. A two-month peak is still a peak.

## Refresh after Portfolio Changes

AWS advises refreshing recommendations after a recent Savings Plan purchase, return, or expiration. Also refresh after:

- RI purchase or expiration;
- sharing-group change;
- large account join or departure;
- major rightsizing effort;
- service or Region migration.

Wait until relevant billing data is present, then record the refresh time. AWS limits recommendation refresh requests per consolidated billing family, so coordinate rather than having multiple teams repeatedly refresh.

## A Practical Selection Rule

Use:

- **7 days** when older usage is invalid and the latest full week is genuinely representative;
- **30 days** for a stable environment with weekly and monthly operating cycles;
- **60 days** when the environment is unchanged and short-term noise needs dilution.

Then validate the selected result against hourly data, a longer seasonal history, and the forward roadmap. The best lookback is not the one that recommends the greatest savings; it is the one whose included usage most closely resembles the eligible usage expected after purchase.

## Official Documentation

- [Understanding Savings Plans recommendation calculations](https://docs.aws.amazon.com/savingsplans/latest/userguide/sp-rec-calculations.html)
- [Understanding Savings Plans recommendations](https://docs.aws.amazon.com/savingsplans/latest/userguide/sp-recommendations.html)
- [Customizing Savings Plans recommendations](https://docs.aws.amazon.com/savingsplans/latest/userguide/sp-rec-customizing.html)
- [AWS Savings Plans FAQ](https://aws.amazon.com/savingsplans/faqs/)
- [Running a Savings Plan purchase analysis](https://docs.aws.amazon.com/savingsplans/latest/userguide/sp-purchase-analysis.html)
- [Understanding Savings Plans purchase analysis calculations](https://docs.aws.amazon.com/savingsplans/latest/userguide/sp-purchase-analysis-calculations.html)
- [Savings Plans quotas and restrictions](https://docs.aws.amazon.com/savingsplans/latest/userguide/sp-quotas.html)
