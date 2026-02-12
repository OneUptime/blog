# How to Reduce EC2 Costs with Reserved Instances

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, EC2, Reserved Instances, Cost Optimization

Description: A practical guide to purchasing and managing EC2 Reserved Instances for significant cost savings on predictable workloads.

---

Reserved Instances (RIs) have been around since the early days of AWS, and they're still one of the most effective ways to reduce EC2 costs. The concept is simple: commit to running specific instance types for 1 or 3 years, and AWS gives you a discount of up to 72% compared to On-Demand pricing.

While Savings Plans are generally more flexible (and we recommend starting there for new commitments), RIs still have their place - particularly when you need capacity reservations or when you're managing existing RI portfolios. Let's walk through how to purchase and manage them effectively.

## Understanding RI Types

AWS offers three RI classes:

**Standard RIs** offer the deepest discounts (up to 72%) but are the least flexible. You can't change the instance family. You can sell unused Standard RIs on the RI Marketplace.

**Convertible RIs** offer slightly lower discounts (up to 54%) but let you exchange them for different instance types, OS, or tenancy. You can't sell these on the marketplace.

**Scheduled RIs** (being phased out) were for recurring time windows. AWS is no longer offering new Scheduled RIs.

For most situations, start with Convertible RIs for flexibility. Use Standard RIs only when you're very confident about your instance requirements for the full term.

## Analyzing Your RI Needs

Before purchasing, understand what you're actually running consistently.

This script identifies instances that have been running steadily and are good RI candidates.

```python
import boto3
from datetime import datetime, timedelta
from collections import defaultdict

cloudwatch = boto3.client("cloudwatch")
ec2 = boto3.client("ec2")

def find_ri_candidates(min_running_days=30):
    """Find instances that have been running consistently and are RI candidates."""
    instances = ec2.describe_instances(
        Filters=[{"Name": "instance-state-name", "Values": ["running"]}]
    )

    candidates = defaultdict(lambda: {"count": 0, "instances": []})
    now = datetime.utcnow()

    for reservation in instances["Reservations"]:
        for inst in reservation["Instances"]:
            launch_time = inst["LaunchTime"].replace(tzinfo=None)
            running_days = (now - launch_time).days

            if running_days < min_running_days:
                continue

            instance_type = inst["InstanceType"]
            az = inst["Placement"]["AvailabilityZone"]
            region = az[:-1]
            platform = inst.get("Platform", "Linux/UNIX")

            key = f"{instance_type}|{region}|{platform}"
            candidates[key]["count"] += 1
            candidates[key]["instances"].append({
                "id": inst["InstanceId"],
                "days_running": running_days,
                "name": next(
                    (t["Value"] for t in inst.get("Tags", []) if t["Key"] == "Name"),
                    "N/A"
                )
            })

    # Sort by count (most common instance types first)
    sorted_candidates = sorted(
        candidates.items(),
        key=lambda x: x[1]["count"],
        reverse=True
    )

    print(f"\nRI Candidates (instances running > {min_running_days} days)")
    print(f"{'Instance Type':<20} {'Region':<15} {'Platform':<15} {'Count':>5}")
    print("-" * 60)

    for key, data in sorted_candidates:
        parts = key.split("|")
        print(f"{parts[0]:<20} {parts[1]:<15} {parts[2]:<15} {data['count']:>5}")
        for inst in data["instances"][:3]:
            print(f"    {inst['id']} ({inst['name']}) - "
                  f"{inst['days_running']} days running")

find_ri_candidates()
```

## Checking Current RI Coverage

See what you already have covered before buying more.

```python
import boto3

ce = boto3.client("ce")
ec2 = boto3.client("ec2")

def check_ri_coverage():
    """Check current RI coverage and identify gaps."""
    # List existing RIs
    ris = ec2.describe_reserved_instances(
        Filters=[{"Name": "state", "Values": ["active"]}]
    )

    print("\nActive Reserved Instances:")
    print(f"{'RI ID':<25} {'Type':<15} {'Count':>5} {'Expires':<12}")
    print("-" * 60)

    for ri in ris["ReservedInstances"]:
        ri_id = ri["ReservedInstancesId"][:24]
        instance_type = ri["InstanceType"]
        count = ri["InstanceCount"]
        end = ri["End"].strftime("%Y-%m-%d")

        print(f"{ri_id:<25} {instance_type:<15} {count:>5} {end:<12}")

    # Check coverage via Cost Explorer
    from datetime import datetime, timedelta
    end_date = datetime.utcnow().strftime("%Y-%m-%d")
    start_date = (datetime.utcnow() - timedelta(days=30)).strftime("%Y-%m-%d")

    coverage = ce.get_reservation_coverage(
        TimePeriod={"Start": start_date, "End": end_date},
        Granularity="MONTHLY",
        GroupBy=[{"Type": "DIMENSION", "Key": "INSTANCE_TYPE"}]
    )

    print(f"\nRI Coverage by Instance Type:")
    print(f"{'Instance Type':<20} {'Coverage':>10} {'On-Demand Hrs':>15} {'RI Hrs':>10}")
    print("-" * 60)

    for period in coverage["CoveragesByTime"]:
        for group in period["Groups"]:
            inst_type = group["Attributes"]["INSTANCE_TYPE"]
            cov = group["Coverage"]["CoverageHours"]
            total = float(cov["TotalRunningHours"])
            if total < 100:
                continue

            pct = float(cov["CoverageHoursPercentage"])
            od = float(cov["OnDemandHours"])
            ri = float(cov["ReservedHours"])

            flag = " <-- OPPORTUNITY" if pct < 50 and total > 500 else ""
            print(f"{inst_type:<20} {pct:>9.1f}% {od:>14,.0f} {ri:>9,.0f}{flag}")

check_ri_coverage()
```

## Getting AWS RI Recommendations

AWS provides RI purchase recommendations based on your usage.

```python
import boto3

ce = boto3.client("ce")

def get_ri_recommendations():
    """Get RI purchase recommendations from AWS."""
    response = ce.get_reservation_purchase_recommendation(
        Service="Amazon Elastic Compute Cloud - Compute",
        TermInYears="ONE_YEAR",
        PaymentOption="NO_UPFRONT",
        LookbackPeriodInDays="THIRTY_DAYS"
    )

    for rec in response.get("Recommendations", []):
        summary = rec["RecommendationSummary"]
        print(f"\nRI Recommendation Summary:")
        print(f"  Total estimated monthly savings: "
              f"${float(summary['TotalEstimatedMonthlySavingsAmount']):,.2f}")
        print(f"  Estimated savings percentage: "
              f"{float(summary['TotalEstimatedMonthlySavingsPercentage']):.1f}%")

        for detail in rec.get("RecommendationDetails", [])[:10]:
            inst = detail["InstanceDetails"]["EC2InstanceDetails"]
            print(f"\n  {inst['InstanceType']} in {inst['Region']}:")
            print(f"    Recommended count: {detail['RecommendedNumberOfInstancesToPurchase']}")
            print(f"    Monthly savings: "
                  f"${float(detail['EstimatedMonthlySavingsAmount']):,.2f}")
            print(f"    Upfront cost: "
                  f"${float(detail.get('UpfrontCost', '0')):,.2f}")
            print(f"    Estimated breakeven: "
                  f"{detail.get('EstimatedBreakEvenInMonths', 'N/A')} months")

get_ri_recommendations()
```

## Purchasing Reserved Instances

Once you've identified what to buy, purchase through the CLI.

```bash
# First, find available RI offerings
aws ec2 describe-reserved-instances-offerings \
  --instance-type m5.xlarge \
  --product-description "Linux/UNIX" \
  --instance-tenancy default \
  --offering-type "No Upfront" \
  --filters Name=duration,Values=31536000 \
  --query 'ReservedInstancesOfferings[*].{ID:ReservedInstancesOfferingId,Type:InstanceType,Price:FixedPrice,Hourly:RecurringCharges[0].Amount}'

# Purchase the RI
aws ec2 purchase-reserved-instances-offering \
  --reserved-instances-offering-id "offering-id" \
  --instance-count 5
```

Always double-check the offering details before purchasing. RIs are non-refundable (though Standard RIs can be sold on the marketplace).

## Managing Your RI Portfolio

### Modifying RIs

Standard RIs can be modified (but not exchanged). You can change the Availability Zone, network platform, or instance size within the same family.

```bash
# Split 1 m5.xlarge RI into 2 m5.large RIs (same normalized units)
aws ec2 modify-reserved-instances \
  --reserved-instances-ids ri-xxxxxxxx \
  --target-configurations '[
    {"InstanceType": "m5.large", "InstanceCount": 2}
  ]'
```

### Exchanging Convertible RIs

Convertible RIs can be exchanged for different instance types. The new RI must have equal or greater value.

```bash
# Exchange a Convertible RI
aws ec2 accept-reserved-instances-exchange-quote \
  --reserved-instance-ids ri-xxxxxxxx \
  --target-configurations '[
    {"InstanceType": "c5.xlarge", "InstanceCount": 2}
  ]'
```

### Monitoring Expiration

Set up alerts before your RIs expire so you can decide whether to renew.

```python
import boto3
from datetime import datetime, timedelta

ec2 = boto3.client("ec2")
sns = boto3.client("sns")

def check_expiring_ris(days_ahead=30):
    """Find RIs expiring within the specified number of days."""
    ris = ec2.describe_reserved_instances(
        Filters=[{"Name": "state", "Values": ["active"]}]
    )

    threshold = datetime.utcnow() + timedelta(days=days_ahead)
    expiring = []

    for ri in ris["ReservedInstances"]:
        end_date = ri["End"].replace(tzinfo=None)
        if end_date < threshold:
            days_left = (end_date - datetime.utcnow()).days
            expiring.append({
                "id": ri["ReservedInstancesId"],
                "type": ri["InstanceType"],
                "count": ri["InstanceCount"],
                "expires": end_date.strftime("%Y-%m-%d"),
                "days_left": days_left
            })

    if expiring:
        message = f"The following RIs expire within {days_ahead} days:\n\n"
        for ri in sorted(expiring, key=lambda x: x["days_left"]):
            message += (f"  {ri['id']}: {ri['count']}x {ri['type']} "
                       f"expires {ri['expires']} ({ri['days_left']} days)\n")

        print(message)

        # Optionally send via SNS
        # sns.publish(
        #     TopicArn="arn:aws:sns:us-east-1:123456789:ri-alerts",
        #     Subject="Reserved Instances Expiring Soon",
        #     Message=message
        # )

check_expiring_ris()
```

## RIs vs Savings Plans: When to Use Each

| Use Case | Best Option |
|---|---|
| New commitment, want flexibility | Compute Savings Plan |
| Locked into an instance family, want max savings | EC2 Instance Savings Plan |
| Need capacity reservation in a specific AZ | Standard RI (Zonal) |
| Existing RI portfolio, managing renewals | Keep RIs, layer Savings Plans on top |
| Want to sell unused commitments | Standard RI (via Marketplace) |

RIs and Savings Plans can coexist. AWS applies the discount that gives you the best price automatically. If you have both RIs and Savings Plans covering the same usage, the RI discount applies first.

## Selling Unused RIs

If your needs change, you can sell Standard RIs on the RI Marketplace.

```bash
# List an RI for sale
aws ec2 create-reserved-instances-listing \
  --reserved-instances-id ri-xxxxxxxx \
  --instance-count 2 \
  --price-schedules '[
    {"Term": 6, "Price": 500.00, "CurrencyCode": "USD"}
  ]'
```

Note that you need to register as a seller first, and the sale isn't guaranteed - it depends on buyer demand.

## Wrapping Up

Reserved Instances still offer significant savings for predictable EC2 workloads. The key is careful analysis before purchasing: identify instances that have been running consistently, check your current RI coverage, and use AWS recommendations as a starting point. Start with Convertible RIs for flexibility, monitor utilization closely, and set up alerts for expiring commitments. For most new purchases, consider [Savings Plans](https://oneuptime.com/blog/post/reduce-ec2-costs-savings-plans/view) as a simpler alternative, but don't ignore RIs if you need capacity reservations or want to leverage the marketplace.
