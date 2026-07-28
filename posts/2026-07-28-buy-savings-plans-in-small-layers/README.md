# How to Buy Savings Plans in Small Layers Instead of Making One Large Commitment

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: AWS, Savings Plans, Rolling Commitments, Risk Management, FinOps

Description: Build a staggered Savings Plans portfolio that creates regular adjustment points without changing active-plan terms.

---

Instead of buying one Savings Plan for the entire target commitment, divide the target into smaller purchases made at different dates. Compute, EC2 Instance, and SageMaker AI plans have fixed one- or three-year terms; Database Savings Plans currently have a fixed one-year, No Upfront term. Staggered expirations create regular opportunities to renew, resize, or let one layer expire.

The portfolio examples below focus on Compute and EC2 Instance Savings Plans, but the principle of layering independent fixed commitments also applies to other plan types.

AWS permits multiple Savings Plans to be active simultaneously, and their commitments are additive. An AWS-authored Cloud Financial Management article calls this a rolling Savings Plans approach.

## Why Layering Reduces Commitment Risk

A monolithic purchase has one expiration date. If usage drops shortly after activation, the entire commitment remains in force until that date, except for AWS's narrow recent-purchase return mechanism.

A layered portfolio has several expiration dates. When one layer expires, the organization can:

- replace it at the same commitment;
- replace it with a smaller plan;
- change plan type, term, or payment option;
- let it expire and use On-Demand pricing;
- wait for a migration to stabilize.

This does not modify or cancel active plans. It reduces the amount reaching a decision point at any one time.

## Choose a Target before Choosing Layers

First determine the safe total commitment from:

- hourly eligible usage at candidate Savings Plans rates;
- existing RI and Savings Plans coverage;
- workload retirements and launches;
- family and Region stability;
- Spot adoption;
- account and sharing changes;
- downside scenarios.

AWS recommendations can provide a 7-, 30-, or 60-day historical starting point. They do not forecast future usage and do not account for queued purchases.

The target should cover a durable hourly floor, not every peak. Layering an oversized target merely divides the same error into pieces.

## Pick a Cadence

Common internal designs include:

- two purchases roughly six months apart;
- three purchases roughly four months apart;
- four purchases roughly quarterly;
- event-driven layers after proven workload launches.

AWS does not require these cadences. Choose one based on:

- how quickly the business needs a commitment-reduction option;
- how often FinOps can perform a proper review;
- term length;
- forecast uncertainty;
- procurement overhead;
- minimum useful purchase size for the environment.

For example, four roughly equal one-year layers create a review opportunity around each quarter once the portfolio is fully established. The precise share will change as usage changes; do not mechanically renew an old fraction.

Three-year plans need more staggered components to create equally frequent expiration opportunities, so the operational overhead is higher.

## Ramp Up Deliberately

Starting from zero creates a tradeoff. If only the first small layer is purchased, more eligible usage remains On-Demand until later layers are added. This lowers early savings but avoids making the full commitment before usage has been observed through additional cycles.

Options include:

- accept a gradual ramp as the price of risk reduction;
- cover an exceptionally durable core immediately and layer the variable remainder;
- align new layers with funded workload launches;
- use one-year layers during architectural uncertainty.

Do not oversize early layers merely to reproduce monolithic coverage. That weakens the future adjustment points the strategy is intended to create.

## Recalculate Every Layer

At each purchase date:

1. Inventory active and queued Savings Plans and RIs.
2. Refresh recommendations after recent portfolio changes.
3. Recalculate the current safe total target.
4. Subtract active commitments that will overlap the new layer.
5. Account for expirations during the new plan's term.
6. Model a custom incremental amount in Purchase Analyzer.
7. Stress the combined portfolio against lower usage.
8. Obtain approval for only the incremental purchase.

Do not calculate the next layer from the original target. The value of rolling decisions is that each uses current usage and roadmap information.

Also do not add Compute and EC2 Instance recommendation values. AWS says both are generated from the same usage set. Allocate family-and-Region-specific usage deliberately before sizing the broader Compute layer.

## Stagger Scope as Well as Time

A layered portfolio can reflect different risk:

- a long-term EC2 Instance layer for a proven family-and-Region floor;
- a Compute layer for usage likely to move across eligible services or Regions;
- a one-year layer for newer demand;
- On-Demand and Spot for uncertain peaks.

AWS applies EC2 Instance Savings Plans before Compute Savings Plans, after matching EC2 RIs. Model the combined application so the narrow layer does not unexpectedly consume usage assumed by the broad layer.

Every layer needs an owner and an explicit workload thesis. Avoid a pool of anonymous commitments that cannot be connected to the approved baseline.

## Control Queued Purchases

AWS allows future-dated Savings Plans purchases and renewal purchases. A queued purchase can be deleted before activation, but Cost Explorer recommendations do not account for queued plans.

Maintain a central register containing:

- plan or queued-purchase ID;
- purchasing account;
- plan type and scope;
- hourly commitment;
- term and payment option;
- start and expiration;
- workload rationale;
- approver;
- next review date.

Use Savings Plans queued and expiration alerts so the team reviews pending changes before they become active. Prevent multiple teams from acting on the same uncovered usage.

## Monitor the Portfolio as a Whole and by Layer

Track:

- aggregate utilization and coverage;
- per-plan utilization where available;
- unused commitment;
- On-Demand spend not covered;
- net savings;
- expirations by month or quarter;
- purchasing-account and beneficiary-account allocation;
- planned migrations and account changes.

An organization-wide aggregate can hide an underused narrow plan behind a fully used broad plan. Filter by plan type, family, Region, and account.

AWS Budgets can alert on utilization and coverage. Treat those alerts as review triggers; do not automate an irreversible purchase directly from a short-term metric.

## Understand the Costs of Layering

Layering is not universally better. It creates:

- slower initial coverage;
- more purchase and approval events;
- a larger plan inventory;
- recurring analysis work;
- potential rate differences across purchase dates;
- more complex chargeback.

The benefit is option value: some commitment regularly reaches expiration and can respond to new information.

Quantify that value by stress-testing a demand drop under monolithic and layered portfolios. Compare how much commitment remains active at each future date. The useful result is not a promised savings percentage but a timeline of financial flexibility.

## Make Expiration a Decision, Not an Auto-Renewal

When a layer nears expiration:

- rerun the hourly baseline;
- review the workload roadmap;
- inspect other layers and queued purchases;
- compare current offering rates;
- choose the new scope and term;
- queue a replacement only after approval.

AWS can queue a replacement to start one second after expiration at current rates. That convenience should not bypass the reassessment.

Small layers turn one large irreversible decision into a managed portfolio of smaller irreversible decisions with different endpoints. The risk reduction comes from those endpoints, not from any ability to change an active plan.

## Official Documentation

- [How can I use rolling Savings Plans to reduce commitment risk?](https://aws.amazon.com/blogs/aws-cloud-financial-management/how-can-i-use-rolling-savings-plans-to-reduce-commitment-risk/)
- [AWS Savings Plans FAQ](https://aws.amazon.com/savingsplans/faqs/)
- [Understanding Savings Plans recommendation calculations](https://docs.aws.amazon.com/savingsplans/latest/userguide/sp-rec-calculations.html)
- [Running a Savings Plan purchase analysis](https://docs.aws.amazon.com/savingsplans/latest/userguide/sp-purchase-analysis.html)
- [Queuing a Savings Plan purchase](https://docs.aws.amazon.com/savingsplans/latest/userguide/queued-sp-cart.html)
- [Renewing a Savings Plan](https://docs.aws.amazon.com/savingsplans/latest/userguide/queue-sp-replace.html)
