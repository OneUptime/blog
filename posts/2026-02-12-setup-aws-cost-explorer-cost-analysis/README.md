# How to Set Up AWS Cost Explorer for Cost Analysis

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, Cost Explorer, Cost Management, FinOps

Description: A step-by-step guide to enabling and configuring AWS Cost Explorer for analyzing your cloud spending patterns and identifying optimization opportunities.

---

AWS bills have a way of surprising you. You think you're running a reasonable workload, then the monthly invoice arrives and there's a line item you didn't expect. Cost Explorer is AWS's built-in tool for understanding where your money is going. It's free to use (the API has a small per-request cost), and it gives you granular visibility into your spending patterns.

Let's set it up and learn how to actually use it to find the information that matters.

## Enabling Cost Explorer

Cost Explorer isn't enabled by default. You need to turn it on from the management account if you're using AWS Organizations, or from the standalone account.

Enable it through the AWS CLI.

```bash
aws ce get-cost-and-usage \
  --time-period Start=2026-02-01,End=2026-02-12 \
  --granularity MONTHLY \
  --metrics "BlendedCost"
```

If you get an error saying Cost Explorer isn't enabled, you'll need to enable it through the console first. Go to the Billing Dashboard, click on Cost Explorer in the left navigation, and click "Enable Cost Explorer." It takes up to 24 hours for historical data to populate.

For organizations, the management account must enable Cost Explorer, and it automatically becomes available to all member accounts (if you've configured access).

## Understanding the Interface

Cost Explorer has two main views: the preconfigured reports and custom reports. The preconfigured reports cover the most common questions:

- **Monthly costs by service**: Where is my money going?
- **Daily costs**: When did spending change?
- **Monthly costs by linked account**: Which team or project is spending the most?
- **Monthly EC2 running hours costs and usage**: Am I using my compute efficiently?

These are good starting points, but custom reports are where the real insights live.

## Your First Custom Query

Let's use the Cost Explorer API to pull cost data programmatically. This is more repeatable than clicking around the console.

This script shows your costs broken down by service for the current month.

```python
import boto3
from datetime import datetime, timedelta

ce = boto3.client("ce")

def get_costs_by_service(start_date, end_date):
    """Get costs grouped by AWS service."""
    response = ce.get_cost_and_usage(
        TimePeriod={
            "Start": start_date,
            "End": end_date
        },
        Granularity="MONTHLY",
        Metrics=["UnblendedCost"],
        GroupBy=[
            {
                "Type": "DIMENSION",
                "Key": "SERVICE"
            }
        ]
    )

    results = []
    for group in response["ResultsByTime"]:
        for item in group["Groups"]:
            service = item["Keys"][0]
            cost = float(item["Metrics"]["UnblendedCost"]["Amount"])
            if cost > 0.01:  # Skip negligible costs
                results.append({"service": service, "cost": cost})

    # Sort by cost descending
    results.sort(key=lambda x: x["cost"], reverse=True)

    print(f"Costs from {start_date} to {end_date}:")
    print(f"{'Service':<50} {'Cost':>10}")
    print("-" * 62)
    total = 0
    for item in results:
        print(f"{item['service']:<50} ${item['cost']:>9.2f}")
        total += item["cost"]
    print("-" * 62)
    print(f"{'Total':<50} ${total:>9.2f}")

# Current month
now = datetime.utcnow()
start = now.replace(day=1).strftime("%Y-%m-%d")
end = now.strftime("%Y-%m-%d")
get_costs_by_service(start, end)
```

## Filtering by Tags

Tags are essential for cost allocation. If you tag your resources consistently, you can break down costs by team, project, environment, or any other dimension that matters to your organization.

First, activate your cost allocation tags in the Billing console. Then query by tag.

This script shows costs grouped by the "Environment" tag.

```python
import boto3

ce = boto3.client("ce")

def get_costs_by_tag(tag_key, start_date, end_date):
    """Get costs grouped by a specific tag."""
    response = ce.get_cost_and_usage(
        TimePeriod={
            "Start": start_date,
            "End": end_date
        },
        Granularity="MONTHLY",
        Metrics=["UnblendedCost"],
        GroupBy=[
            {
                "Type": "TAG",
                "Key": tag_key
            }
        ]
    )

    for group in response["ResultsByTime"]:
        print(f"\nPeriod: {group['TimePeriod']['Start']} to {group['TimePeriod']['End']}")
        for item in group["Groups"]:
            tag_value = item["Keys"][0]
            cost = float(item["Metrics"]["UnblendedCost"]["Amount"])
            if cost > 0.01:
                print(f"  {tag_value}: ${cost:.2f}")

get_costs_by_tag("Environment", "2026-01-01", "2026-02-01")
```

## Daily Cost Trends

Monthly totals are useful, but daily granularity helps you spot anomalies. If costs suddenly spike on a Tuesday, you want to know about it.

This script pulls daily costs for the last 30 days and highlights days with unusual spending.

```python
import boto3
from datetime import datetime, timedelta
import statistics

ce = boto3.client("ce")

def analyze_daily_costs(days=30):
    """Analyze daily costs and flag anomalies."""
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

    # Calculate statistics
    costs = [d["cost"] for d in daily_costs]
    avg = statistics.mean(costs)
    std_dev = statistics.stdev(costs) if len(costs) > 1 else 0

    print(f"Daily Cost Analysis (last {days} days)")
    print(f"Average: ${avg:.2f}/day")
    print(f"Std Dev: ${std_dev:.2f}")
    print(f"\nAnomalies (> 2 std devs from mean):")

    for day in daily_costs:
        flag = " *** ANOMALY" if day["cost"] > avg + 2 * std_dev else ""
        if flag:
            print(f"  {day['date']}: ${day['cost']:.2f}{flag}")

analyze_daily_costs()
```

## Cost Forecasting

Cost Explorer can forecast your future spending based on historical patterns. This is incredibly useful for budget planning.

```python
import boto3
from datetime import datetime, timedelta

ce = boto3.client("ce")

def get_cost_forecast():
    """Get cost forecast for the rest of the month."""
    now = datetime.utcnow()

    # Forecast from tomorrow to end of month
    start = (now + timedelta(days=1)).strftime("%Y-%m-%d")

    # End of current month
    if now.month == 12:
        end = f"{now.year + 1}-01-01"
    else:
        end = f"{now.year}-{now.month + 1:02d}-01"

    response = ce.get_cost_forecast(
        TimePeriod={"Start": start, "End": end},
        Granularity="MONTHLY",
        Metric="UNBLENDED_COST"
    )

    forecast = response["Total"]
    print(f"Forecasted cost for rest of month: ${float(forecast['Amount']):.2f}")

    # Also get confidence intervals
    for prediction in response.get("ForecastResultsByTime", []):
        lower = float(prediction.get("MeanValue", 0))
        print(f"  Period: {prediction['TimePeriod']['Start']}")
        print(f"  Mean: ${lower:.2f}")

get_cost_forecast()
```

## Setting Up Cost Anomaly Detection

Cost Explorer includes anomaly detection that automatically identifies unusual spending patterns. Set it up to get alerts when something unexpected happens.

```bash
# Create a cost anomaly monitor for all services
aws ce create-anomaly-monitor \
  --anomaly-monitor '{
    "MonitorName": "all-services",
    "MonitorType": "DIMENSIONAL",
    "MonitorDimension": "SERVICE"
  }'

# Create a subscription to get notified
aws ce create-anomaly-subscription \
  --anomaly-subscription '{
    "SubscriptionName": "cost-anomaly-alerts",
    "MonitorArnList": ["arn:aws:ce::123456789:anomalymonitor/abc123"],
    "Subscribers": [
      {
        "Address": "finance@example.com",
        "Type": "EMAIL"
      }
    ],
    "Threshold": 100,
    "Frequency": "DAILY"
  }'
```

The threshold of 100 means you'll only be notified when the anomaly represents at least $100 in unexpected spending. Adjust this based on your total spend.

## Automating Cost Reports

Build a weekly cost report that runs automatically and sends results to Slack or email.

This Lambda function generates a weekly cost summary.

```python
import boto3
import json
from datetime import datetime, timedelta

ce = boto3.client("ce")
sns = boto3.client("sns")

REPORT_TOPIC_ARN = "arn:aws:sns:us-east-1:123456789:cost-reports"

def weekly_cost_report(event, context):
    """Generate and send weekly cost report."""
    end_date = datetime.utcnow().strftime("%Y-%m-%d")
    start_date = (datetime.utcnow() - timedelta(days=7)).strftime("%Y-%m-%d")

    # Get costs by service
    response = ce.get_cost_and_usage(
        TimePeriod={"Start": start_date, "End": end_date},
        Granularity="DAILY",
        Metrics=["UnblendedCost"],
        GroupBy=[{"Type": "DIMENSION", "Key": "SERVICE"}]
    )

    # Aggregate by service
    service_totals = {}
    for day in response["ResultsByTime"]:
        for group in day["Groups"]:
            service = group["Keys"][0]
            cost = float(group["Metrics"]["UnblendedCost"]["Amount"])
            service_totals[service] = service_totals.get(service, 0) + cost

    # Sort and format
    sorted_services = sorted(
        service_totals.items(), key=lambda x: x[1], reverse=True
    )

    total = sum(service_totals.values())
    report = f"Weekly AWS Cost Report ({start_date} to {end_date})\n"
    report += f"Total: ${total:.2f}\n\n"
    report += "Top 10 Services:\n"

    for service, cost in sorted_services[:10]:
        pct = (cost / total * 100) if total > 0 else 0
        report += f"  {service}: ${cost:.2f} ({pct:.1f}%)\n"

    # Send via SNS
    sns.publish(
        TopicArn=REPORT_TOPIC_ARN,
        Subject=f"Weekly AWS Cost Report - ${total:.2f}",
        Message=report
    )

    return {"statusCode": 200, "body": report}
```

For a deeper dive into finding your most expensive services, check out our guide on [using Cost Explorer to find your most expensive services](https://oneuptime.com/blog/post/2026-02-12-cost-explorer-find-most-expensive-services/view). And to take action on what you find, see our post on [setting up AWS Budgets for cost alerts](https://oneuptime.com/blog/post/2026-02-12-setup-aws-budgets-cost-alerts/view).

## Wrapping Up

Cost Explorer is your first line of defense against AWS bill shock. Enable it, explore the pre-built reports, then build custom queries that answer your specific questions. Use tags for cost allocation, set up anomaly detection for automatic alerts, and automate weekly reports to keep your team informed. The API makes it easy to build custom dashboards and integrate cost data into your existing workflows.
