# How Do You Calculate the Right AWS Savings Plans Hourly Commitment?

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: AWS, Savings Plans, Cost Explorer, Capacity Planning, FinOps

Description: Size a Savings Plans hourly commitment from eligible hourly spend, existing discounts, future workload changes, and explicit risk tolerance.

---

The right Savings Plans commitment is the amount of eligible usage, measured at Savings Plans rates, that you expect to consume in each hour throughout the term. It is not the average EC2 bill, the number of instances, or a percentage of the monthly invoice.

Start with AWS recommendations and Purchase Analyzer, but make the final commitment from hourly data and a forward-looking workload plan. AWS explicitly states that its recommendations analyze historical usage and do not forecast future demand.

## Understand the Unit You Are Buying

Compute, EC2 Instance, and SageMaker AI Savings Plans commit the account to a dollar amount per hour for one or three years. Database Savings Plans currently use a one-year, No Upfront offering. AWS automatically applies plan rates to eligible usage until that hour's commitment is exhausted. Eligible usage beyond the commitment is charged at On-Demand rates. Unused commitment in one hour cannot move to another hour.

The dataset examples below focus on Compute and EC2 Instance Savings Plans. Apply the same hourly method to the eligible usage and current offering terms of another plan type rather than treating EC2, Fargate, and Lambda as the complete Savings Plans catalog.

If a plan has commitment `C`, and eligible usage valued at Savings Plans rates in hour `h` is `S(h)`, then a simplified planning model is:

```text
used commitment(h)   = min(C, S(h))
unused commitment(h) = max(0, C - S(h))
spillover(h)         = max(0, S(h) - C)
```

AWS billing is more detailed because plan types, RI application, service eligibility, discount priority, and Organizations sharing all affect `S(h)`. The model is still useful because it shows why a monthly average is insufficient.

## Build the Correct Hourly Dataset

Collect a representative period from Cost Explorer, the Cost and Usage Report, or AWS Data Exports. At minimum:

- use hourly granularity;
- separate eligible EC2, Fargate, and Lambda usage;
- identify usage already covered by Reserved Instances;
- include current Savings Plans and their expirations;
- preserve account, Region, instance family, service, platform, and tenancy dimensions;
- remove one-time charges, storage, data transfer, support, and other ineligible spend.

Reserved Instances apply before Savings Plans, so RI-covered usage is not available to consume a new plan in that hour. Existing Savings Plans also reduce the incremental commitment opportunity. If buying an EC2 Instance Savings Plan, isolate only the target family and Region. For a Compute Savings Plan, use the broader eligible compute set.

Convert the remaining eligible usage using the actual offering rates for the plan type, term, and payment option under consideration. Do not assume the On-Demand dollar floor equals the Savings Plans commitment floor; discounted rates mean they are different values.

## Use a Distribution, Not One Average

For each hour, calculate the remaining eligible usage at the candidate Savings Plans rates. Then inspect:

- minimum and low-percentile usage;
- median usage;
- weekday and weekend profiles;
- day and night profiles;
- seasonal or release-driven peaks;
- consecutive low-usage periods;
- usage by workload owner.

A commitment near the average can be underutilized in every quiet hour even if high-demand hours make the monthly mean look stable. Conversely, committing only to the absolute minimum may leave substantial savings unrealized because a single maintenance event defines the floor.

Choosing a percentile is an organizational risk decision, not an AWS rule. A risk-averse buyer may cover only a durable lower band. An organization with predictable growth and high confidence may accept a larger commitment. State the chosen policy explicitly and test its unused commitment and On-Demand spillover across every historical hour.

## Use AWS Recommendations Correctly

Savings Plans recommendations support 7-, 30-, and 60-day lookbacks. AWS calculates what the bill could have been with an additional commitment and recommends the value estimated to produce the largest savings for that historical period.

Important constraints from the documentation include:

- recommendations do not forecast future usage;
- they assume an immediate purchase, not a future start date;
- they do not account for queued or scheduled purchases;
- management-account recommendations consider sharing-enabled accounts;
- member-account recommendations optimize that account in isolation;
- Compute and EC2 Instance recommendations use the same usage set and should not simply be added together;
- recent purchases, returns, or expirations should trigger a recommendation refresh.

Treat the recommendation as a reproducible baseline. Record its date, lookback, plan type, term, payment option, and account scope so reviewers know exactly what it represents.

## Add a Forward-Looking Adjustment

Create a workload change register for the commitment term:

| Change | Expected date | Hourly eligible usage effect | Confidence | Owner |
| --- | --- | --- | --- | --- |
| Service retirement | Date or range | Decrease | High/medium/low | Team |
| New launch | Date or range | Increase | High/medium/low | Team |
| Region migration | Date or range | Type-dependent | High/medium/low | Team |
| EC2-to-Fargate move | Date or range | Compute plan may follow | High/medium/low | Team |
| Family migration | Date or range | EC2 Instance plan may not follow | High/medium/low | Team |

Only include growth that has an approved plan and an accountable owner. A sales target or unapproved project should not automatically become a one- or three-year cloud commitment. Apply decreases more conservatively than increases: known retirements can reduce the safe floor, while uncertain growth can be covered On-Demand until it materializes.

## Model Multiple Scenarios

Run at least three:

- **Expected:** approved roadmap and normal demand.
- **Downside:** earlier retirements, slower growth, lower traffic, or more Spot usage.
- **Architecture change:** Region, instance family, or compute-service migration.

For every candidate commitment, compare:

- total commitment cost;
- estimated utilized commitment;
- estimated unused commitment;
- eligible On-Demand spillover;
- realized net savings relative to staying On-Demand;
- break-even sensitivity to demand reduction.

Savings Plans Purchase Analyzer can compare recommended, custom, and target-coverage commitments over a selected lookback. It supports plan type, term, payment option, analysis level, and exclusions for selected plans nearing expiration. Because the analysis remains historical, overlay the future scenarios outside it.

## Avoid Common Sizing Errors

Do not:

- divide a monthly bill by roughly 730 hours and call the result a commitment;
- include Spot usage, which Savings Plans do not discount;
- include EC2 usage already covered by RIs;
- add Compute and EC2 Instance recommendations together;
- assume all Lambda charges are eligible;
- size a narrow EC2 plan from an organization-wide compute total;
- count peaks that occur in different hours as a shared baseline;
- purchase projected growth before it appears without an explicit risk decision.

Also distinguish utilization from coverage. High utilization says the existing commitment is being consumed. Low coverage says eligible On-Demand usage remains. Buying enough to maximize coverage can create underutilization during low hours.

## Make the Purchase Auditable

Write a short decision record containing:

- source data and time range;
- current RI and Savings Plans inventory;
- eligible-use filters;
- actual offering rates used;
- historical and adjusted hourly distributions;
- downside assumptions;
- selected plan type, term, payment option, and commitment;
- named approvers and review date.

After purchase, monitor utilization and coverage at hourly and daily granularity. Set AWS Budgets alerts for utilization and coverage, recognizing that AWS says these metrics can take longer to generate than general cost data. If demand grows, additional plans can be purchased; the original active commitment cannot simply be resized.

The best commitment is therefore not the number with the highest modeled discount. It is the largest hourly amount that remains defensible under credible downside and architecture-change scenarios.

## Official Documentation

- [What are Savings Plans?](https://docs.aws.amazon.com/savingsplans/latest/userguide/what-is-savings-plans.html)
- [AWS Savings Plans FAQ](https://aws.amazon.com/savingsplans/faqs/)
- [Understanding Savings Plans recommendation calculations](https://docs.aws.amazon.com/savingsplans/latest/userguide/sp-rec-calculations.html)
- [Understanding Savings Plans recommendations](https://docs.aws.amazon.com/savingsplans/latest/userguide/sp-recommendations.html)
- [Running a Savings Plan purchase analysis](https://docs.aws.amazon.com/savingsplans/latest/userguide/sp-purchase-analysis.html)
- [Understanding how Savings Plans apply to your usage](https://docs.aws.amazon.com/savingsplans/latest/userguide/sp-applying.html)
