# How to Create and Manage Budgets in Azure Cost Management with Automated Alerts

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure Cost Management, Budgets, Cost Alerts, Cloud Spending, FinOps, Azure Governance

Description: Learn how to create budgets in Azure Cost Management with automated alerts to track spending and get notified before costs exceed your planned thresholds.

---

Budgets in Azure Cost Management are your financial guardrails. They let you set a spending limit for a subscription, resource group, or management group and receive alerts when actual or forecasted spending approaches or exceeds that limit. Without budgets, you are flying blind - you might not discover an unexpected cost spike until the invoice arrives at the end of the month.

This post covers how to create budgets, configure alert thresholds, set up automated actions, and build a budget management strategy that keeps spending under control.

## How Budgets Work

A budget in Azure Cost Management defines:

1. **Scope** - What the budget covers (subscription, resource group, or management group).
2. **Amount** - The spending limit for the budget period (monthly, quarterly, or annually).
3. **Time period** - The start and end date for the budget.
4. **Alert conditions** - Thresholds that trigger notifications (e.g., alert at 80%, 90%, and 100% of budget).
5. **Alert recipients** - Email addresses or action groups that receive notifications.

Budgets do not enforce spending limits - they do not stop resources from running. They are notification-only by default. However, you can connect them to automation that takes action when thresholds are breached.

## Creating a Budget in the Portal

1. Go to **Cost Management + Billing** in the Azure portal.
2. Select a scope (subscription or resource group).
3. Click **Budgets** in the left menu.
4. Click **Add**.
5. Fill in the details:
   - **Name**: A descriptive name like "prod-subscription-monthly" or "dev-rg-monthly".
   - **Reset period**: Monthly, Quarterly, or Annually.
   - **Creation date**: When the budget starts tracking.
   - **Expiration date**: When the budget stops (maximum 10 years out).
   - **Budget amount**: The spending limit in your billing currency.
6. Click **Next**.

Now configure the alert conditions:

7. Add alert thresholds:
   - **Type**: Actual (alerts when you have spent X%) or Forecasted (alerts when projected spending is expected to reach X%).
   - **% of budget**: The percentage threshold (e.g., 80%).
   - **Action group** (optional): An Azure Monitor action group for advanced notifications.
   - **Alert recipients**: Email addresses for direct notifications.
8. Add multiple conditions. A typical setup:
   - Forecasted at 80% - early warning.
   - Actual at 90% - getting close.
   - Actual at 100% - budget exceeded.
   - Actual at 120% - significantly over budget.
9. Click **Create**.

## Creating a Budget with Azure CLI

```bash
# Create a monthly budget of $5000 for a subscription
az consumption budget create \
  --budget-name "prod-monthly" \
  --amount 5000 \
  --category Cost \
  --time-grain Monthly \
  --start-date "2026-02-01" \
  --end-date "2027-02-01" \
  --resource-group "" \
  --notifications '{
    "Actual_GreaterThan_80_Percent": {
      "enabled": true,
      "operator": "GreaterThan",
      "threshold": 80,
      "contactEmails": ["ops@example.com", "finance@example.com"],
      "thresholdType": "Actual"
    },
    "Actual_GreaterThan_100_Percent": {
      "enabled": true,
      "operator": "GreaterThan",
      "threshold": 100,
      "contactEmails": ["ops@example.com", "finance@example.com", "manager@example.com"],
      "thresholdType": "Actual"
    },
    "Forecasted_GreaterThan_100_Percent": {
      "enabled": true,
      "operator": "GreaterThan",
      "threshold": 100,
      "contactEmails": ["ops@example.com"],
      "thresholdType": "Forecasted"
    }
  }'
```

## Creating a Budget with ARM Templates

For infrastructure-as-code deployments:

```json
{
  "type": "Microsoft.Consumption/budgets",
  "apiVersion": "2023-05-01",
  "name": "prod-monthly-budget",
  "properties": {
    "timePeriod": {
      "startDate": "2026-02-01",
      "endDate": "2027-02-01"
    },
    "timeGrain": "Monthly",
    "amount": 5000,
    "category": "Cost",
    "notifications": {
      "Actual_80_Percent": {
        "enabled": true,
        "operator": "GreaterThan",
        "threshold": 80,
        "thresholdType": "Actual",
        "contactEmails": ["ops@example.com"],
        "contactGroups": [
          "[parameters('actionGroupId')]"
        ]
      },
      "Forecasted_100_Percent": {
        "enabled": true,
        "operator": "GreaterThan",
        "threshold": 100,
        "thresholdType": "Forecasted",
        "contactEmails": ["ops@example.com", "finance@example.com"]
      }
    }
  }
}
```

## Actual vs Forecasted Alerts

Understanding the difference between actual and forecasted alerts is critical for effective budget management.

**Actual alerts** fire when your cumulative spending for the current period reaches the threshold. If your monthly budget is $5,000 and you set an actual alert at 80%, the alert fires when you have spent $4,000. By the time an actual 100% alert fires, you have already exceeded the budget.

**Forecasted alerts** use Azure's spending forecast model to predict whether you will exceed the threshold by the end of the period. If it is day 10 of the month and you have already spent $2,000, the forecast might predict you will hit $6,000 by month's end, triggering a forecasted 100% alert. This gives you time to take action before the budget is actually exceeded.

The most useful setup combines both:

- Forecasted alert at 80% - gives you the earliest possible warning.
- Actual alert at 80% - confirms spending is tracking high.
- Actual alert at 100% - budget officially exceeded.
- Actual alert at 120% - triggers escalation.

## Connecting Budgets to Action Groups

By connecting a budget alert to an Azure Monitor action group, you can trigger automated actions when a threshold is breached.

Common automations:

- **Send a Teams/Slack notification** via webhook.
- **Create a ticket** in your project management tool.
- **Trigger an Azure Function** that shuts down non-essential resources.
- **Run an Automation Runbook** that scales down or deallocates development VMs.

Here is an example of an Azure Function triggered by a budget alert that deallocates all VMs in a dev resource group.

```csharp
// Azure Function triggered by a budget alert action group
// Deallocates all VMs in the specified resource group to stop spending
[FunctionName("BudgetAlertHandler")]
public static async Task Run(
    [HttpTrigger(AuthorizationLevel.Function, "post")] HttpRequest req,
    ILogger log)
{
    // Parse the common alert schema payload
    string requestBody = await new StreamReader(req.Body).ReadToEndAsync();
    var alert = JsonConvert.DeserializeObject<dynamic>(requestBody);

    string budgetName = alert?.data?.essentials?.alertRule;
    log.LogWarning($"Budget alert triggered: {budgetName}");

    // Use managed identity to authenticate
    var credential = new DefaultAzureCredential();
    var computeClient = new ComputeManagementClient(credential, "<sub-id>");

    // Deallocate all VMs in the dev resource group
    var vms = computeClient.VirtualMachines.ListByResourceGroupAsync("rg-dev");
    await foreach (var vm in vms)
    {
        log.LogInformation($"Deallocating VM: {vm.Data.Name}");
        await computeClient.VirtualMachines.StartDeallocateAsync("rg-dev", vm.Data.Name);
    }
}
```

## Budget Strategies

### Per-Environment Budgets

Create separate budgets for each environment. Development and staging typically cost less than production, so set lower thresholds.

```bash
# Development budget - $500/month
az consumption budget create --budget-name "dev-monthly" --amount 500 --time-grain Monthly ...

# Staging budget - $1000/month
az consumption budget create --budget-name "staging-monthly" --amount 1000 --time-grain Monthly ...

# Production budget - $5000/month
az consumption budget create --budget-name "prod-monthly" --amount 5000 --time-grain Monthly ...
```

### Per-Team Budgets

If different teams own different resource groups, create team-level budgets scoped to their resource groups.

### Department Budgets at Management Group Level

For enterprise environments, create budgets at the management group level to track department-wide spending across multiple subscriptions.

## Monitoring Budget Status

Check the current status of your budgets in the portal:

1. Go to **Cost Management + Billing** > **Budgets**.
2. You will see a list of all budgets with:
   - Current spending vs budget amount.
   - A progress bar showing percentage consumed.
   - Alert status (which thresholds have been triggered).

You can also query budget status programmatically.

```bash
# List all budgets and their current status
az consumption budget list \
  --query "[].{Name:name, Amount:amount, CurrentSpend:currentSpend.amount, TimeGrain:timeGrain}" \
  -o table
```

## Handling Budget Overruns

When a budget is exceeded, the typical response depends on the environment:

**Development/Test**: Aggressive action - automatically shut down VMs, scale down services, or even delete ephemeral resources. Connect the budget alert to an automation runbook or function.

**Production**: Investigate and report - you cannot shut down production, but you should investigate why spending spiked and report to stakeholders. Connect the alert to a notification channel and a ticket creation workflow.

**Shared services**: Chargeback - if teams share a subscription, use tags to attribute costs and notify the specific team responsible for the overspend.

## Common Pitfalls

**Budget amount too tight**: If you set the budget exactly at your expected spending, every minor fluctuation triggers an alert. Give yourself a 10-20% buffer above expected spending.

**Too many recipients**: If you send budget alerts to everyone, nobody pays attention. Send forecasted and 80% alerts to the cost owner, and only escalate 100%+ alerts to management.

**No forecasted alerts**: If you only use actual alerts, you have no lead time. By the time you hit 100% actual, the money is spent. Always include at least one forecasted alert.

**Stale budgets**: Business changes, new projects spin up, old projects shut down. Review and update budget amounts quarterly to keep them relevant.

**Monthly-only budgets**: For seasonal businesses, a monthly budget might not account for known spikes (like Black Friday for retail). Consider quarterly budgets with higher amounts for peak periods.

## Viewing Budget History

Azure Cost Management retains budget history, showing how each budget performed over time. Use this to calibrate your budget amounts.

1. Click on a budget name in the Budgets list.
2. You will see a chart showing spending vs budget over past periods.
3. Use this to identify patterns - if you consistently come in at 60% of budget, the amount might be too high. If you consistently exceed 100%, it is too low.

## Wrapping Up

Budgets in Azure Cost Management are a fundamental governance tool. They do not stop spending, but they make sure you know about it before the invoice arrives. Create budgets at multiple levels - subscription, resource group, management group - and use both actual and forecasted alerts. Connect alerts to action groups for automation in non-production environments and notification workflows in production. Review budget performance monthly and adjust amounts as your workloads evolve. The combination of budgets, alerts, and automation gives you financial control without manual oversight.
