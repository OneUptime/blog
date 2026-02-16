# How to Use Azure Reserved Instances to Save Up to 72% on Compute Costs

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure, Reserved Instances, Cost Optimization, Compute, FinOps, Cloud Costs, Budgeting

Description: Learn how to use Azure Reserved Instances effectively to reduce compute costs by up to 72% with practical purchasing strategies.

---

Azure Reserved Instances (RIs) are one of the most straightforward ways to save money on Azure compute. The concept is simple: you commit to using a specific VM size for 1 or 3 years, and in exchange, Microsoft gives you a significant discount compared to pay-as-you-go pricing. The savings range from 30% to 72% depending on the term length and VM type.

But buying the wrong reservations can waste money instead of saving it. In this post, I will walk through how to analyze your usage, pick the right reservations, and manage them effectively.

## How Reserved Instances Work

When you buy a reservation, you are not buying a specific VM. You are buying a billing discount that automatically applies to any matching VM in your enrollment or subscription. If you buy a reservation for Standard_D4s_v5 in East US, any running D4s_v5 VM in East US will get the discount applied to its billing.

Key points:

- Reservations cover the compute cost only (not OS licensing, storage, or networking).
- The discount applies automatically - you do not need to tag or assign VMs.
- You pay upfront (all upfront, monthly, or with no upfront payment) for the commitment period.
- If you do not use the reservation, you still pay for it. There is no refund for unused hours (with some exceptions).

## Step 1: Analyze Your Current VM Usage

Before buying reservations, you need to understand which VMs run consistently. Reservations only make sense for VMs that run 24/7 or at least for a predictable, significant portion of the month.

```bash
# List all running VMs with their sizes and locations
az vm list \
  --query "[?powerState=='VM running'].{Name: name, Size: hardwareProfile.vmSize, Location: location, RG: resourceGroup}" \
  --show-details \
  --output table
```

Group the VMs by size and location to see where you have the most consistent usage:

```bash
# Count VMs by size and location
az vm list \
  --show-details \
  --query "[?powerState=='VM running'].{Size: hardwareProfile.vmSize, Location: location}" \
  --output json | python3 -c "
import json, sys, collections
vms = json.load(sys.stdin)
counts = collections.Counter((v['Size'], v['Location']) for v in vms)
for (size, loc), count in counts.most_common():
    print(f'{size:30s} {loc:20s} {count:5d}')
"
```

## Step 2: Use Azure Advisor RI Recommendations

Azure Advisor analyzes your usage over the past 30 days and recommends reservations that would save you the most money:

```bash
# Get reservation purchase recommendations from Azure Advisor
az advisor recommendation list \
  --category Cost \
  --query "[?shortDescription.problem=='Consider virtual machine reserved instance to save over your on-demand costs'].{VM: extendedProperties.vmSize, Region: extendedProperties.region, Quantity: extendedProperties.qty, MonthlySavings: extendedProperties.savingsAmount}" \
  --output table
```

Advisor recommendations are a good starting point, but they are based on the last 30 days. If your workload is seasonal or you are planning changes, factor that in.

## Step 3: Use the Azure Reservation Purchase Experience

The Azure portal has a built-in tool for analyzing reservation recommendations. Go to **Reservations** in the portal and click **Add**. Select **Virtual machine** and choose your parameters:

- **Scope**: Shared (applies to all subscriptions in the enrollment) or Single subscription
- **Region**: Must match where your VMs run
- **VM size**: The exact SKU you want to reserve
- **Term**: 1-year or 3-year

The tool shows you:

- Your average usage for the selected VM size
- Estimated savings for different quantities
- Break-even utilization percentage

## Step 4: Understand Instance Size Flexibility

With instance size flexibility, a reservation for one VM size can apply to other sizes in the same series. For example, a reservation for Standard_D4s_v5 (4 vCPUs) can cover two Standard_D2s_v5 VMs (2 vCPUs each) instead.

This flexibility uses a ratio system:

| VM Size | Ratio |
|---------|-------|
| Standard_D2s_v5 | 1 |
| Standard_D4s_v5 | 2 |
| Standard_D8s_v5 | 4 |
| Standard_D16s_v5 | 8 |

So one D8s_v5 reservation can cover four D2s_v5 VMs, or two D4s_v5 VMs, or any other combination that adds up to the ratio.

**This is huge for flexibility.** It means if you resize VMs, your reservations still apply. Buy at the series level you need, and the flexibility will sort out the rest.

```bash
# Check the instance size flexibility group for a VM series
az reservations catalog show \
  --subscription-id <sub-id> \
  --reserved-resource-type VirtualMachines \
  --location eastus \
  --query "[?contains(skuName, 'Standard_D') && contains(skuName, 's_v5')]" \
  --output table
```

## Step 5: Choose the Right Term and Payment Option

**1-year term**: 30-40% savings. Lower commitment, easier to adjust. Good for workloads you are confident about for the next year.

**3-year term**: 55-72% savings. Bigger discount, but longer lock-in. Best for stable, long-running workloads like production databases and core infrastructure.

**Payment options**:

- **All upfront**: Highest discount. You pay the full amount immediately.
- **Monthly payments**: Slightly lower discount. Pay in monthly installments over the term. No upfront cost.
- **No upfront**: Lowest discount of the three options, but no initial cash outlay.

For most organizations, monthly payments strike the right balance. The discount difference between all-upfront and monthly is usually small (1-3%).

## Step 6: Purchase the Reservation

```bash
# Purchase a reservation via Azure CLI
az reservations reservation-order purchase \
  --reservation-order-id <order-id> \
  --sku Standard_D4s_v5 \
  --location eastus \
  --quantity 5 \
  --term P1Y \
  --billing-scope /subscriptions/<sub-id> \
  --display-name "Production D4s_v5 East US" \
  --applied-scope-type Shared
```

I recommend starting with **Shared scope** unless you have a specific reason to restrict the reservation to a single subscription. Shared scope maximizes utilization because the discount can apply to any matching VM across all subscriptions in your enrollment.

## Step 7: Monitor Reservation Utilization

After purchasing, monitor your reservation utilization to make sure you are getting your money's worth. If utilization drops below 100%, you are paying for capacity you are not using.

```bash
# Check reservation utilization
az consumption reservation-summary list \
  --reservation-order-id <order-id> \
  --grain daily \
  --start-date 2026-01-01 \
  --end-date 2026-02-16 \
  --output table
```

In the Azure portal, go to **Reservations** and click on your reservation to see a utilization chart. Azure also sends email notifications when utilization drops below 80%.

If utilization is consistently low, you have a few options:

- **Exchange**: Swap the reservation for a different size or region (within the same or lesser value).
- **Refund**: Return the reservation for a prorated refund. There is a $50,000 rolling 12-month refund limit.
- **Modify scope**: Change from single subscription to shared scope to increase the pool of VMs that can use the discount.

## Step 8: Combine with Other Savings

Reserved Instances stack with other discounts:

- **Azure Hybrid Benefit (AHUB)**: If you have Windows Server or SQL Server licenses with Software Assurance, you can save an additional 40%+ on Windows VM costs. Combined with RIs, total savings can exceed 80%.
- **Dev/Test pricing**: Subscriptions enrolled in dev/test pricing get discounted Windows rates. Combine with RIs for maximum savings.
- **Spot VMs**: Use Spot for fault-tolerant workloads and RIs for stable workloads. Different tools for different jobs.

```bash
# Enable Azure Hybrid Benefit on a VM (requires existing Windows licenses)
az vm update \
  --resource-group myResourceGroup \
  --name myVM \
  --set licenseType=Windows_Server
```

## Cost Savings Comparison

Here is a rough comparison for a Standard_D4s_v5 in East US (prices are approximate):

| Pricing Model | Monthly Cost | Savings vs Pay-as-you-go |
|--------------|-------------|------------------------|
| Pay-as-you-go | $140 | 0% |
| 1-year RI | $90 | 36% |
| 3-year RI | $55 | 61% |
| 3-year RI + AHUB | $30 | 79% |

These numbers vary by VM size and region, but the pattern holds.

## Common Mistakes to Avoid

1. **Buying reservations for dev/test VMs that are not running 24/7.** Only reserve VMs that run consistently.
2. **Buying the wrong region.** A reservation for East US does not apply to VMs in West US.
3. **Not using instance size flexibility.** Buy for the series, not for one specific size.
4. **Setting single-subscription scope when shared would be better.** Shared scope almost always gives higher utilization.
5. **Forgetting to monitor utilization.** Check monthly and adjust as needed.

## Summary

Azure Reserved Instances are the easiest way to save 30-72% on compute costs for stable workloads. Start by analyzing which VMs run consistently, use Advisor recommendations as a guide, and buy reservations with shared scope and instance size flexibility enabled. Monitor utilization monthly and exchange or refund reservations that are underutilized. Combine with Azure Hybrid Benefit for maximum savings. The key is to be deliberate about what you reserve - do not over-commit, but do not leave easy savings on the table either.
