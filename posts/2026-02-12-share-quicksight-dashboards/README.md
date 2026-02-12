# How to Share QuickSight Dashboards

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, QuickSight, Dashboards, Collaboration

Description: Complete guide to sharing Amazon QuickSight dashboards with users, groups, and external stakeholders using publishing, embedding, email reports, and namespace isolation.

---

Building a great dashboard means nothing if the right people can't see it. QuickSight offers several ways to share dashboards: direct sharing with QuickSight users, email reports, embedded dashboards in your own applications, and public embedding for anonymous access. Each approach fits different use cases, and getting the sharing model right is just as important as getting the visuals right.

Let's go through each sharing method with real configuration examples.

## Publishing an Analysis as a Dashboard

In QuickSight, you build in an "analysis" and publish to a "dashboard." An analysis is your working space - you can edit visualizations, add sheets, and tweak settings. A dashboard is a read-only snapshot that you share with others.

```bash
# First, create a template from your analysis
aws quicksight create-template \
  --aws-account-id 123456789012 \
  --template-id sales-dashboard-template \
  --name "Sales Dashboard Template" \
  --source-entity '{
    "SourceAnalysis": {
      "Arn": "arn:aws:quicksight:us-east-1:123456789012:analysis/sales-analysis",
      "DataSetReferences": [{
        "DataSetPlaceholder": "SalesData",
        "DataSetArn": "arn:aws:quicksight:us-east-1:123456789012:dataset/sales-dataset"
      }]
    }
  }'

# Then create a dashboard from the template
aws quicksight create-dashboard \
  --aws-account-id 123456789012 \
  --dashboard-id sales-dashboard \
  --name "Sales Performance Dashboard" \
  --source-entity '{
    "SourceTemplate": {
      "Arn": "arn:aws:quicksight:us-east-1:123456789012:template/sales-dashboard-template",
      "DataSetReferences": [{
        "DataSetPlaceholder": "SalesData",
        "DataSetArn": "arn:aws:quicksight:us-east-1:123456789012:dataset/sales-dataset"
      }]
    }
  }' \
  --dashboard-publish-options '{
    "AdHocFilteringOption": {"AvailabilityStatus": "ENABLED"},
    "ExportToCSVOption": {"AvailabilityStatus": "ENABLED"},
    "SheetControlsOption": {"VisibilityState": "EXPANDED"}
  }'
```

## Sharing with QuickSight Users and Groups

The most direct sharing method is granting permissions to specific users or groups.

```bash
# Share dashboard with a specific user (view only)
aws quicksight update-dashboard-permissions \
  --aws-account-id 123456789012 \
  --dashboard-id sales-dashboard \
  --grant-permissions '[
    {
      "Principal": "arn:aws:quicksight:us-east-1:123456789012:user/default/jane-analyst",
      "Actions": [
        "quicksight:DescribeDashboard",
        "quicksight:ListDashboardVersions",
        "quicksight:QueryDashboard"
      ]
    }
  ]'

# Share with an entire group
aws quicksight update-dashboard-permissions \
  --aws-account-id 123456789012 \
  --dashboard-id sales-dashboard \
  --grant-permissions '[
    {
      "Principal": "arn:aws:quicksight:us-east-1:123456789012:group/default/sales-team",
      "Actions": [
        "quicksight:DescribeDashboard",
        "quicksight:ListDashboardVersions",
        "quicksight:QueryDashboard"
      ]
    }
  ]'

# Share with co-owner permissions (can reshare)
aws quicksight update-dashboard-permissions \
  --aws-account-id 123456789012 \
  --dashboard-id sales-dashboard \
  --grant-permissions '[
    {
      "Principal": "arn:aws:quicksight:us-east-1:123456789012:user/default/team-lead",
      "Actions": [
        "quicksight:DescribeDashboard",
        "quicksight:ListDashboardVersions",
        "quicksight:QueryDashboard",
        "quicksight:UpdateDashboardPermissions",
        "quicksight:DescribeDashboardPermissions"
      ]
    }
  ]'
```

## Setting Up Email Reports

For stakeholders who don't want to log into QuickSight, you can schedule email deliveries of dashboard snapshots.

```bash
# Create an email schedule for weekly reports
aws quicksight create-topic-refresh-schedule \
  --aws-account-id 123456789012 \
  --topic-id sales-topic \
  --dataset-arn "arn:aws:quicksight:us-east-1:123456789012:dataset/sales-dataset" \
  --refresh-schedule '{
    "IsEnabled": true,
    "BasedOnSpiceSchedule": true
  }'
```

For the actual email report, you'll typically use the QuickSight console to set up scheduled reports since the API for email schedules is still being expanded. Navigate to the dashboard, click the share icon, and choose "Email report." You can set the schedule, recipients, and format (PDF or CSV attachment).

## Embedding Dashboards in Your Application

This is where QuickSight gets really interesting. You can embed dashboards directly into your web application, giving your users BI capabilities without them ever knowing they're using QuickSight.

First, generate an embedding URL.

```python
# generate_embed_url.py
import boto3
import json

quicksight = boto3.client('quicksight', region_name='us-east-1')
account_id = '123456789012'

# Generate a dashboard embedding URL for a registered user
response = quicksight.generate_embed_url_for_registered_user(
    AwsAccountId=account_id,
    SessionLifetimeInMinutes=600,
    UserArn='arn:aws:quicksight:us-east-1:123456789012:user/default/embed-user',
    ExperienceConfiguration={
        'Dashboard': {
            'InitialDashboardId': 'sales-dashboard'
        }
    },
    AllowedDomains=['https://myapp.example.com']
)

embed_url = response['EmbedUrl']
print(f"Embed URL: {embed_url}")
```

Then use the QuickSight embedding SDK in your frontend.

```html
<!-- Include the QuickSight embedding SDK -->
<script src="https://unpkg.com/amazon-quicksight-embedding-sdk@2/dist/quicksight-embedding-js-sdk.min.js"></script>

<div id="dashboard-container" style="width: 100%; height: 800px;"></div>

<script>
  // Fetch the embed URL from your backend
  async function embedDashboard() {
    const response = await fetch('/api/quicksight/embed-url');
    const { embedUrl } = await response.json();

    const embeddingContext = await QuickSightEmbedding.createEmbeddingContext();

    const dashboard = await embeddingContext.embedDashboard({
      url: embedUrl,
      container: '#dashboard-container',
      height: '800px',
      width: '100%',
      locale: 'en-US',
      scrolling: 'no',
      footerPaddingEnabled: true
    });

    // Listen for events from the embedded dashboard
    dashboard.on('error', (error) => {
      console.error('Dashboard error:', error);
    });

    dashboard.on('load', () => {
      console.log('Dashboard loaded successfully');
    });
  }

  embedDashboard();
</script>
```

## Anonymous Embedding for Public Dashboards

For public-facing dashboards (like a status page or public metrics), you can generate anonymous embed URLs that don't require QuickSight user accounts.

```python
# generate_anonymous_embed.py
import boto3

quicksight = boto3.client('quicksight', region_name='us-east-1')

response = quicksight.generate_embed_url_for_anonymous_user(
    AwsAccountId='123456789012',
    SessionLifetimeInMinutes=60,
    Namespace='default',
    SessionTags=[
        {
            'Key': 'region',
            'Value': 'US-East'
        }
    ],
    AuthorizedResourceArns=[
        'arn:aws:quicksight:us-east-1:123456789012:dashboard/public-metrics'
    ],
    ExperienceConfiguration={
        'Dashboard': {
            'InitialDashboardId': 'public-metrics'
        }
    },
    AllowedDomains=['https://status.example.com']
)

print(response['EmbedUrl'])
```

Anonymous embedding is priced per session rather than per user, which makes it cost-effective for public dashboards with many viewers.

## Namespace Isolation for Multi-Tenant Sharing

If you're building a SaaS product and want to embed separate dashboards for each customer, use QuickSight namespaces.

```bash
# Create a namespace for each tenant
aws quicksight create-namespace \
  --aws-account-id 123456789012 \
  --namespace tenant-acme \
  --identity-store QUICKSIGHT

aws quicksight create-namespace \
  --aws-account-id 123456789012 \
  --namespace tenant-globex \
  --identity-store QUICKSIGHT
```

Each namespace gets its own users, groups, and access controls. Combined with row-level security on your datasets, you can serve the same dashboard to different tenants while ensuring they only see their own data.

## Revoking Access

When someone leaves or no longer needs access, revoke their permissions.

```bash
# Revoke dashboard access
aws quicksight update-dashboard-permissions \
  --aws-account-id 123456789012 \
  --dashboard-id sales-dashboard \
  --revoke-permissions '[
    {
      "Principal": "arn:aws:quicksight:us-east-1:123456789012:user/default/former-employee",
      "Actions": [
        "quicksight:DescribeDashboard",
        "quicksight:ListDashboardVersions",
        "quicksight:QueryDashboard"
      ]
    }
  ]'
```

## Best Practices

- **Use groups, not individual users.** Managing permissions per user doesn't scale. Create groups like "sales-viewers" and "executive-team" and share with those.
- **Version your dashboards.** When updating a shared dashboard, create a new version from your analysis. You can roll back if the update causes issues.
- **Monitor sharing with CloudTrail.** Track who shared what with whom for compliance and auditing purposes.
- **Set appropriate session durations.** Shorter sessions for embedded dashboards reduce the window for URL reuse.

Getting the sharing model right early saves you from permission headaches later. For related reading, check out our guide on [setting up QuickSight](https://oneuptime.com/blog/post/set-up-amazon-quicksight-for-business-intelligence/view) if you're still in the initial setup phase.
