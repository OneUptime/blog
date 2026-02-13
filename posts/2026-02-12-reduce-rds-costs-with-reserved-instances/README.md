# How to Reduce RDS Costs with Reserved Instances

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, RDS, Cost Optimization, Reserved Instances, Database

Description: A practical guide to saving up to 72% on Amazon RDS costs by using Reserved Instances, including how to choose the right term, payment option, and instance type.

---

Running databases on Amazon RDS is convenient, but the on-demand pricing adds up fast. A single db.r6g.xlarge instance running 24/7 costs roughly $4,300 per year in us-east-1. Multiply that by a few environments and a handful of read replicas, and you're looking at a serious chunk of your AWS bill.

Reserved Instances (RIs) are the most straightforward way to reduce those costs. They don't change anything about how your databases run - same instance, same performance, same availability. You're simply committing to use a specific instance type for one or three years in exchange for a discount of up to 72%.

## How RDS Reserved Instances Work

An RDS Reserved Instance is a billing discount, not a physical resource. When you purchase an RI, AWS matches it against running on-demand instances that have the same attributes: engine, instance type, region, and deployment option (Single-AZ or Multi-AZ).

The discount applies automatically. You don't need to tag instances or modify anything. If you have a matching on-demand instance running, the RI pricing kicks in.

There are three payment options:

- **All Upfront** - Pay the entire cost when you purchase. Gives you the biggest discount.
- **Partial Upfront** - Pay some upfront, the rest monthly. A middle ground.
- **No Upfront** - No upfront payment, just a lower monthly rate than on-demand. Least savings but most flexible for cash flow.

And two term lengths:

- **1-year term** - Savings of 25-40% over on-demand.
- **3-year term** - Savings of 40-72% over on-demand.

## Calculating Your Savings

Before you purchase anything, you need to know what you're running. Here's how to get a list of all your RDS instances and their types:

```bash
# List all RDS instances with their engine, class, and Multi-AZ status
aws rds describe-db-instances \
  --query "DBInstances[].{
    ID: DBInstanceIdentifier,
    Engine: Engine,
    Class: DBInstanceClass,
    MultiAZ: MultiAZ,
    Status: DBInstanceStatus
  }" \
  --output table
```

Now let's look at actual numbers. Here's a comparison for a db.r6g.xlarge MySQL instance in us-east-1:

| Payment Option | 1-Year Term | 3-Year Term |
|---|---|---|
| On-Demand | $4,307/yr | $12,921 (3yr) |
| All Upfront | $2,715/yr (37% off) | $5,844 (55% off) |
| Partial Upfront | $2,776/yr (35% off) | $6,100 (53% off) |
| No Upfront | $2,890/yr (33% off) | $6,480 (50% off) |

The sweet spot for most organizations is the 1-year All Upfront option. It provides meaningful savings without locking you in for three years, which matters because instance requirements change as your application evolves.

## Step-by-Step Purchase Process

First, identify your stable workloads - databases that have been running consistently for at least a couple of months and will continue running. Don't buy RIs for instances you might shut down or resize soon.

Check your existing reservations to avoid double-buying:

```bash
# List existing RDS Reserved Instances
aws rds describe-reserved-db-instances \
  --query "ReservedDBInstances[].{
    ID: ReservedDBInstanceId,
    Class: DBInstanceClass,
    Engine: ProductDescription,
    MultiAZ: MultiAZ,
    State: State,
    Start: StartTime,
    Duration: Duration
  }" \
  --output table
```

Then browse available offerings:

```bash
# Find available Reserved Instance offerings for MySQL db.r6g.xlarge
aws rds describe-reserved-db-instances-offerings \
  --db-instance-class db.r6g.xlarge \
  --product-description mysql \
  --duration 31536000 \
  --query "ReservedDBInstancesOfferings[].{
    OfferingID: ReservedDBInstancesOfferingId,
    Class: DBInstanceClass,
    Duration: Duration,
    FixedPrice: FixedPrice,
    RecurringPrice: RecurringCharges[0].RecurringChargeAmount,
    MultiAZ: MultiAZ,
    OfferingType: OfferingType
  }" \
  --output table
```

Once you've identified the right offering:

```bash
# Purchase the Reserved Instance (replace with your offering ID)
aws rds purchase-reserved-db-instances-offering \
  --reserved-db-instances-offering-id your-offering-id-here \
  --db-instance-count 1
```

## Using Size Flexibility

One of the best features of RDS RIs is size flexibility for certain engine types. When you buy an RI for a specific instance size, it can apply to different sizes within the same instance family. AWS uses a normalization factor system.

Here's how the normalization works:

| Instance Size | Normalization Factor |
|---|---|
| db.r6g.large | 2 |
| db.r6g.xlarge | 4 |
| db.r6g.2xlarge | 8 |
| db.r6g.4xlarge | 16 |

So if you buy one db.r6g.2xlarge RI (factor 8), it can cover two db.r6g.xlarge instances (factor 4 each) or four db.r6g.large instances (factor 2 each). This gives you room to resize instances without wasting your reservation.

Size flexibility applies to MySQL, MariaDB, PostgreSQL, and Oracle (BYOL) engines. It does not apply to SQL Server or Multi-AZ deployments.

## Automating RI Utilization Monitoring

Buying RIs is only half the battle. You need to track utilization to make sure you're actually getting value from them. An unused RI is worse than on-demand since you're paying regardless.

Here's a Python script that checks RI utilization:

```python
import boto3
from datetime import datetime, timedelta

def check_ri_utilization():
    ce = boto3.client('ce')

    # Check RI utilization for the past 30 days
    end_date = datetime.now().strftime('%Y-%m-%d')
    start_date = (datetime.now() - timedelta(days=30)).strftime('%Y-%m-%d')

    response = ce.get_reservation_utilization(
        TimePeriod={
            'Start': start_date,
            'End': end_date
        },
        GroupBy=[
            {
                'Type': 'DIMENSION',
                'Key': 'SUBSCRIPTION_ID'
            }
        ],
        Filter={
            'Dimensions': {
                'Key': 'SERVICE',
                'Values': ['Amazon Relational Database Service']
            }
        }
    )

    print(f"{'Subscription ID':<40} {'Utilization %':<15} {'Savings':<15}")
    print("-" * 70)

    for group in response['UtilizationsByTime'][0]['Groups']:
        sub_id = group['Attributes']['subscription_id'][:38]
        utilization = group['Utilization']['UtilizationPercentage']
        savings = group['Utilization']['NetRISavings']
        print(f"{sub_id:<40} {utilization:<15} ${savings:<15}")

check_ri_utilization()
```

## When NOT to Use Reserved Instances

RIs aren't always the right choice. Here are situations where you should stick with on-demand:

**Variable workloads.** If a database only runs during business hours or gets spun up temporarily for testing, on-demand makes more sense. Consider [scheduling non-production resources](https://oneuptime.com/blog/post/2026-02-12-schedule-non-production-resources-to-save-costs/view) instead.

**Rapidly changing requirements.** If you're actively migrating databases, changing engines, or testing new instance types, lock-in is risky.

**Short-term projects.** If the database will only exist for six months, a 1-year RI commitment doesn't make sense.

**Small instances.** The absolute dollar savings on a db.t3.micro are minimal. Focus your RI purchases on your largest, most expensive instances first.

## Building an RI Purchase Strategy

Here's a practical approach that works well for most teams:

1. **Start with your biggest databases.** Sort by monthly cost and focus on the top 5-10 instances. That's where the most savings are.

2. **Use 1-year terms first.** Until you're confident in your long-term architecture, avoid 3-year commitments. The per-year discount difference between 1 and 3 years is less dramatic than the risk of being stuck.

3. **Review quarterly.** Set a calendar reminder to review RI coverage, utilization, and upcoming expirations every three months.

4. **Use AWS Cost Explorer RI recommendations.** AWS provides specific recommendations based on your actual usage:

```bash
# Get RI purchase recommendations from Cost Explorer
aws ce get-reservation-purchase-recommendation \
  --service "Amazon Relational Database Service" \
  --term-in-years ONE_YEAR \
  --payment-option ALL_UPFRONT \
  --lookback-period-in-days SIXTY_DAYS
```

5. **Consider the RI Marketplace.** If your needs change, you can sell unused RIs on the AWS Reserved Instance Marketplace. You won't get the full value back, but it's better than letting them sit unused.

## Combining RIs with Other Savings

Reserved Instances work best as part of a broader cost optimization strategy. Pair them with:

- **Right-sizing** - Make sure you're on the right instance type before committing. Use CloudWatch metrics to check CPU and memory utilization over the past month.
- **Aurora Serverless** - For databases with unpredictable workloads, Aurora Serverless v2 can scale to zero and might be cheaper than even reserved pricing.
- **Read replica optimization** - Only maintain read replicas you actually need. Each replica is a separate instance that needs its own RI.

For the full picture on AWS cost reduction, take a look at our guide on [creating a cost optimization strategy for AWS](https://oneuptime.com/blog/post/2026-02-12-create-a-cost-optimization-strategy-for-aws/view).

## Key Takeaways

RDS Reserved Instances are one of the most reliable ways to reduce your AWS database costs. The discounts are substantial - 33% to 72% depending on your commitment level. Start with your most expensive, most stable instances, use 1-year terms until you're confident, and monitor utilization to make sure your investment is paying off. The whole process takes about an hour to set up and can save thousands of dollars per year.
