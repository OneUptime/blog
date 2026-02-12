# How to Create Custom Cost Explorer Reports

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, Cost Explorer, Reporting, FinOps

Description: Learn how to build custom AWS Cost Explorer reports that answer specific questions about your cloud spending with filters, groupings, and automated delivery.

---

The pre-built reports in Cost Explorer cover the basics, but every organization has unique questions about their spending. Maybe you need costs broken down by environment and team simultaneously. Maybe you want to see storage costs across all services in a single view. Or maybe you need a comparison of on-demand versus reserved instance spending trends.

Custom reports let you answer these specific questions. Let's build several practical ones.

## Building Blocks of Custom Reports

Every Cost Explorer report has four components:

- **Time period**: The date range you're analyzing.
- **Granularity**: Monthly, daily, or hourly.
- **Metrics**: What you're measuring (cost, usage, etc.).
- **Group by and filters**: How you slice the data.

Understanding the available metrics is important. Here are the main ones:

| Metric | What It Measures |
|---|---|
| UnblendedCost | Actual cost charged for usage |
| BlendedCost | Average cost across an organization |
| AmortizedCost | Upfront costs spread over the reservation period |
| NetAmortizedCost | Amortized cost minus discounts and credits |
| UsageQuantity | Units consumed (hours, GB, requests) |
| NormalizedUsageAmount | Usage normalized to smallest instance size |

For most reports, `UnblendedCost` is the most useful because it shows what you actually paid.

## Report 1: Costs by Environment and Service

This is the most requested custom report. It shows spending broken down by both environment tag and AWS service, so you can see exactly how much your production environment costs for each service compared to staging and dev.

```python
import boto3
from datetime import datetime, timedelta

ce = boto3.client("ce")

def environment_service_report(start_date, end_date):
    """Costs broken down by Environment tag and Service."""
    response = ce.get_cost_and_usage(
        TimePeriod={"Start": start_date, "End": end_date},
        Granularity="MONTHLY",
        Metrics=["UnblendedCost"],
        GroupBy=[
            {"Type": "TAG", "Key": "Environment"},
            {"Type": "DIMENSION", "Key": "SERVICE"}
        ]
    )

    # Organize data by environment
    env_data = {}
    for period in response["ResultsByTime"]:
        for group in period["Groups"]:
            env = group["Keys"][0].replace("Environment$", "") or "Untagged"
            service = group["Keys"][1]
            cost = float(group["Metrics"]["UnblendedCost"]["Amount"])

            if cost < 1.0:
                continue

            if env not in env_data:
                env_data[env] = {}
            env_data[env][service] = env_data[env].get(service, 0) + cost

    # Print report
    for env in sorted(env_data.keys()):
        services = env_data[env]
        total = sum(services.values())
        print(f"\n{'='*60}")
        print(f"Environment: {env} (Total: ${total:,.2f})")
        print(f"{'='*60}")

        for svc, cost in sorted(services.items(), key=lambda x: x[1], reverse=True):
            pct = cost / total * 100
            print(f"  {svc:<45} ${cost:>8,.2f} ({pct:.1f}%)")

environment_service_report("2026-01-01", "2026-02-01")
```

## Report 2: Reserved Instance Coverage

This report shows how well your reserved instances cover your actual usage. Low coverage means you're paying more on-demand than necessary.

```python
import boto3

ce = boto3.client("ce")

def ri_coverage_report(start_date, end_date):
    """Show Reserved Instance coverage by service."""
    response = ce.get_reservation_coverage(
        TimePeriod={"Start": start_date, "End": end_date},
        Granularity="MONTHLY",
        GroupBy=[
            {"Type": "DIMENSION", "Key": "SERVICE"}
        ]
    )

    print(f"\nReserved Instance Coverage Report")
    print(f"{'Service':<45} {'Coverage':>10} {'On-Demand Hrs':>15} {'RI Hrs':>10}")
    print("-" * 85)

    for period in response["CoveragesByTime"]:
        for group in period["Groups"]:
            service = group["Attributes"]["SERVICE"]
            coverage = group["Coverage"]["CoverageHours"]

            total = float(coverage["TotalRunningHours"])
            ri_hours = float(coverage["ReservedHours"])
            od_hours = float(coverage["OnDemandHours"])
            pct = float(coverage["CoverageHoursPercentage"])

            if total > 10:  # Only show services with meaningful usage
                print(f"  {service:<43} {pct:>9.1f}% {od_hours:>14,.0f} {ri_hours:>9,.0f}")

    # Overall coverage
    total_coverage = response["Total"]["CoverageHours"]
    print(f"\n  {'OVERALL':<43} "
          f"{float(total_coverage['CoverageHoursPercentage']):>9.1f}%")

ri_coverage_report("2026-01-01", "2026-02-01")
```

## Report 3: Savings Plan Utilization

If you have Savings Plans, you want to make sure you're actually using them. Unused Savings Plans are wasted money.

```python
import boto3

ce = boto3.client("ce")

def savings_plan_utilization(start_date, end_date):
    """Check how well Savings Plans are being utilized."""
    response = ce.get_savings_plans_utilization(
        TimePeriod={"Start": start_date, "End": end_date},
        Granularity="DAILY"
    )

    print("Savings Plan Daily Utilization:")
    print(f"{'Date':<15} {'Utilization':>12} {'Used':>12} {'Unused':>12}")
    print("-" * 55)

    for period in response["SavingsPlansUtilizationsByTime"]:
        date = period["TimePeriod"]["Start"]
        util = period["Utilization"]

        utilization_pct = float(util["UtilizationPercentage"])
        used = float(util["UsedCommitment"])
        unused = float(util["UnusedCommitment"])

        flag = " ***" if utilization_pct < 80 else ""
        print(f"  {date:<13} {utilization_pct:>11.1f}% "
              f"${used:>11,.2f} ${unused:>11,.2f}{flag}")

    total = response["Total"]["Utilization"]
    print(f"\n  {'AVERAGE':<13} "
          f"{float(total['UtilizationPercentage']):>11.1f}%")

savings_plan_utilization("2026-01-01", "2026-02-01")
```

## Report 4: Cost Trends with Anomaly Highlighting

This report plots daily costs and highlights days that deviate significantly from the average.

```python
import boto3
from datetime import datetime, timedelta
import statistics

ce = boto3.client("ce")

def trend_report(days=60):
    """Daily cost trend with anomaly detection."""
    end_date = datetime.utcnow().strftime("%Y-%m-%d")
    start_date = (datetime.utcnow() - timedelta(days=days)).strftime("%Y-%m-%d")

    response = ce.get_cost_and_usage(
        TimePeriod={"Start": start_date, "End": end_date},
        Granularity="DAILY",
        Metrics=["UnblendedCost"]
    )

    daily_costs = []
    for day in response["ResultsByTime"]:
        date = day["TimePeriod"]["Start"]
        cost = float(day["Total"]["UnblendedCost"]["Amount"])
        daily_costs.append({"date": date, "cost": cost})

    costs = [d["cost"] for d in daily_costs]
    avg = statistics.mean(costs)
    std = statistics.stdev(costs)

    print(f"\nCost Trend (last {days} days)")
    print(f"Average: ${avg:,.2f}/day | Std Dev: ${std:,.2f}")
    print(f"\n{'Date':<15} {'Cost':>10} {'vs Avg':>10} {'Status':<15}")
    print("-" * 55)

    for day in daily_costs:
        diff = day["cost"] - avg
        diff_pct = (diff / avg * 100) if avg > 0 else 0

        if day["cost"] > avg + 2 * std:
            status = "HIGH ANOMALY"
        elif day["cost"] > avg + std:
            status = "Above normal"
        elif day["cost"] < avg - 2 * std:
            status = "LOW ANOMALY"
        else:
            status = ""

        if status:
            print(f"  {day['date']:<13} ${day['cost']:>9,.2f} "
                  f"{diff_pct:>+9.1f}% {status}")

trend_report()
```

## Report 5: Cost by Region

Identify which regions are costing you the most. Sometimes workloads end up in expensive regions without good reason.

```python
import boto3
from datetime import datetime, timedelta

ce = boto3.client("ce")

def region_cost_report(start_date, end_date):
    """Costs broken down by AWS region."""
    response = ce.get_cost_and_usage(
        TimePeriod={"Start": start_date, "End": end_date},
        Granularity="MONTHLY",
        Metrics=["UnblendedCost"],
        GroupBy=[
            {"Type": "DIMENSION", "Key": "REGION"}
        ]
    )

    regions = []
    for period in response["ResultsByTime"]:
        for group in period["Groups"]:
            region = group["Keys"][0] or "Global"
            cost = float(group["Metrics"]["UnblendedCost"]["Amount"])
            if cost > 1.0:
                regions.append({"region": region, "cost": cost})

    regions.sort(key=lambda x: x["cost"], reverse=True)
    total = sum(r["cost"] for r in regions)

    print(f"\nCosts by Region (Total: ${total:,.2f})")
    for r in regions:
        pct = r["cost"] / total * 100
        bar = "#" * int(pct / 2)
        print(f"  {r['region']:<20} ${r['cost']:>10,.2f} ({pct:>5.1f}%) {bar}")

region_cost_report("2026-01-01", "2026-02-01")
```

## Automating Report Delivery

Wrap your reports in a Lambda function triggered by CloudWatch Events on a schedule.

```hcl
# Schedule weekly report delivery
resource "aws_cloudwatch_event_rule" "weekly_cost_report" {
  name                = "weekly-cost-report"
  description         = "Trigger weekly cost report"
  schedule_expression = "cron(0 9 ? * MON *)"  # Every Monday at 9 AM UTC
}

resource "aws_cloudwatch_event_target" "cost_report_lambda" {
  rule      = aws_cloudwatch_event_rule.weekly_cost_report.name
  target_id = "cost-report"
  arn       = aws_lambda_function.cost_report.arn
}

resource "aws_lambda_permission" "allow_eventbridge" {
  statement_id  = "AllowEventBridge"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.cost_report.function_name
  principal     = "events.amazonaws.com"
  source_arn    = aws_cloudwatch_event_rule.weekly_cost_report.arn
}
```

## Saving Reports in the Console

If you prefer the console, you can save custom reports for quick access:

1. Go to Cost Explorer in the AWS Console
2. Configure your filters, groupings, and time range
3. Click "Save as new report"
4. Name it something descriptive like "Prod EC2 Daily Costs by Instance Type"

Saved reports remember all your settings and update automatically when you open them.

For a more advanced visualization setup, check out our guide on [visualizing AWS costs with QuickSight](https://oneuptime.com/blog/post/visualize-aws-costs-quicksight/view). And to automate cost control based on what these reports reveal, see [creating AWS Budget actions](https://oneuptime.com/blog/post/create-aws-budget-actions-automatic-cost-control/view).

## Wrapping Up

Custom Cost Explorer reports turn raw billing data into actionable intelligence. Start with the reports that answer your most pressing questions - usually cost by environment, service, and region - then build more specialized reports as you learn more about your spending patterns. Automate delivery so the insights come to your team, rather than requiring someone to remember to check the console. The combination of API access and scheduled Lambda execution makes it easy to build a custom FinOps reporting pipeline.
