# How to Purchase and Apply Azure Reserved VM Instances

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure, Reserved Instances, Virtual Machine, Cost Optimization, Cloud Computing, Budget, FinOps

Description: A practical guide to purchasing Azure Reserved VM Instances to save up to 72% on compute costs with commitment-based pricing.

---

If you have Azure VMs running 24/7 and you know they will be around for a while, you are likely overpaying with pay-as-you-go pricing. Azure Reserved VM Instances (RIs) let you commit to a 1-year or 3-year term in exchange for significant discounts - up to 72% compared to on-demand pricing. The catch is that you are making an upfront commitment, so you need to be strategic about what you reserve.

In this post, I will walk through how reserved instances work, how to purchase them, and how to manage them effectively.

## How Reserved Instances Work

When you purchase a reserved instance, you are not buying a specific VM. You are buying a billing discount that applies to any VM matching certain criteria (VM size, region, and optionally resource group or subscription). Azure automatically matches running VMs to your reservations and applies the discounted rate.

Here is the mental model: you tell Azure "I will be using a Standard_D4s_v5 in East US for the next 3 years," and Azure says "great, here is a 60% discount."

The discount applies to the compute cost only. You still pay separately for storage, networking, and software licenses (like Windows Server).

## Choosing What to Reserve

The most important step is figuring out what to reserve. You want to reserve VMs that are consistently running and unlikely to change.

Start by analyzing your current usage:

```bash
# List all running VMs with their sizes and regions
az vm list \
  --query "[?powerState=='VM running'].{Name:name, Size:hardwareProfile.vmSize, Location:location, RG:resourceGroup}" \
  --show-details \
  --output table
```

Look for patterns:
- VMs that run 24/7 (production servers, databases).
- VM sizes that you use repeatedly.
- Regions where you have a stable presence.

Azure also provides reservation recommendations in the portal under "Cost Management + Billing" > "Reservation recommendations." These recommendations are based on your actual usage over the past 7, 30, or 60 days.

## Savings Comparison

Here is a typical comparison for a Standard_D4s_v5 in East US:

| Pricing Model | Monthly Cost | Annual Cost | Savings vs. Pay-As-You-Go |
|---------------|-------------|-------------|--------------------------|
| Pay-as-you-go | ~$140 | ~$1,680 | Baseline |
| 1-year RI (monthly payments) | ~$88 | ~$1,056 | ~37% |
| 3-year RI (monthly payments) | ~$56 | ~$672 | ~60% |
| 3-year RI (upfront payment) | N/A | ~$630 | ~62% |

The savings scale with commitment length and payment method. Upfront payment gives a slightly better rate than monthly payments.

## Purchasing a Reserved Instance

You can purchase RIs through the Azure portal, PowerShell, CLI, or the REST API. The portal is the most intuitive for your first purchase.

**Through the Azure Portal:**

1. Go to "Reservations" in the Azure portal (search for it in the top search bar).
2. Click "Add" or "Purchase now."
3. Select "Virtual machine" as the product type.
4. Choose your settings:
   - **Scope**: Shared (applies across all subscriptions in your billing account), single subscription, single resource group, or management group.
   - **Region**: The Azure region where the VMs run.
   - **VM size**: The specific VM size to reserve.
   - **Term**: 1 year or 3 years.
   - **Billing frequency**: Pay all upfront, monthly, or upfront plus monthly (for some terms).
   - **Quantity**: How many instances to reserve.
5. Review the pricing and click "Purchase."

**Through the Azure CLI:**

```bash
# Purchase a 1-year reservation for 2x Standard_D4s_v5 in East US
az reservations reservation-order purchase \
  --reservation-order-id "$(uuidgen)" \
  --sku-name Standard_D4s_v5 \
  --location eastus \
  --reserved-resource-type VirtualMachines \
  --billing-scope-id "/subscriptions/{sub-id}" \
  --term P1Y \
  --quantity 2 \
  --applied-scope-type Single \
  --applied-scope "/subscriptions/{sub-id}" \
  --display-name "Prod Web Servers"
```

## Instance Size Flexibility

One of the best features of Azure RIs is instance size flexibility. Within the same VM series, your reservation automatically covers different sizes using a ratio system.

For example, if you purchase a reservation for Standard_D4s_v5 (4 vCPUs), it can also cover:
- 2x Standard_D2s_v5 (2 vCPUs each)
- 1x Standard_D4s_v5 (exactly what you reserved)
- Half of a Standard_D8s_v5 (you would need another reservation to cover the other half)

The ratio is based on vCPU count within the same series. This flexibility means you do not have to re-purchase reservations every time you resize a VM within the same family.

Instance size flexibility is enabled by default for most Linux VMs. For Windows VMs, you need to make sure the "instance size flexibility" option is turned on during purchase.

## Scope Options

The scope determines which VMs the reservation discount applies to:

**Shared scope**: The discount applies to matching VMs across all subscriptions in your enrollment or billing account. This maximizes utilization because any matching VM in any subscription gets the discount.

**Single subscription**: The discount only applies to VMs in the selected subscription.

**Single resource group**: The discount only applies to VMs in the selected resource group.

**Management group**: The discount applies to matching VMs in any subscription within the management group.

I recommend using shared scope in most cases. It maximizes the chance that your reservation gets fully utilized. If you need to allocate costs to specific teams or projects, Azure cost allocation and tagging can handle that separately.

## Viewing Your Reservations

Check your existing reservations and their utilization:

```bash
# List all reservations in your account
az reservations reservation-order list --output table
```

In the Azure portal, navigate to "Reservations" to see a dashboard showing all your reservations, their utilization percentage, and any recommendations for optimization.

## Monitoring Utilization

A reservation that sits unused is wasted money. Monitor utilization regularly:

```bash
# Check reservation utilization for a specific order
az reservations reservation list \
  --reservation-order-id {order-id} \
  --query "[].{Name:name, Utilization:properties.utilization}" \
  --output table
```

In the portal, each reservation shows a utilization percentage. Aim for 100% utilization. If a reservation consistently shows low utilization, consider:

- Exchanging it for a different VM size or region.
- Changing the scope to shared so more VMs can benefit.
- Right-sizing your VMs to match the reserved size.

## Exchanging and Canceling Reservations

Azure offers some flexibility if your needs change:

**Exchanges**: You can exchange a reservation for a different VM size, region, or term. The remaining value of the original reservation is applied to the new purchase. There is no fee for exchanges.

**Cancellations**: You can cancel a reservation and get a prorated refund, minus a 12% early termination fee. There is a lifetime refund limit of $50,000.

```bash
# Exchange a reservation (done through the portal or REST API)
# Navigate to Reservations > Select reservation > Exchange
```

Exchanges are the more flexible option. If you realize you reserved the wrong size, exchange it rather than canceling and re-purchasing.

## Combining RIs with Other Discounts

Reserved instances can be combined with other Azure discounts:

- **Azure Hybrid Benefit**: If you have Windows Server or SQL Server licenses with Software Assurance, you can use them on Azure VMs to save on the software cost. Combined with an RI, you save on both compute and software licensing.
- **Dev/Test pricing**: Azure Dev/Test subscriptions get discounted rates on some services, and RIs stack on top of that.
- **Spot VMs for burst capacity**: Use RIs for your baseline capacity and Spot VMs for burst capacity during peak loads.

## Best Practices for Reserved Instances

1. **Start with your always-on workloads.** Reserve VMs that run 24/7 first - these give you the highest return on commitment.
2. **Use 3-year terms for stable workloads.** The savings difference between 1-year and 3-year is substantial.
3. **Start small and expand.** Purchase a few reservations, monitor utilization, and buy more as you gain confidence.
4. **Review monthly.** Set a monthly reminder to check reservation utilization and adjust as needed.
5. **Use shared scope.** This maximizes utilization across your organization.
6. **Take advantage of instance size flexibility.** Buy reservations at the size you think you will need, knowing you can cover smaller sizes automatically.
7. **Plan for changes.** Use 1-year terms for workloads that might change, and 3-year terms for workloads you are confident about.

## Wrapping Up

Azure Reserved VM Instances are one of the easiest ways to reduce your cloud spending. If you have VMs running steadily, the math almost always works in your favor - even a 1-year commitment typically saves 30-40%. The key is to analyze your usage first, reserve what you know you will use, and monitor utilization to make sure you are getting the full benefit. Combined with instance size flexibility and shared scope, reservations are a powerful and flexible cost optimization tool.
