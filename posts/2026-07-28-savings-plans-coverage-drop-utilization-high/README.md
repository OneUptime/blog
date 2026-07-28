# Why Did Savings Plans Coverage Drop While Utilization Stayed High?

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: AWS, Savings Plans, Coverage, Utilization, Cost Explorer

Description: Diagnose a Savings Plans coverage decline when the existing hourly commitment continues to be fully consumed.

---

Savings Plans coverage can drop while utilization stays high when eligible demand grows faster than the commitment available to cover it. The existing commitment is still fully consumed, so utilization remains high, but more eligible usage is billed On-Demand, so coverage falls.

That is the most common explanation, not the only one. Expirations, report scope, sharing settings, RI changes, and workload mix can all alter the two metrics differently.

## The Metrics Have Different Denominators

Utilization is commitment-centric:

```text
utilization = used commitment / total commitment
```

Coverage is usage-centric:

```text
coverage
  = On-Demand equivalent of Savings Plans-covered usage
  /
  (
    On-Demand equivalent of covered usage
    + eligible usage billed On-Demand
  )
```

If every dollar of commitment is consumed, utilization can stay at or near 100%. Add eligible On-Demand usage to the coverage denominator, and coverage falls even though nothing changed about how efficiently the existing plan was used.

Because coverage uses On-Demand-equivalent values while utilization uses commitment values, do not subtract one percentage from the other or expect them to move together.

## Cause 1: A New Persistent Workload

A launch, acquisition, new account, or traffic increase can add eligible EC2, Fargate, or Lambda usage. The active plan continues to be fully consumed, while the new layer remains On-Demand after the hourly commitment is exhausted.

Confirm with:

- the first hour coverage changed;
- service and linked-account filters;
- hourly On-Demand spend not covered;
- deployment and account-onboarding records;
- the persistence of the new usage through quiet periods.

Do not immediately purchase for the peak. Establish whether it is a durable floor expected to survive a new one- or three-year term.

## Cause 2: A Commitment or RI Expired

When a Savings Plan expires, total available commitment falls. The remaining plans may still be fully utilized, but usage formerly covered by the expired plan moves to On-Demand, lowering coverage.

An RI expiration can also alter the usage that reaches Savings Plans. AWS applies EC2 RIs before Savings Plans. When an RI expires, more EC2 usage becomes available for plans; those plans may be consumed earlier, leaving other eligible usage On-Demand.

Review exact activation and expiration timestamps. Monthly reports can blur a mid-period change.

## Cause 3: Sharing Scope Changed

In an AWS Organizations consolidated billing family, a Savings Plan applies to the owner account first, then can benefit other accounts according to discount-sharing settings.

Current billing controls support:

- open sharing across sharing-activated accounts;
- prioritized group sharing using Cost Categories;
- restricted group sharing using Cost Categories.

If an account is deactivated for sharing, moved between groups, removed from the organization, or excluded by a restricted group, its eligible usage may lose access to a shared plan. Organization-wide utilization can remain high if other accounts consume the commitment, while coverage for the affected account drops.

Record the sharing-preference history and Cost Category membership. AWS warns that sharing changes affect bills.

## Cause 4: Report Filters Changed

A coverage view can drop without any bill change if the selected:

- account;
- Region;
- service;
- instance family;
- Cost Category;
- lookback period;
- granularity

changed between reports.

Utilization reports and coverage reports do not expose identical filter dimensions because they answer different questions. Save downloaded CSV files and filter settings alongside dashboard screenshots.

Also compare like-for-like cost views. AWS says reports for accounts in Billing Conductor billing groups can show pro forma data.

## Cause 5: The Usage Mix Changed

AWS applies Savings Plans to eligible usage with the highest savings percentage first. If percentages tie, it applies them to usage with the lowest Savings Plans rate first. EC2 Instance Savings Plans are considered before Compute Savings Plans.

A shift in:

- EC2 family;
- Region;
- operating system or tenancy;
- EC2 versus Fargate versus Lambda;
- owner-account versus shared-account usage

can change which line items receive the benefit. The commitment can remain fully used, yet the On-Demand-equivalent amount covered can change, moving the coverage percentage.

A narrow EC2 Instance Savings Plan creates another possibility: usage grows outside its family or Region. The narrow plan can remain fully utilized by its matching baseline while the out-of-scope EC2 usage increases On-Demand spend.

## Cause 6: Rightsizing or Spot Changed the Eligible Pool

Rightsizing can reduce the eligible usage covered by one plan while growth elsewhere consumes it. Moving workloads to Spot removes that usage from Savings Plans eligibility because Savings Plans do not apply to Spot. These changes can alter report composition in ways a service-total chart does not reveal.

First optimize the workload, then the commitment. Do not reverse a valid rightsizing or Spot decision merely to recover a coverage percentage.

## A Reproducible Investigation

Use this order:

1. Freeze the date range, granularity, account level, and filters.
2. Mark the first hour of the coverage change.
3. Inventory active RIs and Savings Plans on both sides of that hour.
4. Check queued purchases, returns, and expirations.
5. Compare eligible On-Demand spend by account, service, Region, and family.
6. Review discount-sharing and Cost Category history.
7. Check deployments, autoscaling, account moves, and pricing-model changes.
8. Inspect Cost and Usage Report or Data Exports line items for exact allocation.

Use hourly data. A daily or monthly average can hide a plan expiring halfway through a day or a workload that only creates daytime spillover.

## Should You Buy More Commitment?

Only after the diagnosis. High utilization shows that current commitment has demand; falling coverage identifies an opportunity for more benefit but not necessarily a safe commitment.

Add a plan only if uncovered usage:

- is eligible under the chosen plan type;
- appears across most relevant hours;
- is not anomalous or wasteful;
- survives expected rightsizing and Spot adoption;
- is funded for the term;
- remains in scope after planned architecture or organization changes.

Run refreshed Cost Explorer recommendations after portfolio changes. AWS says recommendations do not forecast future usage and do not account for queued purchases, so overlay those facts manually.

A coverage drop with high utilization is often a healthy signal that the existing plan is conservative. Diagnose the new denominator before deciding whether to cover it.

## Official Documentation

- [Understanding utilization metrics and calculations](https://docs.aws.amazon.com/savingsplans/latest/userguide/ce-sp-pr-metrics.html)
- [Understanding coverage metrics and calculations](https://docs.aws.amazon.com/savingsplans/latest/userguide/ce-sp-cr-metrics.html)
- [Understanding how Savings Plans apply to your usage](https://docs.aws.amazon.com/savingsplans/latest/userguide/sp-applying.html)
- [Customizing AWS Billing discount-sharing preferences](https://docs.aws.amazon.com/awsaccountbilling/latest/aboutv2/billing-pref.html)
- [Understanding Savings Plans recommendation calculations](https://docs.aws.amazon.com/savingsplans/latest/userguide/sp-rec-calculations.html)
