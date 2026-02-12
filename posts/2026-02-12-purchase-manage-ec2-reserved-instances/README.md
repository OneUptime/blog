# How to Purchase and Manage EC2 Reserved Instances

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, EC2, Reserved Instances, Cost Optimization, Cloud Billing

Description: A complete guide to purchasing, managing, and maximizing savings with EC2 Reserved Instances including payment options and modification strategies.

---

If you have steady-state EC2 workloads that run 24/7, Reserved Instances (RIs) can save you up to 72% compared to On-Demand pricing. The concept is simple: you commit to using a specific instance type for 1 or 3 years, and AWS gives you a discounted rate in return.

But the details matter. Choosing the wrong RI type, payment option, or scope can leave savings on the table or lock you into capacity you don't need. Let's break it all down.

## How Reserved Instances Work

Reserved Instances aren't separate instances - they're a billing discount applied to matching On-Demand instances in your account. When you buy an RI, you're telling AWS "I commit to running this instance type for the next 1-3 years." In exchange, any matching On-Demand instance in your account gets billed at the reduced rate.

If you're running an m5.large in us-east-1 and you buy a matching RI, that instance's hourly cost drops automatically. No changes to the instance itself.

## RI Offering Classes

There are two classes of Reserved Instances:

**Standard RIs** - Highest discount (up to 72%). You can modify the AZ, scope, and network platform. You can sell them on the RI Marketplace if you don't need them anymore.

**Convertible RIs** - Lower discount (up to 66%). You can exchange them for different instance types, families, OS types, and tenancy. More flexibility, less savings.

Pick Standard RIs when you're confident in your instance type choice. Pick Convertible RIs when you think you might need to change instance families during the term.

## Payment Options

Each RI comes with three payment options that affect the total discount:

| Payment Option | Upfront Cost | Monthly Cost | Discount Level |
|----------------|-------------|-------------|----------------|
| All Upfront    | Full amount | $0          | Highest        |
| Partial Upfront| ~50% upfront| Reduced monthly | Medium     |
| No Upfront     | $0          | Reduced monthly | Lowest     |

Here's a real example for an m5.large in us-east-1 (1-year term):

```
On-Demand:      $0.096/hr  = $840.96/year
All Upfront:    $505/year   = $0.058/hr  (40% savings)
Partial Upfront: $265 + $22.63/mo = $536.56/year (36% savings)
No Upfront:     $0 + $49.92/mo = $599.04/year (29% savings)
```

All Upfront gives the best savings, but No Upfront preserves cash flow. Choose based on your financial situation.

## Purchasing Reserved Instances via CLI

Before purchasing, check what's available for your desired configuration.

This command shows available RI offerings for a specific instance type:

```bash
# List available RI offerings
aws ec2 describe-reserved-instances-offerings \
  --instance-type m5.large \
  --product-description "Linux/UNIX" \
  --instance-tenancy default \
  --offering-type "Partial Upfront" \
  --filters Name=duration,Values=31536000 \
  --query 'ReservedInstancesOfferings[].{
    ID:ReservedInstancesOfferingId,
    Type:InstanceType,
    AZ:AvailabilityZone,
    Price:FixedPrice,
    Usage:UsagePrice,
    Duration:Duration
  }' \
  --output table
```

Once you've found the right offering, purchase it:

```bash
# Purchase a Reserved Instance
aws ec2 purchase-reserved-instances-offering \
  --reserved-instances-offering-id offering-id-here \
  --instance-count 5
```

Be careful with this command - RI purchases are non-refundable commitments. Double-check the offering ID, count, and total cost before running it.

## Scoping: Regional vs Zonal

RIs come in two scopes:

**Regional** (recommended) - The discount applies to any matching instance in the entire region, across all AZs. Also provides a capacity reservation benefit region-wide.

**Zonal** - The discount and capacity reservation apply only to a specific AZ. Use this only if you need guaranteed capacity in a specific AZ.

Regional RIs are almost always the better choice because they're more flexible. If you move instances between AZs, the discount follows.

```bash
# Check your existing RIs and their scope
aws ec2 describe-reserved-instances \
  --filters Name=state,Values=active \
  --query 'ReservedInstances[].{
    ID:ReservedInstancesId,
    Type:InstanceType,
    Count:InstanceCount,
    Scope:Scope,
    State:State,
    End:End
  }' \
  --output table
```

## Analyzing Your Usage Before Purchasing

Don't buy RIs blindly. Analyze your actual usage patterns first.

Use AWS Cost Explorer to see your On-Demand usage over the past 30-60 days:

```bash
# Get RI purchase recommendations from Cost Explorer
aws ce get-reservation-purchase-recommendation \
  --service "Amazon Elastic Compute Cloud - Compute" \
  --term-in-years ONE_YEAR \
  --payment-option PARTIAL_UPFRONT \
  --lookback-period-in-days SIXTY_DAYS
```

This gives you AWS's own recommendations based on your actual usage. It'll tell you which instance types to reserve, how many, and the expected savings.

You can also manually check your running instance distribution:

```bash
# Count running instances by type
aws ec2 describe-instances \
  --filters Name=instance-state-name,Values=running \
  --query 'Reservations[].Instances[].InstanceType' \
  --output text | tr '\t' '\n' | sort | uniq -c | sort -rn
```

Only reserve instances that have been running consistently for at least 30 days. Anything with variable usage should stay On-Demand or use Spot.

## Modifying Reserved Instances

Standard RIs can be modified in certain ways without exchanging them:

- Change the AZ within the same region
- Change the scope (regional to zonal or vice versa)
- Split one RI into smaller instance sizes within the same family
- Merge smaller RIs into a larger one within the same family

This command modifies an existing RI to change its AZ:

```bash
# Modify RI scope or AZ
aws ec2 modify-reserved-instances \
  --reserved-instances-ids ri-1234567890abcdef0 \
  --target-configurations '{
    "AvailabilityZone": "us-east-1b",
    "InstanceCount": 5
  }'
```

Instance size flexibility is powerful. If you have a regional RI for m5.large (1 unit), it can also cover two m5.medium instances (0.5 units each) or half of an m5.xlarge (2 units). AWS normalizes this automatically using a size-flexible weighting system.

## Exchanging Convertible RIs

Convertible RIs can be exchanged for different configurations. The key rule: the new RI must have an equal or greater value.

```bash
# Exchange a Convertible RI for a different type
aws ec2 accept-reserved-instances-exchange-quote \
  --reserved-instance-ids ri-1234567890abcdef0 \
  --target-configurations ReservedInstancesOfferingId=offering-id-here
```

This is useful when you're migrating from one instance generation to the next (e.g., m5 to m6i) or changing your workload requirements.

## Selling RIs on the Marketplace

If you no longer need your Standard RIs, you can sell them on the Reserved Instance Marketplace:

```bash
# List an RI for sale on the marketplace
aws ec2 create-reserved-instances-listing \
  --reserved-instances-id ri-1234567890abcdef0 \
  --instance-count 3 \
  --price-schedules CurrencyCode=USD,Price=200.0
```

You'll get the remaining value back (minus a 12% service fee). This is much better than letting unused RIs sit idle.

## Monitoring RI Utilization

AWS provides utilization reports to help you track whether your RIs are actually being used:

```bash
# Check RI utilization
aws ce get-reservation-utilization \
  --time-period Start=2026-01-01,End=2026-02-01 \
  --group-by Type=DIMENSION,Key=INSTANCE_TYPE
```

Aim for 95%+ utilization. Anything below 80% means you're paying for capacity you're not using, and you should consider modifying or selling those RIs.

## RI Best Practices

1. **Start with Cost Explorer recommendations** - Let AWS analyze your actual usage
2. **Buy regional RIs** - They're more flexible than zonal
3. **Start with 1-year terms** - Less risk than 3-year commitments
4. **Don't reserve everything** - Keep 20-30% On-Demand for flexibility
5. **Monitor utilization monthly** - Sell or modify underutilized RIs
6. **Consider Convertible for uncertain workloads** - The flexibility premium is worth it
7. **Stack with Spot** - Use RIs for baseline, Spot for burst capacity

## Summary

Reserved Instances are one of the most effective ways to reduce your AWS bill for steady-state workloads. The key is doing the analysis first - understand your usage patterns, start conservative with 1-year regional RIs, and monitor utilization over time. For workloads where you're less certain about long-term instance type needs, consider [EC2 Savings Plans](https://oneuptime.com/blog/post/ec2-savings-plans-vs-reserved-instances/view) as a more flexible alternative.
