# How to Configure Azure Advisor Alerts for New Reliability Recommendations

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure Advisor, Reliability Recommendations, Azure Alerts, High Availability, Cloud Governance, Proactive Monitoring

Description: Learn how to set up Azure Advisor alerts so you are automatically notified when new reliability recommendations appear for your Azure resources.

---

Azure Advisor generates reliability recommendations when it detects configurations that could lead to downtime or reduced availability. The problem is that most teams only check Advisor when they remember to, which might be once a month or during a quarterly review. By the time they see a recommendation like "enable zone redundancy on your SQL database," the window to act proactively may have passed.

Advisor alerts solve this by sending you a notification the moment a new recommendation appears. This post covers how to configure alerts for reliability recommendations, how to route them through action groups, and how to build a workflow that ensures recommendations get reviewed and acted on promptly.

## What Are Reliability Recommendations?

Advisor reliability recommendations (formerly called "High Availability" recommendations) focus on configurations that affect the uptime and resilience of your resources. Common examples include:

- **Enable availability zones** for virtual machines, databases, and other resources.
- **Configure multiple instances** for App Service plans running in production.
- **Enable geo-redundancy** for storage accounts.
- **Add a health probe** to load balancers.
- **Enable backup** for virtual machines that do not have Azure Backup configured.
- **Use managed disks** instead of unmanaged disks.
- **Enable soft delete** on Key Vaults and storage accounts.
- **Distribute VMs across availability zones or sets** to protect against hardware failures.

These recommendations are based on well-established cloud architecture best practices and are tailored to your specific resource configurations.

## Creating an Advisor Alert in the Portal

1. Navigate to **Azure Advisor** in the portal.
2. Click **Alerts** in the left menu.
3. Click **New Advisor Alert**.
4. Fill in the configuration:
   - **Subscription**: Select your subscription.
   - **Resource group** (optional): Leave blank to cover the entire subscription, or select a specific resource group.
   - **Category**: Select **Reliability**.
   - **Impact level** (optional): Filter by High, Medium, or Low impact. For reliability, I recommend including all impact levels since even medium-impact reliability issues can cause outages.
5. Under **Action group**, select an existing action group or create a new one.
6. Give the alert rule a name like "New Reliability Recommendations".
7. Click **Create alert rule**.

## Creating an Advisor Alert with Azure CLI

```bash
# Create an Advisor alert for new reliability recommendations
az advisor configuration create-or-update \
  --resource-group rg-monitoring

# Create an activity log alert for Advisor reliability recommendations
az monitor activity-log alert create \
  --name "advisor-reliability-alert" \
  --resource-group rg-monitoring \
  --scope "/subscriptions/<sub-id>" \
  --condition category=Recommendation recommendationCategory=HighAvailability \
  --action-group "/subscriptions/<sub-id>/resourceGroups/rg-monitoring/providers/Microsoft.Insights/actionGroups/ops-team" \
  --description "Alert when new Advisor reliability recommendations appear"
```

Note: In the CLI and API, reliability recommendations use the legacy name "HighAvailability" as the category identifier.

## Creating with ARM Templates

For infrastructure-as-code deployments:

```json
{
  "type": "Microsoft.Insights/activityLogAlerts",
  "apiVersion": "2020-10-01",
  "name": "advisor-reliability-alert",
  "location": "Global",
  "properties": {
    "scopes": [
      "/subscriptions/<subscription-id>"
    ],
    "condition": {
      "allOf": [
        {
          "field": "category",
          "equals": "Recommendation"
        },
        {
          "field": "operationName",
          "equals": "Microsoft.Advisor/recommendations/available/action"
        },
        {
          "field": "properties.recommendationCategory",
          "equals": "HighAvailability"
        }
      ]
    },
    "actions": {
      "actionGroups": [
        {
          "actionGroupId": "[parameters('actionGroupId')]"
        }
      ]
    },
    "enabled": true,
    "description": "Notifies when new Advisor reliability recommendations are generated"
  }
}
```

## Setting Up Alerts for All Categories

While this post focuses on reliability, you probably want alerts for other categories too. Here is how to set up alerts for all five Advisor categories.

```bash
# Create alerts for each Advisor category
for CATEGORY in HighAvailability Security Performance Cost OperationalExcellence; do
  az monitor activity-log alert create \
    --name "advisor-${CATEGORY,,}-alert" \
    --resource-group rg-monitoring \
    --scope "/subscriptions/<sub-id>" \
    --condition category=Recommendation recommendationCategory=$CATEGORY \
    --action-group "/subscriptions/<sub-id>/resourceGroups/rg-monitoring/providers/Microsoft.Insights/actionGroups/ops-team" \
    --description "Alert for new Advisor $CATEGORY recommendations"
done
```

This creates five alert rules, one per category, all routing to the same action group.

## Routing to Different Teams

In many organizations, different teams handle different types of recommendations:

- **Reliability** goes to the infrastructure/SRE team.
- **Security** goes to the security team.
- **Cost** goes to the finance or FinOps team.
- **Performance** goes to the application development team.
- **Operational Excellence** goes to the platform team.

Create separate action groups for each team and assign them to the corresponding alert rules.

```bash
# Create team-specific action groups
az monitor action-group create \
  --resource-group rg-monitoring \
  --name "sre-team" \
  --short-name "SRE" \
  --action email sre-lead sre@example.com \
  --action webhook pagerduty "https://events.pagerduty.com/integration/<key>/enqueue"

az monitor action-group create \
  --resource-group rg-monitoring \
  --name "security-team" \
  --short-name "SecTeam" \
  --action email security-lead security@example.com

# Use the SRE action group for reliability alerts
az monitor activity-log alert create \
  --name "advisor-reliability-alert" \
  --resource-group rg-monitoring \
  --scope "/subscriptions/<sub-id>" \
  --condition category=Recommendation recommendationCategory=HighAvailability \
  --action-group "/subscriptions/<sub-id>/resourceGroups/rg-monitoring/providers/Microsoft.Insights/actionGroups/sre-team"
```

## Building a Review Workflow

Getting an alert is only the first step. You need a process for reviewing and acting on recommendations. Here is a workflow that works well.

### Immediate Triage (Within 1 Business Day)

When the alert fires:

1. Open the recommendation in the Azure portal.
2. Assess the impact - what happens if this is not addressed?
3. Determine the effort - is it a quick config change or a major architectural decision?
4. Assign to the appropriate team member.

### Weekly Review

Each week, review all open Advisor recommendations:

1. Check if assigned recommendations have been implemented.
2. Re-prioritize based on any changes in the environment.
3. Dismiss recommendations that are not applicable (with documentation of why).

### Automation for Common Recommendations

For recommendations that appear frequently and have straightforward fixes, automate the remediation.

```bash
# Example: Automatically enable soft delete on Key Vaults when recommended
# This could be triggered by a Logic App connected to the Advisor alert

# Check if soft delete is enabled
az keyvault show --name my-keyvault --query "properties.enableSoftDelete"

# Enable it if not
az keyvault update --name my-keyvault --enable-soft-delete true
```

You can connect the Advisor alert to a Logic App through an action group, and the Logic App can automatically remediate certain types of recommendations.

## Filtering Alert Noise

Not every recommendation warrants an immediate notification. If you find certain low-impact recommendations generating too much noise:

1. **Filter by impact level**: When creating the alert, add an impact level condition. Set it to High only for immediate notifications, and handle Medium and Low in your weekly review.

2. **Use alert processing rules**: Create suppression rules for specific time windows or resource groups.

3. **Dismiss irrelevant recommendations**: If a recommendation consistently does not apply to your environment (for example, zone redundancy recommendations for resources in a region that does not support zones), dismiss it in Advisor.

## Monitoring Alert History

Track which alerts have fired and whether they were addressed.

1. Go to **Azure Monitor** > **Alerts**.
2. Filter by the alert rule name.
3. You can see the history of when each alert fired and its current state.

For longer-term tracking, export Advisor recommendations to a Log Analytics workspace and build reports showing recommendation trends over time.

```bash
# Export Advisor recommendations to Log Analytics
# You can use Azure Resource Graph queries to get current recommendations
az graph query -q "
  advisorresources
  | where type == 'microsoft.advisor/recommendations'
  | where properties.category == 'HighAvailability'
  | project name, resourceGroup, properties.shortDescription.problem, properties.impact
"
```

## Best Practices

- **Alert on all subscriptions**: If you manage multiple subscriptions, create alerts on each one. Advisor recommendations are subscription-scoped.
- **Include Reliability and Security at minimum**: These two categories directly affect your SLA commitments and security posture.
- **Review dismissed recommendations quarterly**: Circumstances change. A recommendation you dismissed 6 months ago might be relevant now.
- **Document exceptions**: When you decide not to implement a recommendation, document why. This is valuable for audit trails and team knowledge transfer.
- **Connect to your ticketing system**: Use webhooks in action groups to automatically create tickets in Jira, ServiceNow, or your preferred tracking tool.

## Wrapping Up

Proactive alerting on Advisor recommendations transforms Advisor from a periodic review tool into a continuous governance mechanism. By setting up alerts for reliability recommendations, you catch potential availability issues as soon as Advisor identifies them - not during the next time someone remembers to check. Route alerts to the right teams, build a review workflow, and automate common remediations where possible. The investment in setting up these alerts is minimal, and the payoff is catching reliability risks before they become incidents.
