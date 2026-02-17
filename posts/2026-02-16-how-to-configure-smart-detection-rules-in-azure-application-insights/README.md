# How to Configure Smart Detection Rules in Azure Application Insights

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure Application Insights, Smart Detection, Anomaly Detection, Failure Analysis, Performance Monitoring, Machine Learning

Description: A guide to configuring and understanding Smart Detection rules in Azure Application Insights for automatic anomaly detection in failures and performance.

---

Smart Detection is one of the features in Application Insights that you might not even realize is running until it sends you an email about a sudden spike in failed requests or an unusual degradation in response time. It uses machine learning to analyze your application telemetry, learn normal patterns, and alert you when something deviates from the baseline. Unlike metric alerts where you define explicit thresholds, Smart Detection figures out the thresholds on its own.

This post covers how Smart Detection works, what types of issues it detects, how to configure the rules, and how to integrate Smart Detection alerts into your existing monitoring workflow.

## What Smart Detection Detects

Smart Detection includes several built-in detection rules that analyze different aspects of your application telemetry:

### Failure Anomalies

This is the most commonly triggered detection. It monitors the rate of failed requests and failed dependency calls and alerts when the failure rate increases abnormally compared to recent historical patterns. It considers:

- The overall failure rate trend.
- The number of requests (it avoids alerting on statistically insignificant samples).
- The time of day (some applications naturally have different failure patterns at different times).

### Performance Anomalies

These detections monitor response time degradation:

- **Slow server response time** - Alerts when the response time for a request operation degrades compared to its historical baseline.
- **Slow dependency duration** - Alerts when calls to a dependency (database, external API) slow down.
- **Slow page load time** - For web applications, alerts when client-side page load times degrade.

### Other Detections

- **Degradation in trace severity ratio** - If the ratio of warning or error traces to total traces increases.
- **Abnormal rise in exception volume** - When exception counts spike above the learned baseline.
- **Memory leak detection** - For .NET applications, detects gradually increasing memory usage that suggests a leak.
- **Potential security issue** - Detects patterns that may indicate security threats (like a sudden increase in failed authentication attempts).

## How to View Smart Detection Rules

1. Navigate to your Application Insights resource in the Azure portal.
2. Click **Smart Detection** in the left menu under **Investigate**.
3. You will see a list of Smart Detection results (past detections) and a link to **Settings** where you can configure the rules.

Alternatively, click **Smart Detection settings** to go directly to the configuration page.

## Configuring Smart Detection Rules

Click on **Smart Detection settings** to see all available rules. For each rule, you can configure:

- **Enabled/Disabled** - Turn the rule on or off.
- **Email recipients** - Who receives the notification when a detection fires. By default, it goes to users with the Reader, Contributor, and Owner roles on the subscription.
- **Additional email addresses** - Add specific email addresses that should receive notifications.
- **Suppression** - You can suppress a detection for a period if you know about the issue and do not need repeated notifications.

Here is how to configure a specific rule in the portal:

1. In the Smart Detection settings, click on the rule you want to modify (e.g., "Failure Anomalies").
2. Toggle **Status** to Enabled or Disabled.
3. Under **Email notification**, check or uncheck **Send email to subscription readers, contributors, and owners**.
4. Add any additional email addresses.
5. Click **Save**.

## Configuring Smart Detection with ARM Templates

For infrastructure-as-code deployments, you can configure Smart Detection rules using ARM templates.

```json
{
  "type": "Microsoft.Insights/components/ProactiveDetectionConfigs",
  "apiVersion": "2018-05-01-preview",
  "name": "[concat(parameters('appInsightsName'), '/slowpageloadtime')]",
  "properties": {
    "RuleDefinitions": {
      "Name": "slowpageloadtime",
      "DisplayName": "Slow page load time",
      "Description": "Smart Detection rules notify about performance anomaly issues.",
      "HelpUrl": "https://docs.microsoft.com/en-us/azure/application-insights/app-insights-proactive-performance-diagnostics",
      "IsHidden": false,
      "IsEnabledByDefault": true,
      "IsInPreview": false,
      "SupportsEmailNotifications": true
    },
    "Enabled": true,
    "SendEmailsToSubscriptionOwners": true,
    "CustomEmails": ["ops@example.com", "devlead@example.com"]
  }
}
```

The rule names you can use include: `slowpageloadtime`, `slowserverresponsetime`, `longdependencyduration`, `degradationinserverresponsetime`, `degradationindependencyduration`, `extension_traceseveritydetector`, `extension_exceptionchangeextension`, and `extension_memoryleakextension`.

## Configuring with Azure CLI

You can also use the Azure CLI to manage Smart Detection settings.

```bash
# List all Smart Detection configurations for an Application Insights resource
az monitor app-insights component proactive-detection show \
  --app my-app-insights \
  --resource-group rg-monitoring

# Update a specific detection rule
az monitor app-insights component proactive-detection update \
  --app my-app-insights \
  --resource-group rg-monitoring \
  --name "slowserverresponsetime" \
  --is-enabled true \
  --send-emails-to-subscription-owners true \
  --custom-emails "ops@example.com"
```

## Migrating Smart Detection to Alert Rules

Microsoft has been migrating Smart Detection from the legacy notification system to standard Azure Monitor alert rules. This is a significant improvement because it means Smart Detection alerts can:

- Use action groups (email, SMS, webhook, Logic App, etc.).
- Be managed alongside your other alert rules.
- Be suppressed using alert processing rules.
- Appear in the unified alerts view.

To migrate your Smart Detection to alert rules:

1. Go to your Application Insights resource.
2. Click **Smart Detection** in the left menu.
3. Look for a banner or link saying "Migrate Smart Detection to alert rules".
4. Follow the migration wizard.

After migration, each Smart Detection rule becomes a standard alert rule with a pre-configured Log Analytics query. You can then attach action groups to route notifications through your existing channels.

## Understanding Smart Detection Notifications

When a Smart Detection fires, the notification email includes:

- The type of anomaly detected.
- A summary of the impact (e.g., "The failure rate for GET /api/orders increased from 0.5% to 12% over the last 30 minutes").
- A comparison chart showing the anomalous behavior against the baseline.
- Affected operations and their statistics.
- A link to the Application Insights portal for deeper investigation.

The email is designed to be actionable - you should be able to glance at it and understand whether it requires immediate attention or can wait.

## Tuning Smart Detection

Unlike metric alerts where you set explicit thresholds, Smart Detection is largely self-tuning. However, there are a few things you can do to improve its accuracy:

**Ensure sufficient data volume**: Smart Detection needs a reasonable amount of data to build accurate baselines. If your application handles fewer than a hundred requests per day, the statistical models may not be reliable.

**Give it time to learn**: When you first enable Application Insights on a new application, Smart Detection needs about a week of data to establish baselines. During this period, you might see false positives or no detections at all.

**Separate environments**: If you use the same Application Insights resource for both staging and production, the noise from staging deployments can confuse the models. Use separate Application Insights resources for each environment.

**Use cloud role names**: If you have multiple services reporting to the same Application Insights resource, make sure each has a unique cloud role name. This allows Smart Detection to build separate baselines for each service.

## Common Smart Detection Scenarios

Here are some real scenarios where Smart Detection has caught issues that traditional threshold-based alerts missed:

**Gradual response time degradation**: A memory leak caused response times to slowly increase over several hours. The change per minute was tiny - not enough to breach a static threshold - but Smart Detection noticed the cumulative drift.

**Dependency failure spike after a third-party outage**: A payment provider had intermittent issues. The failure rate for the payment dependency jumped from 0.1% to 3%. Traditional monitoring with a 5% threshold would have missed it, but Smart Detection flagged it because the increase was statistically significant.

**Seasonal pattern violation**: An e-commerce application normally has higher traffic on weekdays. On a Tuesday, traffic was 50% below normal. Smart Detection flagged the anomaly, which turned out to be caused by a DNS issue affecting a specific region.

## Limitations

Smart Detection is not a replacement for metric alerts. Here are its limitations:

- **No real-time detection**: Smart Detection analyzes data in batches, typically every few hours. For real-time alerting, use metric alerts or Live Metrics.
- **No custom metrics**: Smart Detection only analyzes built-in telemetry types (requests, dependencies, exceptions, traces). It does not analyze custom events or custom metrics.
- **Limited customization**: You cannot adjust the sensitivity or the statistical model. It is a black box.
- **Email-centric**: Before migration to alert rules, Smart Detection only supports email notifications. After migration, it supports action groups.

## Wrapping Up

Smart Detection is a hands-off anomaly detection system that runs in the background and alerts you when your application deviates from its normal behavior. The configuration is minimal - enable the rules you care about, set up the email recipients, and let it learn. For best results, migrate Smart Detection to alert rules so you can route notifications through your existing action groups. Use it as a safety net alongside your manually configured metric alerts and log search alerts. It catches the issues you did not think to write alert rules for.
