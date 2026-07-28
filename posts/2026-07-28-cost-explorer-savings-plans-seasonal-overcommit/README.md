# Why Cost Explorer Savings Plans Recommendations Can Overcommit Seasonal Workloads

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: AWS, Cost Explorer, Savings Plans, Seasonality, Forecasting

Description: Prevent a historically correct Savings Plans recommendation from becoming an oversized commitment after a seasonal peak ends.

---

Cost Explorer Savings Plans recommendations can overcommit a seasonal workload when the selected 7-, 30-, or 60-day history contains demand that will not persist. AWS evaluates what additional commitment would have produced the largest savings in that historical period; it does not forecast the next season.

The recommendation can therefore be mathematically appropriate for a peak and financially unsafe for the trough that follows.

AWS currently offers four plan types: Compute, Database, EC2 Instance, and SageMaker AI Savings Plans. The seasonal method applies to all four, but their offering terms differ: Database Savings Plans currently use a one-year, No Upfront model, while the other three offer one- and three-year terms.

## Historical Optimization Is Not Forecasting

AWS documents several important boundaries:

- recommendations use historical usage in the selected lookback;
- they do not forecast future usage;
- they are generated for an immediate purchase;
- they do not account for queued or scheduled purchases;
- management-account results depend on sharing-enabled organization usage;
- member-account results optimize the account in isolation.

The recommendation answers:

> What commitment would have saved the most for the usage and rates represented here?

The purchase decision must answer:

> What eligible hourly usage will persist for the full applicable term?

Those questions align only when the historical window represents the future.

## How a Seasonal Peak Distorts the Result

Savings Plans commitments are hourly and unused commitment cannot roll into another hour. If a lookback captures a sustained high season, the modeled commitment can appear well utilized in most historical hours.

After the season:

- the hourly eligible floor falls;
- the commitment remains fixed;
- utilization declines;
- unused commitment accumulates;
- later peaks cannot recover money unused in quiet hours.

A 60-day window does not solve annual seasonality. It merely smooths within two months. If both months are part of the same peak, the longer window can reinforce the wrong baseline.

## Seasonal Patterns That Need Special Treatment

Examples include:

- retail and travel holidays;
- tax-filing periods;
- sports or media events;
- academic terms;
- end-of-quarter analytics;
- annual data-processing campaigns;
- product launches;
- disaster-recovery tests;
- temporary customer migrations.

Some events are recurring but still poor commitment candidates because they occupy only a small part of the term. Others create a new permanent floor after the peak. Distinguish those cases with business owners rather than relying on the billing curve alone.

## Build a Full-Cycle Baseline

Use Cost and Usage Report or AWS Data Exports to obtain at least one complete business cycle, preferably more when the architecture is comparable.

For each hour:

1. identify Savings Plans-eligible usage;
2. remove usage covered by RIs and existing plans;
3. separate Spot and ineligible charges;
4. value remaining usage at candidate Savings Plans rates;
5. label season, event, deployment, and anomaly periods;
6. record architecture and sharing changes.

Then compare:

- trough-period floor;
- normal-season floor;
- peak-period floor;
- duration of each state;
- year-over-year changes;
- approved future retirements and launches.

The trough is usually the safest starting point. A higher commitment requires evidence that other eligible workloads consume it outside the peak.

## Separate Base, Seasonal, and Burst Usage

Use a three-layer model:

```text
eligible hourly demand
  = durable year-round base
  + recurring seasonal layer
  + event or anomaly layer
```

The year-round base is a Savings Plans candidate. The seasonal layer may remain On-Demand, use Spot where appropriate, or be partially covered by a broader organization portfolio. The event layer should not become a long-term commitment without an independent persistent use case.

This is an internal risk model. AWS automatically applies plan benefits according to its billing rules and does not label line items as “seasonal.”

## Test the Recommendation against the Trough

Take the exact recommended commitment and replay it across low-season hourly data:

```text
unused(h)
  = max(0, recommended commitment - eligible usage at plan rates in hour h)
```

Compare:

- total unused commitment;
- total On-Demand spillover;
- net savings against staying On-Demand;
- utilization by hour of day and day of week;
- break-even demand reduction.

Repeat with smaller custom commitments in Purchase Analyzer. The analyzer supports recommended, custom, and target-coverage inputs, but its selected lookback is still historical. Use the full-cycle replay outside the console for the seasonal stress test.

## Watch Organization Aggregation

Seasonality can be diversified across accounts. A central Compute Savings Plan might remain utilized if one business unit's trough coincides with another's peak.

Validate this at hourly granularity and under current sharing rules. Open, prioritized-group, and restricted-group sharing apply benefits across different account scopes and priority orders. A group change can remove the diversification the model depended on.

Also consider account departures, acquisitions, and billing-transfer boundaries. Savings Plans cannot be shared across separate AWS Organizations merely because one external account pays bills.

Record which accounts provide the off-season floor and obtain their owners' confirmation that usage will persist.

## Avoid False Confidence from Estimated Savings

The console's estimated monthly savings reflects the selected historical usage and current inputs. It is not a guarantee. A lower rate can be overwhelmed by unused commitment after demand falls.

Do not:

- annualize a peak-month recommendation;
- assume 60 days captures a yearly cycle;
- treat growth targets as committed demand;
- ignore a known post-event scale-down;
- add Compute and EC2 Instance recommendations together;
- forget queued purchases;
- optimize coverage before removing waste.

Use the recommendation as a transparent data point, not an approval.

## Time the Purchase

For a recurring peak, consider whether buying near the peak creates enough savings over the full term after accounting for the subsequent trough. A plan spans its fixed offering term from activation, not a custom “season.”

A smaller rolling portfolio can create more frequent expiration decisions, but each component still has a valid Savings Plans term. Staging purchases also means some demand remains On-Demand during ramp-up. Quantify that tradeoff.

If a permanent new baseline emerges during a peak, wait until sufficient normal-operation data is available unless the organization consciously accepts forecast risk.

## Establish a Seasonal Approval Control

Require the purchase record to include:

- all three Cost Explorer lookbacks;
- full-cycle hourly history;
- peak and trough utilization replay;
- queued and active commitment inventory;
- approved workload roadmap;
- organization and sharing assumptions;
- downside scenario and maximum acceptable unused commitment;
- named business and finance approvers.

After purchase, monitor utilization and coverage separately through both peak and trough. A seasonal overcommit is not a failure of the documented recommendation algorithm; it is a mismatch between its historical question and the buyer's future obligation.

## Official Documentation

- [Understanding Savings Plans recommendation calculations](https://docs.aws.amazon.com/savingsplans/latest/userguide/sp-rec-calculations.html)
- [Understanding Savings Plans recommendations](https://docs.aws.amazon.com/savingsplans/latest/userguide/sp-recommendations.html)
- [AWS Savings Plans FAQ](https://aws.amazon.com/savingsplans/faqs/)
- [Understanding Savings Plans purchase analysis calculations](https://docs.aws.amazon.com/savingsplans/latest/userguide/sp-purchase-analysis-calculations.html)
- [Running a Savings Plan purchase analysis](https://docs.aws.amazon.com/savingsplans/latest/userguide/sp-purchase-analysis.html)
- [Understanding how Savings Plans apply to your usage](https://docs.aws.amazon.com/savingsplans/latest/userguide/sp-applying.html)
