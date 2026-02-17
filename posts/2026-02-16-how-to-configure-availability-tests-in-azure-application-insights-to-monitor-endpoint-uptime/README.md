# How to Configure Availability Tests in Azure Application Insights to Monitor Endpoint Uptime

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure Application Insights, Availability Tests, Uptime Monitoring, Endpoint Monitoring, Cloud Monitoring, Web Testing

Description: A complete guide to setting up availability tests in Azure Application Insights to continuously monitor your web endpoints and get alerted when they go down.

---

You can have the most sophisticated monitoring stack in the world, but if you are not checking whether your endpoints are actually reachable from the outside, you are missing the most basic signal. Availability tests in Azure Application Insights ping your URLs from multiple locations around the globe at regular intervals and alert you when something stops responding.

This guide walks through setting up both basic URL ping tests and more advanced standard tests, configuring alerting, and troubleshooting common issues.

## Types of Availability Tests

Application Insights offers several types of availability tests:

1. **URL ping test** - The simplest option. Sends an HTTP GET request to a URL and checks for a successful response code. Can optionally validate that the response body contains a specific string.

2. **Standard test** - More full-featured. Supports HTTP GET, HEAD, and POST methods. Can send custom headers, validate SSL certificates, check response content, and handle redirects.

3. **Custom TrackAvailability test** - Write your own test logic using the Application Insights SDK. Useful when you need to test multi-step flows or non-HTTP protocols.

For most use cases, the standard test covers everything you need.

## Creating a Standard Availability Test

1. Navigate to your **Application Insights** resource in the Azure portal.
2. In the left menu, click **Availability**.
3. Click **Add Standard test**.
4. Fill in the configuration:
   - **Test name**: A descriptive name like "Homepage health check" or "API orders endpoint".
   - **URL**: The full URL to test, including `https://`.
   - **Parse dependent requests**: Enable this if you want the test to also load referenced resources (CSS, JS, images). For API health checks, leave this off.
   - **Enable retries**: Enable this to retry once on failure before marking the test as failed. Recommended to reduce false positives from transient network issues.
   - **SSL certificate validity**: Set the minimum number of days before SSL expiration. If the certificate will expire within this window, the test fails. This doubles as an SSL expiration monitor.
   - **Test frequency**: How often to run the test. Options are 5, 10, or 15 minutes. For critical endpoints, use 5 minutes.
   - **Test locations**: Select at least 5 locations for reliable results. Pick locations that match where your users are. Azure tests from data centers in regions like East US, West Europe, Southeast Asia, Brazil South, and others.
   - **Custom headers**: Add any required headers like `Authorization` or custom API keys.

5. Under **Success criteria**:
   - **HTTP response code**: Default is 200. You can accept ranges.
   - **Content match**: Optionally check that the response body contains a specific string. For a health check endpoint, you might look for "healthy" or "ok".

6. Click **Create**.

## Creating an Availability Test with ARM Templates

For repeatable deployments, use ARM templates.

```json
{
  "type": "Microsoft.Insights/webtests",
  "apiVersion": "2022-06-15",
  "name": "api-health-check",
  "location": "eastus",
  "tags": {
    "hidden-link:/subscriptions/<sub>/resourceGroups/<rg>/providers/Microsoft.Insights/components/<ai-name>": "Resource"
  },
  "properties": {
    "SyntheticMonitorId": "api-health-check",
    "Name": "API Health Check",
    "Enabled": true,
    "Frequency": 300,
    "Timeout": 30,
    "Kind": "standard",
    "RetryEnabled": true,
    "Locations": [
      { "Id": "us-tx-sn1-azr" },
      { "Id": "us-il-ch1-azr" },
      { "Id": "emea-gb-db3-azr" },
      { "Id": "emea-nl-ams-azr" },
      { "Id": "apac-hk-hkn-azr" }
    ],
    "Configuration": null,
    "Request": {
      "RequestUrl": "https://api.example.com/health",
      "HttpVerb": "GET",
      "ParseDependentRequests": false
    },
    "ValidationRules": {
      "ExpectedHttpStatusCode": 200,
      "SSLCheck": true,
      "SSLCertRemainingLifetimeCheck": 30
    }
  }
}
```

The `hidden-link` tag in the `tags` section is required to associate the web test with your Application Insights resource.

## Setting Up Alerts for Availability Test Failures

When you create an availability test, Application Insights automatically creates a default alert rule. However, you should review and customize it.

1. In the Availability section, click on your test name.
2. Click **Open Rules (Alerts) page** to see the associated alert.
3. Edit the alert to adjust:
   - **Number of failed locations**: By default, the alert fires if the test fails from 2 or more locations. This prevents false positives from a single region having a transient issue. For critical endpoints, you might set this to 1.
   - **Action group**: Make sure it points to the right action group for notifications.

You can also create custom alert rules based on availability test results using this KQL query.

```
// Alert query: availability test failures in the last 15 minutes
availabilityResults
| where timestamp > ago(15m)
| where success == false
| summarize FailedLocations = dcount(location) by name
| where FailedLocations >= 2
```

## Monitoring Authenticated Endpoints

Many API endpoints require authentication. Standard tests support custom headers, which means you can pass bearer tokens or API keys.

For bearer tokens that expire, you have a few options:

1. **Use a long-lived API key**: If your API supports API keys, create one specifically for monitoring and add it as a custom header.

2. **Use a custom TrackAvailability test**: Write an Azure Function that authenticates, gets a token, makes the request, and reports the result.

Here is a simplified example of a custom availability test in an Azure Function.

```csharp
// Azure Function that runs a custom availability test
// with authentication and reports results to Application Insights
[FunctionName("AvailabilityTest")]
public static async Task Run(
    [TimerTrigger("0 */5 * * * *")] TimerInfo timer,
    ILogger log)
{
    var telemetryClient = new TelemetryClient(
        TelemetryConfiguration.CreateDefault());

    var testName = "Authenticated API Check";
    var testLocation = Environment.GetEnvironmentVariable("REGION_NAME") ?? "custom";
    var startTime = DateTimeOffset.UtcNow;
    var success = false;

    try
    {
        // Get an auth token
        var token = await GetAccessToken();

        // Make the request
        using var client = new HttpClient();
        client.DefaultRequestHeaders.Authorization =
            new AuthenticationHeaderValue("Bearer", token);

        var response = await client.GetAsync("https://api.example.com/health");
        success = response.IsSuccessStatusCode;
    }
    catch (Exception ex)
    {
        log.LogError(ex, "Availability test failed");
    }
    finally
    {
        var availability = new AvailabilityTelemetry
        {
            Name = testName,
            RunLocation = testLocation,
            Success = success,
            Timestamp = startTime,
            Duration = DateTimeOffset.UtcNow - startTime
        };

        telemetryClient.TrackAvailability(availability);
        telemetryClient.Flush();
    }
}
```

## Understanding Test Results

In the Availability section of Application Insights, you can see:

- **Overall availability percentage** - The percentage of tests that passed over the selected time range.
- **Scatter plot** - Individual test results plotted over time. Green dots are successes, red dots are failures. The Y-axis shows response time.
- **Location breakdown** - Availability percentage per test location.

Click on any red dot to see the details of that specific test execution, including the HTTP status code, response time, response body, and any errors.

## Testing Behind Firewalls

If your endpoint is not publicly accessible, you need to allow traffic from the Azure test locations. Microsoft publishes the IP ranges for availability test locations as a service tag called `ApplicationInsightsAvailability`.

You can add this service tag to your firewall or NSG rules.

```bash
# Get the IP ranges for availability test locations
az network service-tag list \
  --location eastus \
  --query "values[?name=='ApplicationInsightsAvailability'].properties.addressPrefixes" \
  -o tsv
```

Alternatively, if you are using Azure Front Door or Application Gateway, you can allow traffic from these IPs at the network layer.

## Multi-Step Tests

The classic multi-step web tests (recorded in Visual Studio) have been deprecated. If you need to test multi-step flows like "log in, navigate to dashboard, check a value", use custom TrackAvailability tests with an Azure Function or Azure DevOps pipeline.

A typical pattern is:

1. Create an Azure Function on a timer trigger (every 5 minutes).
2. Use an HTTP client to execute the multi-step flow.
3. Report success or failure using the `TrackAvailability` API.
4. Set up alerts on the `availabilityResults` table in Log Analytics.

## Cost Considerations

Availability tests are billed based on the number of test executions. Each test location counts as one execution per interval. So a test running every 5 minutes from 5 locations generates approximately 1,440 executions per day. Azure provides a generous free tier (up to 10 tests), so for most users, the cost is negligible.

The data generated by availability tests (the `availabilityResults` table) counts toward your Log Analytics data ingestion. Each test result is small (a few hundred bytes), so the data volume is minimal unless you have hundreds of tests.

## Best Practices

- **Test from at least 5 locations** for reliable results. Fewer locations increase the chance of false positives from regional network issues.
- **Enable retries** to handle transient failures. A single dropped packet should not page your on-call engineer.
- **Set the SSL certificate check** to at least 30 days. This gives you plenty of warning before a certificate expires.
- **Test both your public endpoint and internal health check endpoint** (e.g., `/health` or `/ready`).
- **Keep test URLs stable**. If you refactor your URL structure, update the availability tests.
- **Review failed tests weekly**. Even if alerts are configured, periodically review the availability data to catch patterns.

## Wrapping Up

Availability tests are the outermost layer of your monitoring stack. They answer the most fundamental question: can users reach your application? Set them up for every critical endpoint, configure alerts with sensible failure thresholds, and use the SSL certificate check as a bonus monitoring feature. They take five minutes to configure and can save you hours of downtime by catching issues before your users do.
