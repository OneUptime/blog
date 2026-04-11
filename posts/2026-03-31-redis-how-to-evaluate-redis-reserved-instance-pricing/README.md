# How to Evaluate Redis Reserved Instance Pricing

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Cloud, Cost Optimization, AWS ElastiCache, Reserved Instances, Pricing

Description: Evaluate Redis reserved instance pricing on AWS ElastiCache and Azure Cache for Redis to determine when reservations make financial sense versus on-demand pricing.

---

## What Are Reserved Instances for Redis

Reserved instances (RIs) for managed Redis services allow you to pre-commit to a specific instance size and region for 1 or 3 years in exchange for significant discounts (typically 30-60%) compared to on-demand pricing.

This applies to:
- **AWS ElastiCache Reserved Nodes** - for ElastiCache for Redis
- **Azure Cache for Redis** - reserved capacity
- **Google Cloud Memorystore** - committed use discounts

## When Reserved Instances Make Sense

Reserved instances make financial sense when:
1. You run Redis continuously (24/7) for production workloads
2. Your instance size is stable and unlikely to change significantly
3. You have budget certainty to commit upfront
4. You plan to run the same workload for at least 1 year

They do NOT make sense for:
- Development and testing environments
- Workloads with highly variable resource needs
- Short-term projects
- Instances that will be resized within a year

## AWS ElastiCache Reserved Nodes

### Pricing Options

AWS offers three options for ElastiCache reserved nodes:

| Option | Upfront Payment | Term | Discount vs On-Demand |
|--------|-----------------|------|----------------------|
| No Upfront | None | 1 or 3 year | 30-40% |
| Partial Upfront | ~50% | 1 or 3 year | 40-50% |
| All Upfront | 100% | 1 or 3 year | 45-60% |

### Calculating Break-Even Point

```python
def calculate_ri_savings(
    on_demand_hourly: float,
    ri_upfront: float,
    ri_monthly: float,
    term_years: int = 1,
    hours_per_month: int = 730
):
    """
    Calculate total cost and savings for reserved vs on-demand.

    on_demand_hourly: on-demand price per hour (USD)
    ri_upfront:       upfront payment for RI (USD)
    ri_monthly:       monthly fee after upfront (USD)
    term_years:       reservation term
    """
    total_months = term_years * 12

    # On-demand total cost
    on_demand_total = on_demand_hourly * hours_per_month * total_months

    # Reserved instance total cost
    ri_total = ri_upfront + (ri_monthly * total_months)

    # Savings
    savings = on_demand_total - ri_total
    savings_pct = (savings / on_demand_total) * 100

    # Break-even month
    monthly_savings = (on_demand_hourly * hours_per_month) - ri_monthly
    if ri_upfront > 0 and monthly_savings > 0:
        breakeven_months = ri_upfront / monthly_savings
    else:
        breakeven_months = 0

    return {
        'on_demand_total': on_demand_total,
        'ri_total': ri_total,
        'savings': savings,
        'savings_pct': round(savings_pct, 1),
        'breakeven_months': round(breakeven_months, 1)
    }

# Example: cache.r6g.large in us-east-1
# On-demand: ~$0.166/hr
# 1-year All Upfront: ~$730 upfront, $0/mo
# 1-year No Upfront: $0 upfront, ~$0.103/hr * 730 hrs = ~$75.19/mo

all_upfront = calculate_ri_savings(
    on_demand_hourly=0.166,
    ri_upfront=730,
    ri_monthly=0,
    term_years=1
)

no_upfront = calculate_ri_savings(
    on_demand_hourly=0.166,
    ri_upfront=0,
    ri_monthly=75.19,
    term_years=1
)

print("All Upfront 1-year:")
for k, v in all_upfront.items():
    print(f"  {k}: {v}")

print("\nNo Upfront 1-year:")
for k, v in no_upfront.items():
    print(f"  {k}: {v}")
```

### AWS CLI to List Reserved Node Offerings

```bash
# List available ElastiCache reserved node offerings
aws elasticache describe-reserved-cache-nodes-offerings \
  --cache-node-type cache.r6g.large \
  --product-description "Redis" \
  --query 'ReservedCacheNodesOfferings[*].{ID:ReservedCacheNodesOfferingId, Type:OfferingType, Duration:Duration, HourlyPrice:UsagePrice, UpfrontPrice:FixedPrice}' \
  --output table
```

### Purchase a Reserved Node

```bash
aws elasticache purchase-reserved-cache-nodes-offering \
  --reserved-cache-nodes-offering-id OFFERING-ID-HERE \
  --cache-node-count 1 \
  --reserved-cache-node-id my-redis-reserved-node
```

### Check Existing Reservations

```bash
aws elasticache describe-reserved-cache-nodes \
  --query 'ReservedCacheNodes[*].{ID:ReservedCacheNodeId, Type:CacheNodeType, State:State, Start:StartTime, Duration:Duration}' \
  --output table
```

## Azure Cache for Redis Reserved Capacity

Azure offers reserved capacity for Azure Cache for Redis via the Azure portal or Azure CLI:

```bash
# List available Redis reserved capacity offers
az reservations catalog show \
  --reserved-resource-type "RedisCache" \
  --location eastus \
  --query '[*].{Name:name, Sku:properties.skuProperties}'

# Purchase reserved capacity
az reservations reservation-order purchase \
  --reservation-order-id "$(uuidgen)" \
  --reserved-resource-type "RedisCache" \
  --sku "C2" \
  --location "eastus" \
  --applied-scope-type "Shared" \
  --billing-scope "/subscriptions/YOUR-SUBSCRIPTION-ID" \
  --term "P1Y" \
  --quantity 1
```

## Cost Analysis Framework

Before purchasing reservations, analyze your usage:

```bash
# AWS: Check current instance sizes
aws elasticache describe-cache-clusters \
  --query 'CacheClusters[*].{ID:CacheClusterId, Type:CacheNodeType, Status:CacheClusterStatus}' \
  --output table

# Check utilization via CloudWatch
aws cloudwatch get-metric-statistics \
  --namespace AWS/ElastiCache \
  --metric-name FreeableMemory \
  --dimensions Name=CacheClusterId,Value=my-cluster \
  --start-time 2026-01-01T00:00:00Z \
  --end-time 2026-03-31T00:00:00Z \
  --period 86400 \
  --statistics Average \
  --output table
```

If `FreeableMemory` is consistently high, you may be over-provisioned and should downsize before reserving.

## Decision Checklist

Before purchasing reserved instances:

- [ ] The instance has been running for at least 3 months in production
- [ ] Memory usage is stable (< 70% on average)
- [ ] CPU usage does not suggest a need to resize
- [ ] No major architecture changes planned within the reservation term
- [ ] Cash flow can support upfront payment (if choosing All Upfront)
- [ ] Compared 1-year vs 3-year ROI (3-year has better discount but less flexibility)

## Summary

Reserved instances for Redis reduce costs by 30-60% compared to on-demand pricing but require a 1 or 3-year commitment. Use the break-even calculation to determine when reservations pay off, audit your current instance utilization before reserving to avoid over-committing, and check instance sizes are stable before locking in. For AWS ElastiCache, use the CLI to compare offering prices and purchase via `aws elasticache purchase-reserved-cache-nodes-offering`.
