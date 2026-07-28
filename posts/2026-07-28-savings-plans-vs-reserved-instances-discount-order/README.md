# Savings Plans vs Reserved Instances: Which Discount Applies First?

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: AWS, Savings Plans, Reserved Instances, Amazon EC2, Billing

Description: Understand the AWS billing order for Reserved Instances and Savings Plans so overlapping commitments are sized and interpreted correctly.

---

For eligible Amazon EC2 usage, AWS applies Reserved Instance benefits before Savings Plans. Savings Plans then apply to eligible usage that remains. The two discounts do not stack on the same unit of usage.

That short rule resolves the headline question, but a complete bill also depends on Savings Plan type, discount percentage, account ownership, sharing settings, and whether the usage is eligible at all.

## The Documented Application Sequence

For compute usage, use this mental model:

1. Apply matching Amazon EC2 Reserved Instance benefits.
2. Group the active Savings Plans.
3. Apply EC2 Instance Savings Plans before Compute Savings Plans.
4. Within eligible usage, prioritize the usage that produces the highest savings percentage.
5. If savings percentages tie, apply the plan to the usage with the lowest Savings Plans rate first.
6. Charge eligible usage beyond the remaining hourly commitment at On-Demand rates.

AWS applies EC2 Instance Savings Plans first because their scope is narrower: one instance family in one Region. Compute Savings Plans can apply across families, Regions, operating systems, tenancy, Fargate, and Lambda, so retaining that flexible commitment for later eligible usage increases the chance that it can still be consumed.

This is a billing-benefit order. It does not control instance scheduling, reserve capacity, or change which workload runs.

## Why RI and Savings Plan Discounts Do Not Stack

Assume a matching RI covers one hour of an EC2 instance. Savings Plans see the eligible usage left after the RI benefit has been applied; they do not add a second percentage discount to that already covered hour. AWS explicitly says Savings Plans do not apply to usage covered by RIs.

This matters when estimating a new commitment. If a report starts from total EC2 On-Demand-equivalent usage without subtracting active RI coverage, it can overstate the hourly usage available to consume a Savings Plan.

A safer sizing expression is:

```text
candidate eligible usage
  = total eligible On-Demand-equivalent usage
  - usage covered by matching RIs
  - usage covered by existing Savings Plans
```

The actual recommendation engine uses AWS rates and hourly billing data, so this expression is a review aid rather than a substitute for Cost Explorer or Purchase Analyzer.

## A Simple Overlap Example

Consider one hour with:

- two matching EC2 instances;
- one RI that applies to one instance;
- an active Compute Savings Plan;
- no other eligible compute usage.

The RI benefit applies to the first matching unit. The Savings Plan can apply to the remaining unit up to its hourly commitment. If the plan commitment is larger than the Savings Plans-rate cost of that remaining usage, part of the commitment is unused for that hour. It cannot be carried into the next hour.

Now add a matching EC2 Instance Savings Plan. After the RI, the EC2 Instance Savings Plan is considered before the Compute Savings Plan. If it consumes all remaining EC2 usage, the broad Compute plan needs other eligible EC2, Fargate, or Lambda usage in the same hour to remain utilized.

That is why independently purchasing every recommendation on screen is dangerous. AWS notes that Compute and EC2 Instance Savings Plan recommendations use the same underlying usage set and are not intended to be taken together simultaneously.

## “Highest Discount First” Is Not “Highest Cost First”

After the plan-type ordering, AWS evaluates the potential savings percentage for combinations of eligible usage. The comparison is between the applicable Savings Plans rate and the current On-Demand rate. The commitment is applied to the usage with the highest percentage saving first.

This can create unintuitive allocation:

- a lower-cost usage type can receive the plan before a higher-cost usage type if its percentage discount is larger;
- when percentages are equal, AWS uses the lower Savings Plans rate as the tie-breaker;
- Lambda request charges can remain at their normal rate even while eligible Lambda duration receives a Compute Savings Plans rate;
- the resources that an internal team expected to “own” a shared discount might not be the resources to which AWS allocates it.

Use Cost and Usage Report fields or AWS Data Exports when account-level attribution matters. Do not infer allocation solely from resource start time or organizational priority.

## How Consolidated Billing Changes the Account Order

In an AWS Organizations consolidated billing family, AWS applies a Savings Plan first to eligible usage in the account that owns it. If discount sharing is enabled, remaining benefit can then apply to eligible usage in other participating accounts.

Current Billing preferences support open sharing as well as prioritized and restricted group sharing based on Cost Categories. Those controls can change where benefits are available, but they do not change the basic rule that RIs apply before Savings Plans.

The financial obligation also remains with the purchasing account. Another account may receive a shared discount while the owner account carries the recurring fee or amortized upfront commitment. That distinction is important for chargeback.

## Capacity Is a Separate Question

Savings Plans provide a billing discount, not capacity assurance. Standard zonal RIs can include a capacity benefit, while Regional RIs and Savings Plans are primarily billing constructs. AWS also allows Savings Plans discounts to apply to matching On-Demand Capacity Reservation charges, but the Capacity Reservation must be created separately.

Avoid treating “RI applies first” as evidence that an RI is always the better purchase. The comparison should include:

- required capacity assurance;
- instance configuration flexibility;
- ability to modify or exchange the commitment;
- expected hourly utilization;
- actual offering rates;
- existing commitments that compete for the same usage.

## Diagnose an Unexpected Bill

When Savings Plan coverage or utilization differs from an estimate, check in this order:

1. Inventory all active RIs and Savings Plans, including expiration times.
2. Confirm the RI scope, platform, tenancy, Region, and matching rules.
3. Verify which usage is Savings Plans eligible.
4. Check whether an EC2 Instance Savings Plan consumed usage before a Compute plan.
5. Inspect the purchasing account and current discount-sharing preferences.
6. Compare hourly data, not only monthly averages.
7. Review On-Demand charges that remained after all commitments.

Cost Explorer performance reports show coverage and utilization, while detailed exports show the allocation line items needed for account-level investigation. A high monthly utilization percentage can still hide individual hours of unused commitment and other hours with On-Demand spillover.

## Purchase in the Correct Order

Operationally, evaluate existing commitments before adding another one:

- let current RIs cover the usage they match;
- determine the durable usage left after those RIs;
- decide how much of that remainder is safely family-and-Region specific;
- model any broader remainder for a Compute Savings Plan;
- stress the result against expirations and workload changes.

This prevents double-counting. It also produces a plan that matches the way AWS actually applies benefits: RIs first, narrow Savings Plans next, flexible Savings Plans after that, and On-Demand for eligible usage beyond the hourly commitments.

## Official Documentation

- [Understanding how Savings Plans apply to your usage](https://docs.aws.amazon.com/savingsplans/latest/userguide/sp-applying.html)
- [Compute Savings Plans and Reserved Instances](https://docs.aws.amazon.com/savingsplans/latest/userguide/sp-ris.html)
- [Understanding Savings Plans recommendation calculations](https://docs.aws.amazon.com/savingsplans/latest/userguide/sp-rec-calculations.html)
- [Understanding consolidated bills](https://docs.aws.amazon.com/awsaccountbilling/latest/aboutv2/con-bill-blended-rates.html)
- [Capacity Reservation pricing and billing](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/capacity-reservations-pricing-billing.html)
