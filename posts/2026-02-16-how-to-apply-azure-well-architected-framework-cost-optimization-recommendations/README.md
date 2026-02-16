# How to Apply Azure Well-Architected Framework Cost Optimization Recommendations

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure, Well-Architected Framework, Cost Optimization, Cloud Costs, FinOps, Azure Advisor, Reserved Instances

Description: A practical guide to applying Azure Well-Architected Framework cost optimization recommendations to reduce cloud spend without sacrificing performance.

---

Cloud bills have a way of creeping up. You deploy a few extra VMs for a project, forget to clean up a dev environment, and suddenly your Azure invoice is 40% higher than last quarter. The Azure Well-Architected Framework cost optimization pillar gives you a systematic approach to finding and fixing these kinds of waste.

I have worked with teams whose Azure spend dropped by 30-50% after properly applying WAF cost optimization recommendations. The savings are usually there. You just need to know where to look and have the discipline to act on what you find.

## Understanding the Cost Optimization Pillar

The cost optimization pillar is built around a simple idea: you should only pay for what you need, when you need it. That sounds obvious, but in practice it requires ongoing attention to resource sizing, commitment discounts, architecture patterns, and operational habits.

The pillar breaks down into several areas: design for cost, monitoring and analytics, resource optimization, rate optimization, and organizational alignment. Each area has specific recommendations that you evaluate against your current environment.

## Running the Cost Assessment

Start with Azure Advisor. It provides cost recommendations out of the box, including right-sizing suggestions for VMs, idle resource identification, and reservation purchase recommendations. But Advisor only scratches the surface. The full WAF cost optimization assessment requires a deeper analysis.

Navigate to the Well-Architected Assessment in the Azure portal and work through the cost optimization questions. These cover how you track spending, whether you have budgets and alerts in place, how you handle dev/test environments, and whether you are using commitment discounts effectively.

## Right-Sizing Virtual Machines

VM right-sizing is almost always the biggest quick win. Most teams overprovision VMs because they do not have good data on actual resource utilization. Azure Monitor metrics tell the real story.

```bash
# Get average CPU utilization for all VMs in a resource group over the past 30 days
# VMs consistently below 20% CPU are candidates for downsizing
az monitor metrics list \
  --resource "/subscriptions/{sub-id}/resourceGroups/{rg}/providers/Microsoft.Compute/virtualMachines/{vm-name}" \
  --metric "Percentage CPU" \
  --interval PT1H \
  --aggregation Average \
  --start-time 2026-01-16T00:00:00Z \
  --end-time 2026-02-16T00:00:00Z \
  -o table
```

Look for VMs with average CPU utilization below 20% and peak utilization below 50%. These are strong candidates for downsizing to a smaller SKU. A D4s_v5 running at 15% average CPU could probably be a D2s_v5, cutting compute cost in half.

Do the same analysis for memory. Some workloads are memory-bound rather than CPU-bound, so you need both data points before making sizing decisions.

## Eliminating Idle and Orphaned Resources

Orphaned resources are one of the most common sources of waste. These include unattached managed disks, unused public IP addresses, empty App Service plans, and network interfaces that are no longer associated with a VM.

Here is how to find some of the most common orphaned resources.

```bash
# Find unattached managed disks - these cost money even when not connected to a VM
az disk list --query "[?managedBy==null].{name:name, resourceGroup:resourceGroup, diskSizeGb:diskSizeGb, sku:sku.name}" -o table

# Find unused public IP addresses
az network public-ip list --query "[?ipConfiguration==null].{name:name, resourceGroup:resourceGroup, sku:sku.name}" -o table

# Find empty App Service plans (no apps deployed)
az appservice plan list --query "[?numberOfSites==\`0\`].{name:name, resourceGroup:resourceGroup, sku:sku.name}" -o table
```

I once found a client with over 200 unattached Premium SSD managed disks from a migration project that finished six months earlier. That was thousands of dollars per month in pure waste.

## Using Commitment Discounts

Azure offers two main commitment discount mechanisms: Reserved Instances (RIs) and Savings Plans. Both provide significant discounts (up to 72%) in exchange for committing to a certain level of usage for one or three years.

The WAF recommends using commitment discounts for any workload with predictable, steady-state usage. Production databases, application servers that run 24/7, and baseline compute capacity are all good candidates.

Start by analyzing your usage patterns over the past 3-6 months. Azure Advisor provides reservation recommendations based on your actual usage data. Look at both the one-year and three-year options. Three-year commitments give better discounts but less flexibility.

A common mistake is buying reservations that are too specific. If you reserve D4s_v3 instances but later need to resize to D4s_v5, your reservation does not transfer. Savings Plans offer more flexibility because they apply to any VM family and size, though the discount might be slightly lower.

## Implementing Auto-Shutdown for Dev/Test

Development and test environments do not need to run 24/7. If your dev VMs only get used during business hours, that is roughly 50 hours per week out of 168 total hours. You are paying for 118 hours of idle time every week.

Azure has a built-in auto-shutdown feature for VMs, but it only handles shutdown, not startup. For a full solution, use Azure Automation with Start/Stop VMs v2 or use Azure DevTest Labs for dev environments.

```bash
# Enable auto-shutdown for a VM at 7 PM local time
az vm auto-shutdown \
  --resource-group myResourceGroup \
  --name myVM \
  --time 1900 \
  --timezone "Eastern Standard Time"
```

For environments that can be completely torn down when not in use, consider using infrastructure-as-code to create and destroy the entire environment on demand. This is the most cost-effective approach for environments used infrequently.

## Optimizing Storage Costs

Storage costs add up quickly, especially if you are not using the right tier. Azure Blob Storage offers Hot, Cool, Cold, and Archive tiers with dramatically different pricing. Data that has not been accessed in 30 days should probably be in Cool storage. Data not accessed in 90 days should be in Cold or Archive.

Implement lifecycle management policies to automatically move data between tiers based on age and access patterns.

```json
{
  "rules": [
    {
      "name": "moveToCool",
      "type": "Lifecycle",
      "definition": {
        "filters": {
          "blobTypes": ["blockBlob"],
          "prefixMatch": ["logs/"]
        },
        "actions": {
          "baseBlob": {
            "tierToCool": {
              "daysAfterModificationGreaterThan": 30
            },
            "tierToArchive": {
              "daysAfterModificationGreaterThan": 90
            },
            "delete": {
              "daysAfterModificationGreaterThan": 365
            }
          }
        }
      }
    }
  ]
}
```

Also review your disk types. Not every disk needs to be Premium SSD. OS disks for non-performance-critical VMs can often use Standard SSD, which costs significantly less.

## Setting Up Cost Monitoring and Alerts

You cannot optimize what you do not measure. The WAF strongly recommends implementing cost monitoring with budgets and alerts. Azure Cost Management provides the tools for this.

Create budgets for each subscription, resource group, or cost center. Set alerts at 50%, 75%, and 90% of the budget threshold. This gives you early warning when spending is trending higher than expected.

Use cost anomaly detection to catch unexpected spikes. Azure Cost Management can detect unusual spending patterns and alert you automatically. This is especially useful for catching runaway autoscaling or resources deployed by mistake.

## Architecture-Level Optimizations

Beyond resource-level optimization, the WAF recommends looking at architecture patterns that reduce cost. These include:

Using serverless compute (Azure Functions, Logic Apps) for event-driven workloads instead of always-on VMs. A function that processes 1 million events per month costs a fraction of a VM running 24/7 waiting for work.

Implementing caching with Azure Cache for Redis to reduce database load. If your database is the most expensive component and many queries return the same data, caching can let you downsize the database tier.

Using Azure CDN or Front Door to cache static content closer to users, reducing bandwidth costs and origin server load.

Using spot VMs for fault-tolerant workloads like batch processing. Spot VMs offer discounts of up to 90% compared to pay-as-you-go pricing, with the caveat that Azure can reclaim them with 30 seconds notice.

## Building a FinOps Practice

The WAF cost optimization pillar is not just about one-time savings. It advocates for building a FinOps practice where cost optimization is an ongoing discipline. This means having clear cost ownership (each team owns their Azure spend), regular cost reviews (monthly at minimum), and cost awareness built into the development process.

Tag your resources consistently so you can allocate costs to teams, projects, and environments. Use Azure Policy to enforce tagging requirements on all new resources.

Review your cost optimization recommendations monthly. Azure Advisor updates its suggestions continuously, and new opportunities emerge as your usage patterns change. What was right-sized three months ago might be oversized today if traffic patterns have shifted.

The goal is not to spend the least amount possible. It is to get the most value for every dollar you spend. Sometimes that means spending more on a service that improves reliability or performance. The WAF helps you make those tradeoffs consciously rather than by accident.
