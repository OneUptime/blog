# How to Create Budget Alerts in Google Cloud to Avoid Unexpected Charges

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Cloud Billing, Budget Alerts, Cost Management, Google Cloud

Description: Learn how to set up budget alerts in Google Cloud to monitor spending, receive notifications, and prevent surprise bills on your GCP projects.

---

If you have ever woken up to a GCP bill that made your stomach drop, you already know why budget alerts matter. Cloud spending can spiral fast, especially when autoscaling kicks in or someone spins up a resource and forgets about it. Budget alerts are your early warning system, and Google Cloud makes them straightforward to configure.

In this guide, I will walk you through creating budget alerts from scratch, hooking them up to notifications, and even triggering automated responses when thresholds are breached.

## Why Budget Alerts Are Non-Negotiable

Running workloads in the cloud means you are paying for what you use. That is great when usage is predictable, but it becomes a problem when things drift. A misconfigured autoscaler, an expensive BigQuery query left running, or a forgotten VM can rack up hundreds or thousands of dollars in a matter of days.

Budget alerts do not stop spending by themselves, but they tell you when you are approaching a limit so you can act before the bill becomes painful.

## Prerequisites

Before you get started, make sure you have:

- A GCP billing account with appropriate permissions (Billing Account Administrator or Billing Account Costs Manager)
- At least one active GCP project linked to the billing account
- Access to the Google Cloud Console

## Step 1: Navigate to Budgets in Cloud Console

Open the Cloud Console and head to the Billing section. You can find it in the navigation menu under Billing, or just search for "Budgets & alerts" in the top search bar.

Once you are in the Billing section, click on "Budgets & alerts" in the left sidebar. This is where all your existing budgets live and where you will create new ones.

## Step 2: Create a New Budget

Click the "Create Budget" button. You will be presented with a form that has three main sections: scope, amount, and actions.

### Define the Scope

First, give your budget a name that makes sense. Something like "Production Project Monthly" or "Dev Team Q1 Budget" works well.

Next, choose what this budget covers:

- **Billing account**: The budget applies to everything under the billing account
- **Projects**: Filter to specific projects
- **Services**: Filter to specific GCP services (like Compute Engine or BigQuery)
- **Labels**: Filter by resource labels you have applied

Here is an example using the gcloud CLI to create a budget scoped to a specific project:

```bash
# Create a budget of $500/month for a specific project
gcloud billing budgets create \
  --billing-account=01ABCD-EFGH23-456789 \
  --display-name="Production Monthly Budget" \
  --budget-amount=500 \
  --filter-projects="projects/my-production-project" \
  --threshold-rule=percent=0.5 \
  --threshold-rule=percent=0.75 \
  --threshold-rule=percent=1.0
```

### Set the Budget Amount

You have two options for the budget amount:

1. **Specified amount**: You set a fixed dollar amount (e.g., $1,000/month)
2. **Last month's spend**: The budget dynamically adjusts based on what you spent last month

For most teams, a specified amount is the safer choice because it gives you a hard number to work against.

### Configure Alert Thresholds

This is the most important part. You set percentage thresholds that trigger notifications. The defaults are 50%, 90%, and 100%, but you can customize these.

I usually recommend setting thresholds at:

- **25%** - Early heads-up that spending has started
- **50%** - Midpoint check
- **75%** - Things are getting real
- **90%** - Almost at the limit
- **100%** - Budget reached
- **120%** - You are over budget

You can set thresholds above 100%, which is useful for catching overruns.

## Step 3: Set Up Notification Channels

By default, budget alerts go to Billing Account Administrators and Billing Account Users via email. But you can do much more.

### Connect to Pub/Sub for Automation

The real power of budget alerts comes from connecting them to Cloud Pub/Sub. This lets you trigger automated responses when thresholds are hit.

```bash
# Create a Pub/Sub topic for budget alerts
gcloud pubsub topics create budget-alerts

# Create a budget that publishes to Pub/Sub
gcloud billing budgets create \
  --billing-account=01ABCD-EFGH23-456789 \
  --display-name="Automated Response Budget" \
  --budget-amount=1000 \
  --threshold-rule=percent=0.9 \
  --threshold-rule=percent=1.0 \
  --notifications-rule-pubsub-topic="projects/my-project/topics/budget-alerts"
```

### Connect to Monitoring Notification Channels

You can also link budget alerts to Cloud Monitoring notification channels. This means you can send alerts to Slack, PagerDuty, SMS, or any webhook.

```bash
# Link a monitoring notification channel to your budget
gcloud billing budgets create \
  --billing-account=01ABCD-EFGH23-456789 \
  --display-name="Slack Alerts Budget" \
  --budget-amount=500 \
  --threshold-rule=percent=0.5 \
  --threshold-rule=percent=0.9 \
  --notifications-rule-monitoring-notification-channels="projects/my-project/notificationChannels/12345"
```

## Step 4: Automate Responses with Cloud Functions

Here is where it gets interesting. You can write a Cloud Function that listens to the Pub/Sub topic and takes action when a budget threshold is hit.

This Cloud Function disables billing on a project when the budget is exceeded:

```python
# Cloud Function to cap billing when budget is exceeded
import base64
import json
from googleapiclient import discovery

def stop_billing(data, context):
    """Triggered by a Pub/Sub message when budget threshold is hit."""
    pubsub_data = base64.b64decode(data['data']).decode('utf-8')
    pubsub_json = json.loads(pubsub_data)

    # Extract cost and budget information
    cost_amount = pubsub_json['costAmount']
    budget_amount = pubsub_json['budgetAmount']

    # Only act if we have exceeded the budget
    if cost_amount <= budget_amount:
        print(f"Current cost {cost_amount} is within budget {budget_amount}")
        return

    project_id = pubsub_json['budgetDisplayName']  # or extract from attributes
    billing_client = discovery.build('cloudbilling', 'v1')

    # Disable billing on the project
    project_name = f"projects/{project_id}"
    billing_client.projects().updateBillingInfo(
        name=project_name,
        body={'billingAccountName': ''}
    ).execute()

    print(f"Billing disabled for project {project_id}")
```

Be careful with this approach in production. Disabling billing will shut down resources. A safer alternative is to scale down non-critical resources or send urgent notifications to the on-call team.

## Step 5: Monitor and Review Budgets

After creating your budgets, check on them regularly. The Budgets & alerts page shows a summary of all budgets, their current spend versus the limit, and which thresholds have been triggered.

You can also list budgets programmatically:

```bash
# List all budgets for a billing account
gcloud billing budgets list \
  --billing-account=01ABCD-EFGH23-456789
```

## Best Practices for GCP Budget Alerts

Here are some patterns that work well in practice:

1. **Create budgets per project and per team** - Do not just have one budget for the entire billing account. Break it down so individual teams are accountable for their spending.

2. **Use labels to segment costs** - Apply labels to resources (like `team:backend` or `env:staging`) and create budgets filtered by those labels.

3. **Set forecasted spend alerts** - GCP can alert you based on forecasted spend, not just actual spend. This gives you even earlier warning.

4. **Review budgets monthly** - Budgets that made sense six months ago might not reflect your current usage patterns. Revisit them regularly.

5. **Combine with billing export** - Export billing data to BigQuery for deeper analysis alongside your budget alerts.

## Common Pitfalls

A few things to watch out for:

- Budget alerts are not real-time. There can be a delay of several hours between when a cost is incurred and when it shows up in the budget.
- Budgets do not automatically stop spending. They only notify you. You need to build automation if you want automatic responses.
- If you set the budget to "Last month's spend," be aware that a low-spend month will set a low budget for the next month, which might trigger false alarms.

## Wrapping Up

Budget alerts are one of the simplest and most impactful things you can set up in Google Cloud. They take five minutes to configure and can save you from billing surprises that could cost your team real money. Start with basic email alerts, then graduate to Pub/Sub and Cloud Functions for automated responses as your cloud footprint grows.

The key takeaway is to treat budgets as living documents. Set them up, review them regularly, and adjust as your usage evolves.
