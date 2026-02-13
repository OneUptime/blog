# How to Use EC2 Savings Plans vs Reserved Instances

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, EC2, Savings Plans, Reserved Instances, Cost Optimization

Description: A detailed comparison of EC2 Savings Plans and Reserved Instances to help you choose the right commitment model for your AWS workloads.

---

AWS gives you two main ways to commit to long-term compute usage in exchange for discounts: Reserved Instances and Savings Plans. They both save you money compared to On-Demand, but they work differently and are suited to different situations.

If you've been confused about which one to pick, you're not alone. Let's clear it up.

## The Fundamental Difference

**Reserved Instances** are a commitment to a specific instance type in a specific region. You're saying "I'll run X number of m5.large instances in us-east-1 for the next 1-3 years."

**Savings Plans** are a commitment to a dollar amount of compute usage per hour, regardless of instance type. You're saying "I'll spend at least $10/hour on compute for the next 1-3 years."

This is a crucial distinction. Savings Plans decouple your commitment from specific instance types, giving you much more flexibility.

## Types of Savings Plans

There are three types:

**Compute Savings Plans** - The most flexible. Your commitment applies to any EC2 instance in any region, any instance family, any OS, any tenancy. Also applies to Fargate and Lambda. Discounts up to 66%.

**EC2 Instance Savings Plans** - Committed to a specific instance family in a specific region (e.g., m5 in us-east-1), but flexible on size, OS, and tenancy. Discounts up to 72%.

**SageMaker Savings Plans** - For ML workloads on SageMaker. Not relevant to this discussion.

Here's a comparison table:

| Feature | Compute SP | EC2 Instance SP | Standard RI | Convertible RI |
|---------|-----------|----------------|-------------|----------------|
| Max Discount | 66% | 72% | 72% | 66% |
| Instance Family Flex | Yes | No | No | Exchange only |
| Region Flex | Yes | No | No | Exchange only |
| OS Flex | Yes | Yes | No | Exchange only |
| Size Flex | Yes | Yes | Yes (regional) | Exchange only |
| Applies to Fargate | Yes | No | No | No |
| Applies to Lambda | Yes | No | No | No |
| Marketplace Resale | No | No | Yes (Standard) | No |

## When to Choose Savings Plans

Savings Plans are the better choice in most scenarios. Here's when:

**You're not sure about instance types** - If you might migrate from m5 to m6i or from Intel to Graviton (ARM) during the commitment period, Compute Savings Plans cover you automatically.

**You use multiple services** - If you run EC2, Fargate, and Lambda, a Compute Savings Plan applies to all of them.

**You want simplicity** - No need to track individual RIs, modify them, or manage marketplace listings. Just commit to a dollar amount.

**You're growing** - As your usage grows, Savings Plans apply to additional usage automatically. With RIs, you have to purchase more.

## When to Choose Reserved Instances

RIs still make sense in specific situations:

**Maximum savings on stable workloads** - Standard RIs with All Upfront payment give the absolute best discount.

**Capacity reservations** - Zonal RIs guarantee capacity in a specific AZ. Savings Plans don't include capacity reservations (though you can buy them separately).

**Marketplace resale** - If plans change, you can sell Standard RIs on the marketplace. You can't sell Savings Plans.

## Purchasing a Savings Plan

Here's how to buy a Savings Plan via the CLI.

This command gets purchase recommendations based on your actual usage:

```bash
# Get Savings Plan recommendations
aws savingsplans describe-savings-plans-offering-rates \
  --savings-plan-offering-ids offering-id-here

# Or use Cost Explorer for recommendations
aws ce get-savings-plans-purchase-recommendation \
  --savings-plans-type COMPUTE_SP \
  --term-in-years ONE_YEAR \
  --payment-option NO_UPFRONT \
  --lookback-period-in-days SIXTY_DAYS
```

The recommendation tells you how much to commit per hour based on your historical usage. Follow it closely.

To actually purchase:

```bash
# Purchase a Savings Plan
aws savingsplans create-savings-plan \
  --savings-plan-offering-id offering-id-here \
  --commitment "10.00" \
  --purchase-time "2026-02-15T00:00:00Z"
```

The commitment is in dollars per hour. A $10/hour commitment means you're paying $10 x 24 x 365 = $87,600/year regardless of actual usage. Make sure your baseline usage justifies this.

## Calculating Your Commitment

The biggest mistake people make is over-committing. Here's how to figure out the right amount.

Pull your hourly On-Demand spend for the last 60 days:

```bash
# Get daily compute costs
aws ce get-cost-and-usage \
  --time-period Start=2025-12-12,End=2026-02-12 \
  --granularity DAILY \
  --metrics "UnblendedCost" \
  --filter '{
    "Dimensions": {
      "Key": "SERVICE",
      "Values": ["Amazon Elastic Compute Cloud - Compute"]
    }
  }'
```

Find your minimum daily spend and divide by 24 to get your baseline hourly rate. Commit to 80% of that minimum, not the average. The remaining 20% stays On-Demand for flexibility.

For example, if your minimum daily EC2 spend is $240, your minimum hourly rate is $10. Commit to $8/hour and keep $2/hour as On-Demand buffer.

## How Discounts Are Applied

Savings Plans apply discounts automatically. AWS processes your hourly usage and applies the Savings Plan rate to the most expensive instances first (to maximize your savings).

Here's an example of how a $5/hour Compute Savings Plan gets applied:

```
Hourly usage:
  3x m5.large  @ $0.096/hr = $0.288 (SP rate: $0.058/hr = $0.174)
  2x c5.xlarge @ $0.170/hr = $0.340 (SP rate: $0.103/hr = $0.206)
  1x r5.large  @ $0.126/hr = $0.126 (SP rate: $0.076/hr = $0.076)

Total On-Demand: $0.754/hr
Total with SP:   $0.456/hr
Savings:         $0.298/hr (39.5%)
```

The SP discount is applied starting with the highest hourly rate instances, squeezing out the maximum savings from your commitment.

## Comparing Total Cost Over 1 Year

Let's compare the options for running 10 m5.large instances in us-east-1 for a full year:

```
On-Demand:
  10 x $0.096/hr x 8,760 hours = $8,409.60/year

EC2 Instance Savings Plan (No Upfront):
  10 x $0.066/hr x 8,760 hours = $5,781.60/year
  Savings: $2,628.00 (31%)

Compute Savings Plan (No Upfront):
  10 x $0.068/hr x 8,760 hours = $5,956.80/year
  Savings: $2,452.80 (29%)

Standard RI (All Upfront):
  10 x $505/year = $5,050.00/year
  Savings: $3,359.60 (40%)

Standard RI (No Upfront):
  10 x $0.068/hr x 8,760 hours = $5,956.80/year
  Savings: $2,452.80 (29%)
```

The All Upfront Standard RI gives the deepest discount, but the Savings Plans give comparable savings with much more flexibility.

## Monitoring Savings Plan Utilization

Track your utilization to make sure you're getting full value from your commitment:

```bash
# Check Savings Plan utilization
aws ce get-savings-plans-utilization \
  --time-period Start=2026-01-01,End=2026-02-01

# Get detailed utilization by Savings Plan
aws ce get-savings-plans-utilization-details \
  --time-period Start=2026-01-01,End=2026-02-01
```

Anything below 100% utilization means you're paying for commitment you're not using. If utilization is consistently low, you over-committed.

You can also check coverage - what percentage of your On-Demand usage is covered by Savings Plans:

```bash
# Check Savings Plan coverage
aws ce get-savings-plans-coverage \
  --time-period Start=2026-01-01,End=2026-02-01 \
  --granularity MONTHLY
```

## A Practical Strategy

Here's what I recommend for most organizations:

1. **Analyze 60 days of usage** with Cost Explorer
2. **Start with a Compute Savings Plan** covering 60-70% of your minimum hourly spend (No Upfront, 1-year term)
3. **Add an EC2 Instance Savings Plan** for instance families you're confident won't change, covering another 10-15%
4. **Leave 20-30% as On-Demand** for flexibility and growth
5. **Use Spot for variable workloads** on top of everything
6. **Review quarterly** and adjust your next purchase

This layered approach gives you the best balance of savings, flexibility, and risk management.

## Summary

For most teams, Savings Plans have replaced Reserved Instances as the go-to commitment model. They're simpler to manage, more flexible, and offer comparable discounts. Use EC2 Instance Savings Plans when you're confident in your instance family choice, and Compute Savings Plans when you need maximum flexibility across instance types, regions, or even services like Fargate and Lambda. Reserve the use of traditional RIs for cases where you need capacity reservations or want the option to resell on the marketplace. And remember - for workloads with variable demand, combine your commitments with [Spot Instances](https://oneuptime.com/blog/post/2026-02-12-ec2-spot-instances-save-compute/view) for maximum savings.
