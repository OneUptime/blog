# How to Use Cost Explorer to Find Your Most Expensive Services

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, Cost Explorer, Cost Optimization, FinOps

Description: Learn how to use AWS Cost Explorer to identify your most expensive services, drill into usage patterns, and find quick wins for cost reduction.

---

You know your AWS bill is high. But do you know exactly what's driving it? Most teams have a vague idea - "it's probably EC2" - but vague doesn't help you optimize. Cost Explorer lets you slice and dice your spending data to find exactly where the money goes, down to the individual resource level. Let's go through the process systematically.

## Start with the Big Picture

Before drilling into details, get the overall view of your spending by service.

This script pulls your top 10 most expensive services for the last month.

```python
import boto3
from datetime import datetime, timedelta

ce = boto3.client("ce")

def get_top_services(months=1):
    """Get the most expensive AWS services."""
    end_date = datetime.utcnow().strftime("%Y-%m-%d")
    start_date = (datetime.utcnow() - timedelta(days=30 * months)).strftime("%Y-%m-%d")

    response = ce.get_cost_and_usage(
        TimePeriod={"Start": start_date, "End": end_date},
        Granularity="MONTHLY",
        Metrics=["UnblendedCost", "UsageQuantity"],
        GroupBy=[
            {"Type": "DIMENSION", "Key": "SERVICE"}
        ]
    )

    services = []
    for period in response["ResultsByTime"]:
        for group in period["Groups"]:
            service_name = group["Keys"][0]
            cost = float(group["Metrics"]["UnblendedCost"]["Amount"])
            usage = float(group["Metrics"]["UsageQuantity"]["Amount"])
            if cost > 1.0:
                services.append({
                    "service": service_name,
                    "cost": cost,
                    "usage": usage
                })

    services.sort(key=lambda x: x["cost"], reverse=True)

    total = sum(s["cost"] for s in services)
    print(f"\nTop AWS Services by Cost (Total: ${total:,.2f})")
    print(f"{'Rank':<5} {'Service':<50} {'Cost':>12} {'% of Total':>10}")
    print("-" * 80)

    cumulative = 0
    for i, svc in enumerate(services[:15], 1):
        pct = (svc["cost"] / total * 100) if total > 0 else 0
        cumulative += pct
        print(f"{i:<5} {svc['service']:<50} ${svc['cost']:>11,.2f} {pct:>9.1f}%")

    print(f"\nTop 5 services account for "
          f"{sum(s['cost'] for s in services[:5]) / total * 100:.1f}% of total spend")

get_top_services()
```

In most AWS accounts, the top 5 services account for 80-90% of spending. Focus your optimization efforts there.

## Drill Into EC2 Costs

EC2 is usually the biggest cost driver. Break it down by instance type, region, and usage type to understand what you're paying for.

This script breaks down EC2 costs by instance type.

```python
import boto3
from datetime import datetime, timedelta

ce = boto3.client("ce")

def analyze_ec2_costs():
    """Break down EC2 costs by instance type and usage type."""
    end_date = datetime.utcnow().strftime("%Y-%m-%d")
    start_date = (datetime.utcnow() - timedelta(days=30)).strftime("%Y-%m-%d")

    # Get costs by usage type (reveals On-Demand vs Reserved vs Spot)
    response = ce.get_cost_and_usage(
        TimePeriod={"Start": start_date, "End": end_date},
        Granularity="MONTHLY",
        Metrics=["UnblendedCost", "UsageQuantity"],
        Filter={
            "Dimensions": {
                "Key": "SERVICE",
                "Values": ["Amazon Elastic Compute Cloud - Compute"]
            }
        },
        GroupBy=[
            {"Type": "DIMENSION", "Key": "USAGE_TYPE"}
        ]
    )

    print("\nEC2 Cost Breakdown by Usage Type:")
    print(f"{'Usage Type':<60} {'Cost':>12} {'Hours':>10}")
    print("-" * 85)

    items = []
    for period in response["ResultsByTime"]:
        for group in period["Groups"]:
            usage_type = group["Keys"][0]
            cost = float(group["Metrics"]["UnblendedCost"]["Amount"])
            usage = float(group["Metrics"]["UsageQuantity"]["Amount"])
            if cost > 0.10:
                items.append((usage_type, cost, usage))

    items.sort(key=lambda x: x[1], reverse=True)
    for usage_type, cost, usage in items:
        print(f"{usage_type:<60} ${cost:>11,.2f} {usage:>9,.0f}")

analyze_ec2_costs()
```

The usage types tell you a lot. Look for:

- **BoxUsage**: On-Demand instances. These are the most expensive per hour.
- **HeavyUsage**: Reserved Instances. You're getting a discount.
- **SpotUsage**: Spot Instances. Cheapest option.
- **EBS**: Storage volumes attached to instances.
- **DataTransfer**: Network traffic. This is often surprisingly expensive.

## Find Idle and Underutilized Resources

The most expensive resource is one that does nothing. Look for resources with low utilization.

This script identifies EC2 instances with low CPU utilization using CloudWatch.

```python
import boto3
from datetime import datetime, timedelta

cloudwatch = boto3.client("cloudwatch")
ec2 = boto3.client("ec2")

def find_idle_instances(cpu_threshold=5, days=14):
    """Find EC2 instances with average CPU below threshold."""
    instances = ec2.describe_instances(
        Filters=[{"Name": "instance-state-name", "Values": ["running"]}]
    )

    idle_instances = []
    end_time = datetime.utcnow()
    start_time = end_time - timedelta(days=days)

    for reservation in instances["Reservations"]:
        for instance in reservation["Instances"]:
            instance_id = instance["InstanceId"]
            instance_type = instance["InstanceType"]

            # Get name tag
            name = "N/A"
            for tag in instance.get("Tags", []):
                if tag["Key"] == "Name":
                    name = tag["Value"]

            # Get average CPU
            cpu_stats = cloudwatch.get_metric_statistics(
                Namespace="AWS/EC2",
                MetricName="CPUUtilization",
                Dimensions=[{"Name": "InstanceId", "Value": instance_id}],
                StartTime=start_time,
                EndTime=end_time,
                Period=86400,  # Daily average
                Statistics=["Average"]
            )

            if cpu_stats["Datapoints"]:
                avg_cpu = sum(
                    dp["Average"] for dp in cpu_stats["Datapoints"]
                ) / len(cpu_stats["Datapoints"])

                if avg_cpu < cpu_threshold:
                    idle_instances.append({
                        "id": instance_id,
                        "name": name,
                        "type": instance_type,
                        "avg_cpu": avg_cpu
                    })

    print(f"\nIdle Instances (avg CPU < {cpu_threshold}% over {days} days):")
    print(f"{'Instance ID':<22} {'Name':<30} {'Type':<15} {'Avg CPU':>8}")
    print("-" * 78)
    for inst in sorted(idle_instances, key=lambda x: x["avg_cpu"]):
        print(f"{inst['id']:<22} {inst['name']:<30} "
              f"{inst['type']:<15} {inst['avg_cpu']:>7.1f}%")

find_idle_instances()
```

## Analyze Data Transfer Costs

Data transfer is the hidden cost killer on AWS. It's easy to overlook because you don't provision it explicitly, but cross-region and internet-bound traffic adds up fast.

```python
import boto3
from datetime import datetime, timedelta

ce = boto3.client("ce")

def analyze_data_transfer():
    """Break down data transfer costs."""
    end_date = datetime.utcnow().strftime("%Y-%m-%d")
    start_date = (datetime.utcnow() - timedelta(days=30)).strftime("%Y-%m-%d")

    response = ce.get_cost_and_usage(
        TimePeriod={"Start": start_date, "End": end_date},
        Granularity="MONTHLY",
        Metrics=["UnblendedCost"],
        Filter={
            "Dimensions": {
                "Key": "USAGE_TYPE_GROUP",
                "Values": [
                    "EC2: Data Transfer - Internet (Out)",
                    "EC2: Data Transfer - Inter AZ",
                    "EC2: Data Transfer - Region to Region"
                ]
            }
        },
        GroupBy=[
            {"Type": "DIMENSION", "Key": "USAGE_TYPE_GROUP"}
        ]
    )

    print("\nData Transfer Costs:")
    for period in response["ResultsByTime"]:
        for group in period["Groups"]:
            transfer_type = group["Keys"][0]
            cost = float(group["Metrics"]["UnblendedCost"]["Amount"])
            print(f"  {transfer_type}: ${cost:,.2f}")

analyze_data_transfer()
```

## Cost by Linked Account

If you're using AWS Organizations, find which accounts are spending the most.

```python
import boto3
from datetime import datetime, timedelta

ce = boto3.client("ce")

def costs_by_account():
    """Get costs broken down by linked account."""
    end_date = datetime.utcnow().strftime("%Y-%m-%d")
    start_date = (datetime.utcnow() - timedelta(days=30)).strftime("%Y-%m-%d")

    response = ce.get_cost_and_usage(
        TimePeriod={"Start": start_date, "End": end_date},
        Granularity="MONTHLY",
        Metrics=["UnblendedCost"],
        GroupBy=[
            {"Type": "DIMENSION", "Key": "LINKED_ACCOUNT"}
        ]
    )

    accounts = []
    for period in response["ResultsByTime"]:
        for group in period["Groups"]:
            account_id = group["Keys"][0]
            cost = float(group["Metrics"]["UnblendedCost"]["Amount"])
            accounts.append({"id": account_id, "cost": cost})

    accounts.sort(key=lambda x: x["cost"], reverse=True)
    total = sum(a["cost"] for a in accounts)

    print(f"\nCosts by Account (Total: ${total:,.2f}):")
    for acct in accounts:
        pct = (acct["cost"] / total * 100) if total > 0 else 0
        print(f"  {acct['id']}: ${acct['cost']:,.2f} ({pct:.1f}%)")

costs_by_account()
```

## Month-Over-Month Comparison

Understanding trends is just as important as knowing current costs.

This script compares this month's spending to last month, highlighting services with significant changes.

```python
import boto3
from datetime import datetime, timedelta

ce = boto3.client("ce")

def month_over_month():
    """Compare current month to previous month by service."""
    now = datetime.utcnow()

    # Current month
    current_start = now.replace(day=1).strftime("%Y-%m-%d")
    current_end = now.strftime("%Y-%m-%d")

    # Previous month
    prev_end = now.replace(day=1).strftime("%Y-%m-%d")
    prev_start = (now.replace(day=1) - timedelta(days=1)).replace(day=1).strftime("%Y-%m-%d")

    def get_costs(start, end):
        resp = ce.get_cost_and_usage(
            TimePeriod={"Start": start, "End": end},
            Granularity="MONTHLY",
            Metrics=["UnblendedCost"],
            GroupBy=[{"Type": "DIMENSION", "Key": "SERVICE"}]
        )
        costs = {}
        for period in resp["ResultsByTime"]:
            for group in period["Groups"]:
                costs[group["Keys"][0]] = float(
                    group["Metrics"]["UnblendedCost"]["Amount"]
                )
        return costs

    prev = get_costs(prev_start, prev_end)
    curr = get_costs(current_start, current_end)

    all_services = set(list(prev.keys()) + list(curr.keys()))

    changes = []
    for svc in all_services:
        p = prev.get(svc, 0)
        c = curr.get(svc, 0)
        if p > 5 or c > 5:  # Only services with meaningful spend
            change_pct = ((c - p) / p * 100) if p > 0 else 100
            changes.append({"service": svc, "prev": p, "curr": c, "change": change_pct})

    changes.sort(key=lambda x: abs(x["change"]), reverse=True)

    print("\nMonth-over-Month Changes (services with >$5 spend):")
    print(f"{'Service':<45} {'Last Mo':>10} {'This Mo':>10} {'Change':>10}")
    print("-" * 78)
    for c in changes[:15]:
        arrow = "+" if c["change"] > 0 else ""
        print(f"{c['service']:<45} ${c['prev']:>9,.2f} ${c['curr']:>9,.2f} "
              f"{arrow}{c['change']:>8.1f}%")

month_over_month()
```

## Quick Wins Checklist

After running these analyses, look for these common savings opportunities:

1. **Idle EC2 instances**: Terminate or stop them.
2. **Oversized instances**: Right-size based on actual usage. See our guide on [reducing EC2 costs with right-sizing](https://oneuptime.com/blog/post/2026-02-12-reduce-ec2-costs-right-sizing/view).
3. **Unattached EBS volumes**: Delete volumes not attached to any instance.
4. **Old snapshots**: Clean up EBS snapshots you no longer need.
5. **Data transfer**: Consider using VPC endpoints, CloudFront, or moving services to the same AZ.
6. **On-Demand to Reserved/Savings Plans**: If usage is stable, switch to [Savings Plans](https://oneuptime.com/blog/post/2026-02-12-reduce-ec2-costs-savings-plans/view) or [Reserved Instances](https://oneuptime.com/blog/post/2026-02-12-reduce-ec2-costs-reserved-instances/view).

For automated right-sizing recommendations, check out our post on [using AWS Compute Optimizer](https://oneuptime.com/blog/post/2026-02-12-use-aws-compute-optimizer-right-sizing/view).

## Wrapping Up

Finding your most expensive services is the first step toward controlling your AWS bill. Use Cost Explorer to get the big picture, then drill into each service to understand what's driving the cost. Look for idle resources, data transfer charges, and overprovisioned instances. The scripts in this post give you a repeatable process that you can run monthly or automate with Lambda. Once you know where the money goes, you can make informed decisions about optimization.
