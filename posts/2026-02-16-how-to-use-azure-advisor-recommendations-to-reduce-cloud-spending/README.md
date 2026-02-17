# How to Use Azure Advisor Recommendations to Reduce Cloud Spending

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure Advisor, Cost Optimization, Cloud Spending, Azure Cost Management, Resource Optimization, Cloud Governance

Description: A practical walkthrough of using Azure Advisor cost recommendations to identify underutilized resources and reduce your Azure cloud spending.

---

Azure Advisor is a free service built into the Azure portal that analyzes your resource configuration and usage telemetry, then gives you personalized recommendations across five categories: cost, security, reliability, operational excellence, and performance. The cost category is where most people start, because it directly translates to savings on your monthly bill.

This post focuses specifically on the cost recommendations - what types of recommendations Advisor provides, how to evaluate them, and how to act on them systematically to reduce your Azure spending.

## What Azure Advisor Analyzes

Advisor looks at your resource configurations and historical usage data to identify patterns that suggest waste or inefficiency. For cost recommendations, it focuses on:

- **Underutilized virtual machines** - VMs where CPU and network usage are consistently below thresholds that suggest they are oversized.
- **Unattached managed disks** - Disks that are not attached to any VM but still incurring charges.
- **Reserved Instance opportunities** - Resources with steady usage patterns that would benefit from 1-year or 3-year reservations.
- **Savings Plan opportunities** - Compute resources that qualify for Azure Savings Plans.
- **Idle resources** - Public IP addresses, Load Balancers, Application Gateways, and other resources that exist but handle no traffic.
- **Right-sizing recommendations** - Suggestions to move to smaller VM sizes based on actual resource utilization.
- **Unused ExpressRoute circuits** - Circuits that are provisioned but not connected.

## Accessing Azure Advisor

1. In the Azure portal, search for **Advisor** in the top search bar.
2. Click **Azure Advisor**.
3. Click the **Cost** tab to see cost-specific recommendations.

Each recommendation shows:

- The resource affected.
- A description of the issue.
- The estimated annual savings.
- The recommended action.

Recommendations are sorted by potential savings, so the biggest opportunities appear first.

## Evaluating VM Right-Sizing Recommendations

VM right-sizing is typically the largest source of savings. Advisor flags VMs where the average CPU utilization is below 5% over the past 14 days (or a configurable threshold). It recommends either:

- **Shutting down** the VM if utilization is near zero.
- **Resizing** to a smaller SKU that matches the actual workload.

Before acting on these recommendations, do some due diligence:

1. **Check the workload pattern**: Is the VM part of a batch process that only runs on specific days? If Advisor averaged usage over a quiet period, the recommendation might be misleading.

2. **Check memory usage**: Advisor primarily looks at CPU and network. A VM might have low CPU but high memory utilization. Resizing could cause memory pressure.

3. **Check dependent services**: Is the VM a domain controller, DNS server, or other infrastructure component that needs to stay running regardless of CPU usage?

Here is a KQL query to check a VM's actual utilization pattern before acting on a recommendation.

```
// Check the utilization pattern for a specific VM over the past 30 days
Perf
| where TimeGenerated > ago(30d)
| where Computer == "web-server-03"
| where ObjectName == "Processor" and CounterName == "% Processor Time" and InstanceName == "_Total"
| summarize AvgCPU = avg(CounterValue), MaxCPU = max(CounterValue), P95CPU = percentile(CounterValue, 95) by bin(TimeGenerated, 1h)
| render timechart
```

If the P95 is below 20% and the max never exceeds 40%, the VM is genuinely oversized and can safely be resized.

## Acting on Reserved Instance Recommendations

Advisor identifies resources that have been running consistently for the past 30 days and would save money with a Reserved Instance (RI) purchase. RIs provide up to 72% savings compared to pay-as-you-go pricing in exchange for a 1-year or 3-year commitment.

The recommendation shows:

- The current VM size and region.
- The recommended reservation quantity.
- The estimated monthly and annual savings.

Before purchasing:

1. **Confirm the workload is stable**: If you plan to decommission or resize the VM in 6 months, a 3-year RI is a bad idea.
2. **Consider flexibility**: RI instance size flexibility means a reservation for a D4s_v5 can also cover two D2s_v5 instances. This provides some protection against right-sizing changes.
3. **Start with 1-year terms**: If you are not sure about the long-term plan, start with 1-year reservations and renew.

## Implementing Recommendations Programmatically

You can list Advisor recommendations using the Azure CLI.

```bash
# List all cost recommendations for the current subscription
az advisor recommendation list \
  --category Cost \
  --query "[].{Resource:resourceGroup, Impact:impact, Problem:shortDescription.problem, Solution:shortDescription.solution, Savings:extendedProperties.annualSavingsAmount}" \
  -o table
```

To get more details on a specific recommendation:

```bash
# Get detailed cost recommendations with resource IDs
az advisor recommendation list \
  --category Cost \
  --query "[].{ResourceId:resourceMetadata.resourceId, Problem:shortDescription.problem, Savings:extendedProperties.annualSavingsAmount, Currency:extendedProperties.savingsCurrency}" \
  -o table
```

## Building an Optimization Workflow

Here is a workflow that works well for systematic cost optimization:

### Weekly Review

1. Open Azure Advisor and go to the Cost tab.
2. Sort by estimated savings.
3. For each recommendation:
   - Validate the recommendation is applicable (check workload patterns).
   - If valid, assign it to the appropriate team member.
   - If not valid, dismiss or postpone it.
4. Track implemented savings over time.

### Monthly Deep Dive

1. Export all recommendations to a spreadsheet.
2. Categorize by type (right-sizing, reserved instances, idle resources).
3. Calculate the total potential savings.
4. Prioritize by effort vs impact.
5. Set targets for the next month.

## Configuring Advisor for Better Recommendations

You can tune Advisor's behavior to produce more relevant recommendations.

### Adjust the CPU Utilization Threshold

By default, Advisor flags VMs with average CPU below 5%. You might want to adjust this.

1. In Azure Advisor, click **Configuration** in the left menu.
2. Select the subscription.
3. Under **VM right-sizing**, adjust the CPU utilization threshold (e.g., change to 10% or 15%).
4. Click **Apply**.

A higher threshold catches more potentially oversized VMs but may produce more false positives.

### Filter by Subscription or Resource Group

If you manage multiple subscriptions, use the filter at the top of the Advisor page to focus on specific subscriptions or resource groups. This is useful when different teams are responsible for different environments.

## Tracking Savings Over Time

Advisor provides an **Advisor Score** that represents the overall health of your Azure environment across all five categories. For cost, the score reflects how many cost recommendations you have implemented versus how many are outstanding.

Track this score monthly. A rising score means you are implementing recommendations faster than new ones appear. A falling score means your environment is growing faster than your optimization efforts.

You can also use Azure Cost Management alongside Advisor to see actual spending trends and verify that implemented recommendations are delivering the expected savings.

## Common High-Value Actions

From my experience, these are the actions that consistently deliver the biggest savings:

1. **Shut down dev/test VMs outside business hours** using Azure Automation or auto-shutdown schedules. This alone can save 60-70% on non-production VM costs.

2. **Purchase reserved instances for production workloads** that will run for at least a year. The 1-year savings is typically 30-40%.

3. **Delete unattached disks** that were left behind after VM deletions. These are pure waste.

4. **Right-size oversized VMs**. Moving from a D8s_v5 to a D4s_v5 cuts the VM cost in half.

5. **Switch to spot instances for batch workloads** that can tolerate interruptions. Savings of 60-90%.

6. **Review App Service plans** for over-provisioned web apps. A Premium plan running a small website is common waste.

## Limitations of Advisor

Advisor is useful but not comprehensive. Some things it does not catch:

- **Storage optimization**: It does not recommend moving data from hot to cool or archive tiers based on access patterns. Use Azure Storage analytics for that.
- **Network optimization**: It does not flag over-provisioned VPN gateways or bandwidth.
- **License optimization**: It does not analyze Azure Hybrid Benefit usage or license compliance.
- **Application-level optimization**: It does not know if your application code is inefficient. Performance profiling is a different discipline.

## Wrapping Up

Azure Advisor is your first stop for Azure cost optimization. It surfaces low-hanging fruit - oversized VMs, idle resources, reservation opportunities - with estimated savings attached. Build a weekly review habit, act on the highest-impact recommendations first, and track your Advisor Score over time. The recommendations are generated automatically based on your actual usage, so they stay relevant as your environment evolves. Combine Advisor with Azure Cost Management for a complete picture of where your money goes and how to spend less of it.
