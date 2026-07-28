# One-Year vs Three-Year AWS Savings Plans: How to Quantify Lock-In Risk

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: AWS, Savings Plans, Financial Modeling, Risk Management, FinOps

Description: Compare one-year and three-year Savings Plans by valuing incremental discount against demand, architecture, and opportunity-cost risk.

---

A three-year AWS Savings Plan can offer a lower rate than a comparable one-year plan, but it also extends every forecasting error. This comparison applies to Compute, EC2 Instance, and SageMaker AI Savings Plans. Database Savings Plans currently offer only a one-year, No Upfront term.

AWS defines a one-year term as 365 days and a three-year term as 1,095 days. For plan types that offer both, the terms and hourly commitment cannot be changed after purchase. The examples below focus on Compute and EC2 Instance Savings Plans, so the decision is about both price and the durability of eligible compute usage.

## Compare Actual Offerings

Do not apply a generic percentage to the whole bill. Retrieve the current offering rates for the exact:

- plan type;
- payment option;
- EC2 family and Region, where applicable;
- operating system, tenancy, and usage type;
- start date and currency.

AWS advertises maximum savings of up to 66% for Compute Savings Plans and up to 72% for EC2 Instance Savings Plans, but actual rates vary. The three-year advantage is the difference between the two relevant offerings, not the difference between two headline maximums.

Calculate total contractual cost from the cart's upfront payment, monthly payment, and total cost fields. For cash-flow analysis, place payments on their actual dates rather than treating All Upfront and No Upfront as equivalent timing.

## Model Hourly Utilization through Each Term

For each candidate commitment `C` and each future hour `h`, estimate eligible usage at that offering's Savings Plans rates:

```text
used(h)   = min(C, eligible_plan_rate_usage(h))
unused(h) = max(0, C - eligible_plan_rate_usage(h))
```

Then calculate:

- expected commitment used;
- expected commitment unused;
- remaining eligible On-Demand usage;
- total cost under the plan;
- total cost without the purchase;
- net savings.

Use the same workload scenarios for one-year and three-year plans, but extend the three-year forecast far enough to include later migrations, end-of-life dates, contract changes, and demand uncertainty.

AWS recommendations analyze the previous 7, 30, or 60 days and do not forecast the future. They are a starting point, not a three-year demand model.

## Identify the Lock-In Drivers

Lock-in risk is not only “leaving AWS.” Eligible usage can disappear while the organization remains an AWS customer:

- an EC2 fleet moves to Spot;
- a family-specific plan loses usage after a generation change;
- a Region is consolidated or closed;
- a service is retired or sold;
- rightsizing lowers the hourly floor;
- an application moves from EC2 to an ineligible service;
- a member account leaves the billing family;
- an acquisition changes account or sharing structure;
- a platform migration finishes earlier than expected.

A Compute Savings Plan reduces some architecture risk because it can follow eligible EC2, Fargate, and Lambda usage across Regions and EC2 families. It does not eliminate demand risk: the organization must still have enough eligible usage every hour.

An EC2 Instance Savings Plan may offer a better rate but adds family-and-Region risk. That risk becomes more material over three years.

## Use Scenario-Weighted Expected Value

Create a small number of explicit scenarios:

| Scenario | Example | Required input |
| --- | --- | --- |
| Base | Approved plan executes | Hourly workload forecast |
| Downside | Demand shrinks or service retires | Reduced eligibility date and amount |
| Architecture change | Family, Region, or service changes | New scope and rate eligibility |
| Growth | Funded launches occur | Added hourly floor and confidence |

Assign probabilities only when stakeholders can defend them. Then:

```text
expected net savings
  = Σ(probability of scenario × net savings in scenario)
```

Also report the worst credible loss and do not hide it inside the weighted average. A small chance of a large unused commitment may exceed the organization's risk appetite even if expected value is positive.

This is an internal financial model; AWS does not assign scenario probabilities for customers.

## Calculate the Break-Even Survival Period

One useful question is: how long must the eligible baseline survive for the three-year plan's incremental discount to compensate for its additional locked period?

Model the cumulative cost of:

- a three-year plan;
- a one-year plan followed by whatever purchase is reasonable at that time;
- remaining fully On-Demand.

Find the workload-retirement date at which the three-year option stops being cheaper. Do this using actual rates and payment timing. Because future one-year renewal rates are unknown, test several plausible renewal-rate scenarios rather than asserting one forecast.

The result is a decision threshold such as “the current eligible floor must persist beyond the modeled date.” It is more actionable than saying that three years is “cheaper.”

## Include the Cost of Capital

Payment choice and term interact. All Upfront may have the lowest nominal offering price, but cash paid today has an opportunity cost. Discount future monthly payments using the organization's approved cost of capital:

```text
present value = Σ(payment at time t / (1 + discount rate)^t)
```

Use finance's actual convention for periodicity and taxes. Do not invent a discount rate. Compare present value, nominal total cost, and downside exposure separately.

The No Upfront option improves liquidity but does not make the plan cancellable. It remains a term commitment.

## Prefer One Year When Change Is Valuable

A one-year term is generally easier to defend when:

- the workload roadmap is uncertain;
- a migration will occur within 18–24 months;
- a new instance generation is under evaluation;
- the company is restructuring accounts or Regions;
- demand is young, volatile, or seasonal;
- Spot adoption is increasing;
- a three-year forecast lacks accountable owners.

The smaller nominal discount can be viewed as the price of an earlier re-pricing and re-architecture option.

## Prefer Three Years for a Proven Floor

A three-year term can be reasonable when:

- the eligible hourly floor has survived multiple business cycles;
- the workload is funded for the full term;
- family and Region constraints are technically durable for a narrow plan;
- downside scenarios still show acceptable utilization;
- the incremental rate reduction exceeds the value of flexibility;
- finance accepts the payment timing.

Even then, do not automatically commit the entire baseline for three years. A mixed portfolio can use a three-year layer for the most durable floor and one-year or On-Demand capacity above it.

## Ladder Commitments to Preserve Options

AWS allows multiple active Savings Plans. Smaller purchases at different dates can create periodic decision points. For example, an organization can cover a conservative core with a longer term and add one-year layers only after growth appears.

Benefits include:

- fewer commitments expiring at once;
- regular chances to incorporate architecture changes;
- reduced dependence on one forecast date;
- clearer attribution of each purchase decision.

The tradeoff is management complexity and potentially different rates. Maintain an inventory with owner, scope, start, end, commitment, and renewal decision date.

The correct term is the one that produces acceptable realized savings after the workload changes, not the one with the lowest rate in the purchase cart.

## Official Documentation

- [What are Savings Plans?](https://docs.aws.amazon.com/savingsplans/latest/userguide/what-is-savings-plans.html)
- [AWS Savings Plans FAQ](https://aws.amazon.com/savingsplans/faqs/)
- [Savings Plans types](https://docs.aws.amazon.com/savingsplans/latest/userguide/plan-types.html)
- [Reviewing and finalizing Savings Plans purchases](https://docs.aws.amazon.com/savingsplans/latest/userguide/review-purchase-cart.html)
- [Understanding Savings Plans recommendation calculations](https://docs.aws.amazon.com/savingsplans/latest/userguide/sp-rec-calculations.html)
- [Running a Savings Plan purchase analysis](https://docs.aws.amazon.com/savingsplans/latest/userguide/sp-purchase-analysis.html)
