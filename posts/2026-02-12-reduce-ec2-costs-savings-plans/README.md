# How to Reduce EC2 Costs with Savings Plans

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, EC2, Savings Plans, Cost Optimization

Description: A complete guide to AWS Savings Plans for reducing EC2 costs, covering plan types, purchase strategies, and how to calculate the right commitment level.

---

If your EC2 workload is predictable - servers that run 24/7, baseline capacity that doesn't change much - you're throwing money away on On-Demand pricing. Savings Plans let you commit to a consistent amount of compute usage (measured in dollars per hour) in exchange for significant discounts. The savings are real: up to 72% compared to On-Demand, depending on the plan type and commitment term.

The trick is committing to the right amount. Commit too much and you're paying for unused capacity. Too little and you're leaving savings on the table. Let's figure out the sweet spot.

## Understanding Savings Plan Types

AWS offers three types of Savings Plans:

**Compute Savings Plans** are the most flexible. They apply to any EC2 instance regardless of region, instance family, OS, or tenancy. They also apply to Fargate and Lambda. Discounts are typically 40-60% off On-Demand.

**EC2 Instance Savings Plans** are locked to a specific instance family and region (e.g., m5 in us-east-1), but offer deeper discounts - typically 50-72% off On-Demand.

**SageMaker Savings Plans** apply to SageMaker usage. We won't cover these here.

The tradeoff is flexibility versus savings. Compute Savings Plans give you room to change instance types, regions, and even services. EC2 Instance Savings Plans require more commitment but save more money.

## Calculating Your Commitment

The most important step is figuring out how much to commit. You want to cover your steady-state baseline, not your peaks.

This script analyzes your hourly EC2 spend to determine the right commitment.

```python
import boto3
from datetime import datetime, timedelta
import statistics

ce = boto3.client("ce")

def analyze_hourly_spend(days=30):
    """Analyze hourly EC2 spend to find the baseline for Savings Plans."""
    end_date = datetime.utcnow().strftime("%Y-%m-%d")
    start_date = (datetime.utcnow() - timedelta(days=days)).strftime("%Y-%m-%d")

    response = ce.get_cost_and_usage(
        TimePeriod={"Start": start_date, "End": end_date},
        Granularity="DAILY",
        Metrics=["UnblendedCost"],
        Filter={
            "Dimensions": {
                "Key": "SERVICE",
                "Values": ["Amazon Elastic Compute Cloud - Compute"]
            }
        }
    )

    daily_costs = [
        float(day["Total"]["UnblendedCost"]["Amount"])
        for day in response["ResultsByTime"]
    ]

    if not daily_costs:
        print("No EC2 cost data found")
        return

    # Convert daily to hourly
    hourly_costs = [cost / 24 for cost in daily_costs]

    avg_hourly = statistics.mean(hourly_costs)
    min_hourly = min(hourly_costs)
    p10_hourly = sorted(hourly_costs)[int(len(hourly_costs) * 0.1)]
    median_hourly = statistics.median(hourly_costs)

    print(f"\nEC2 Hourly Spend Analysis (last {days} days)")
    print(f"{'='*50}")
    print(f"Average hourly:  ${avg_hourly:.2f}/hr")
    print(f"Minimum hourly:  ${min_hourly:.2f}/hr")
    print(f"10th percentile: ${p10_hourly:.2f}/hr")
    print(f"Median hourly:   ${median_hourly:.2f}/hr")

    print(f"\nRecommended Commitments:")
    print(f"  Conservative (cover minimum): ${min_hourly:.2f}/hr "
          f"(${min_hourly * 730:,.2f}/mo)")
    print(f"  Moderate (cover P10):          ${p10_hourly:.2f}/hr "
          f"(${p10_hourly * 730:,.2f}/mo)")
    print(f"  Aggressive (cover median):     ${median_hourly:.2f}/hr "
          f"(${median_hourly * 730:,.2f}/mo)")

    # Estimate savings at each level (assuming 30% average discount)
    discount = 0.30
    print(f"\nEstimated Monthly Savings (assuming {discount*100:.0f}% average discount):")
    for label, commitment in [("Conservative", min_hourly),
                                ("Moderate", p10_hourly),
                                ("Aggressive", median_hourly)]:
        monthly_commit = commitment * 730
        savings = monthly_commit * discount
        print(f"  {label}: ~${savings:,.2f}/mo savings")

analyze_hourly_spend()
```

A good starting point is the 10th percentile of your hourly spend. This ensures you're covering usage that you're virtually guaranteed to have, while leaving peak usage on On-Demand.

## Using AWS Recommendations

AWS provides Savings Plan purchase recommendations based on your actual usage history.

```python
import boto3

ce = boto3.client("ce")

def get_savings_plan_recommendations():
    """Get AWS Savings Plan purchase recommendations."""
    for plan_type in ["COMPUTE_SP", "EC2_INSTANCE_SP"]:
        response = ce.get_savings_plans_purchase_recommendation(
            SavingsPlansType=plan_type,
            TermInYears="ONE_YEAR",
            PaymentOption="NO_UPFRONT",
            LookbackPeriodInDays="THIRTY_DAYS"
        )

        meta = response["SavingsPlansPurchaseRecommendation"]
        summary = meta.get("SavingsPlansPurchaseRecommendationSummary", {})

        print(f"\n{plan_type} Recommendations:")
        print(f"  Estimated monthly savings: "
              f"${float(summary.get('EstimatedMonthlySavingsAmount', 0)):,.2f}")
        print(f"  Estimated savings %: "
              f"{float(summary.get('EstimatedSavingsPercentage', 0)):.1f}%")
        print(f"  Hourly commitment: "
              f"${float(summary.get('HourlyCommitmentToPurchase', 0)):,.2f}/hr")
        print(f"  Current On-Demand spend: "
              f"${float(summary.get('CurrentOnDemandSpend', 0)):,.2f}/hr")

        # Individual recommendations
        details = meta.get("SavingsPlansPurchaseRecommendationDetails", [])
        for detail in details[:5]:
            print(f"\n  Plan detail:")
            print(f"    Hourly commitment: "
                  f"${float(detail.get('HourlyCommitmentToPurchase', 0)):.4f}/hr")
            print(f"    Estimated savings: "
                  f"${float(detail.get('EstimatedMonthlySavingsAmount', 0)):,.2f}/mo")

get_savings_plan_recommendations()
```

## Purchasing a Savings Plan

Once you've decided on the commitment level, purchase through the CLI.

```bash
# Purchase a Compute Savings Plan
# 1-year term, no upfront payment, $10/hour commitment
aws savingsplans create-savings-plan \
  --savings-plan-offering-id "offering-id-from-describe" \
  --commitment "10.00" \
  --purchase-time "2026-02-12T00:00:00Z"
```

Before purchasing, list available offerings to find the right one.

```bash
# List available Savings Plan offerings
aws savingsplans describe-savings-plan-rates \
  --savings-plan-id "sp-xxxxxxxx" \
  --filters '[
    {"name": "region", "values": ["us-east-1"]},
    {"name": "instanceFamily", "values": ["m5"]}
  ]'

# Or list all available offerings
aws savingsplans describe-savings-plans-offerings \
  --product-types "EC2" \
  --plan-types "COMPUTE_SP" \
  --payment-options "NO_UPFRONT" \
  --durations 94608000
```

## Payment Options Comparison

Each payment option offers different savings levels.

| Payment Option | Cash Flow | Savings Level | Best For |
|---|---|---|---|
| No Upfront | Monthly payments | Lowest savings | Flexibility, cash conservation |
| Partial Upfront | 50% upfront + monthly | Middle savings | Balance of savings and cash flow |
| All Upfront | Full payment at purchase | Highest savings | Maximum discount, available capital |

For a $10/hr commitment on a 1-year Compute SP:

- **No Upfront**: ~40% savings
- **Partial Upfront**: ~46% savings
- **All Upfront**: ~48% savings

The difference between No Upfront and All Upfront is real but not enormous. If cash flow matters, No Upfront is perfectly fine.

## Monitoring Savings Plan Utilization

After purchasing, monitor your utilization to make sure you're actually using what you committed to.

```python
import boto3
from datetime import datetime, timedelta

ce = boto3.client("ce")

def check_savings_plan_utilization(days=30):
    """Check Savings Plan utilization and coverage."""
    end_date = datetime.utcnow().strftime("%Y-%m-%d")
    start_date = (datetime.utcnow() - timedelta(days=days)).strftime("%Y-%m-%d")

    # Utilization - are you using what you paid for?
    util_response = ce.get_savings_plans_utilization(
        TimePeriod={"Start": start_date, "End": end_date},
        Granularity="MONTHLY"
    )

    total_util = util_response["Total"]["Utilization"]
    print(f"\nSavings Plan Utilization (last {days} days)")
    print(f"  Utilization: {float(total_util['UtilizationPercentage']):.1f}%")
    print(f"  Used commitment: ${float(total_util['UsedCommitment']):,.2f}")
    print(f"  Unused commitment: ${float(total_util['UnusedCommitment']):,.2f}")
    print(f"  Total commitment: ${float(total_util['TotalCommitment']):,.2f}")

    # Coverage - how much of your spend is covered?
    cov_response = ce.get_savings_plans_coverage(
        TimePeriod={"Start": start_date, "End": end_date},
        Granularity="MONTHLY"
    )

    total_cov = cov_response["Total"]["Coverage"]
    print(f"\n  Coverage: {float(total_cov['CoveragePercentage']):.1f}%")
    print(f"  SP cost: ${float(total_cov['SpendCoveredBySavingsPlans']):,.2f}")
    print(f"  On-Demand cost: ${float(total_cov['OnDemandCost']):,.2f}")

    # Flag issues
    util_pct = float(total_util["UtilizationPercentage"])
    if util_pct < 80:
        print(f"\n  WARNING: Utilization is below 80%. You may be over-committed.")
    if util_pct > 99:
        cov_pct = float(total_cov["CoveragePercentage"])
        if cov_pct < 80:
            print(f"\n  NOTE: High utilization but low coverage suggests room "
                  f"for additional Savings Plans.")

check_savings_plan_utilization()
```

## Savings Plans vs Reserved Instances

Savings Plans are generally the better choice for new commitments. Here's why:

- **More flexible**: Compute SPs apply across instance families, regions, and even Fargate/Lambda.
- **Simpler**: No marketplace to deal with, no modification workflows.
- **Similar savings**: EC2 Instance SPs offer comparable discounts to RIs.

Reserved Instances still make sense if you already have them (they can coexist with Savings Plans) or if you need capacity reservations (which only Standard RIs provide). See our guide on [Reserved Instances](https://oneuptime.com/blog/post/2026-02-12-reduce-ec2-costs-reserved-instances/view) for more details.

## Step-by-Step Purchase Strategy

Here's a practical approach for your first Savings Plan purchase:

1. **Right-size first**: Downsize over-provisioned instances before committing. See [right-sizing EC2](https://oneuptime.com/blog/post/2026-02-12-reduce-ec2-costs-right-sizing/view).
2. **Analyze 30 days of usage**: Use the scripts above to find your baseline.
3. **Start conservative**: Commit to the 10th percentile of hourly spend.
4. **Choose Compute SP**: Unless you're very certain about instance families.
5. **Pick No Upfront initially**: You can always purchase All Upfront later.
6. **Monitor for 2-3 months**: Check utilization weekly.
7. **Buy additional SPs**: If utilization is consistently above 95%, buy more to cover additional baseline.

## Wrapping Up

Savings Plans are the easiest way to reduce EC2 costs without changing how you run your workloads. Calculate your baseline hourly spend, start with a conservative commitment, and monitor utilization. The key is committing to usage you're confident about - your steady-state baseline - and leaving peak usage on On-Demand. Combine Savings Plans with [right-sizing](https://oneuptime.com/blog/post/2026-02-12-reduce-ec2-costs-right-sizing/view) and [Spot Instances](https://oneuptime.com/blog/post/2026-02-12-reduce-ec2-costs-spot-instances/view) for maximum savings.
