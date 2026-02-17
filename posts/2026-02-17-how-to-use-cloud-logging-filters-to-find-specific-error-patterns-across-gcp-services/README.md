# How to Use Cloud Logging Filters to Find Specific Error Patterns Across GCP Services

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Cloud Logging, Log Filters, Error Analysis, Debugging

Description: Master Cloud Logging filter syntax to efficiently search for specific error patterns across all your GCP services, from basic queries to advanced regex and cross-service correlation.

---

When something breaks in production, you need to find the relevant logs fast. Cloud Logging ingests logs from dozens of GCP services, and if you do not know how to write effective filters, you will spend more time searching than fixing. The Logs Explorer query language is powerful but has enough quirks that it is worth learning properly.

Let me walk through the filter syntax from basics to advanced patterns, with real examples you can use right away.

## The Basics of Cloud Logging Filters

Cloud Logging filters use a comparison-based syntax. The simplest filter compares a field to a value.

```
severity = "ERROR"
```

You can combine conditions with `AND` and `OR`, and negate with `NOT`.

```
severity = "ERROR" AND resource.type = "cloud_run_revision"
```

Field paths use dot notation to access nested fields. For example, `resource.labels.service_name` drills into the resource object, then into labels, then into the service_name field.

## Filtering by Log Name

Every log entry has a `logName` field that identifies where it came from. This is useful when you want to narrow down to a specific log stream.

This filter finds all entries from Cloud Run request logs.

```
logName = "projects/my-project/logs/run.googleapis.com%2Frequests"
```

Note the URL encoding - forward slashes in the log name are encoded as `%2F`. You can also use the `logName:` operator (colon means "has") for partial matching.

```
# Find all audit-related logs
logName : "cloudaudit.googleapis.com"
```

## Filtering by Severity

Severity levels in Cloud Logging are: DEFAULT, DEBUG, INFO, NOTICE, WARNING, ERROR, CRITICAL, ALERT, EMERGENCY. You can use comparison operators for ranges.

This filter finds all log entries at ERROR level or above.

```
severity >= "ERROR"
```

## Searching Text Payloads

Many GCP services write plain text logs. To search within them, use the `:` operator for substring matching.

This filter finds log entries containing a specific error message.

```
textPayload : "connection refused"
```

For case-insensitive substring matching, you can use the `=~` regex operator.

```
# Case-insensitive search for connection errors
textPayload =~ "(?i)connection (refused|reset|timeout)"
```

## Searching JSON Payloads

Structured logs use `jsonPayload` instead of `textPayload`. You can drill into specific fields.

This filter looks for a specific error code in a JSON log field.

```
jsonPayload.error_code = "DEADLINE_EXCEEDED"
```

You can also check for the existence of a field.

```
# Find entries that have an error field, regardless of its value
jsonPayload.error : ""
```

## Advanced Regex Patterns

The `=~` and `!~` operators support RE2 regular expressions. These are extremely useful for finding error patterns.

This filter matches stack traces containing specific exception types.

```
textPayload =~ "(?:NullPointerException|ArrayIndexOutOfBoundsException|ClassCastException)"
```

Here is one that finds HTTP errors with specific status codes in the 5xx range.

```
httpRequest.status =~ "^5[0-9]{2}$"
```

And this finds error messages that contain what looks like a database connection string, which might indicate a configuration leak.

```
textPayload =~ "(?i)(jdbc|mongodb|mysql|postgres)://[^\\s]+"
```

## Cross-Service Error Patterns

When debugging distributed systems, you often need to find related errors across multiple services. Here are some practical patterns.

This filter finds errors from any Cloud Run service in the last hour.

```
resource.type = "cloud_run_revision"
AND severity >= "ERROR"
AND timestamp >= "2026-02-17T00:00:00Z"
```

This one finds timeout errors across Cloud Functions, Cloud Run, and App Engine.

```
(resource.type = "cloud_run_revision" OR resource.type = "cloud_function" OR resource.type = "gae_app")
AND (textPayload : "timeout" OR textPayload : "deadline exceeded" OR jsonPayload.message : "timeout")
AND severity >= "WARNING"
```

## Using the gcloud CLI for Log Searches

While the Logs Explorer is great for interactive searching, the gcloud CLI is better for scripting and automation.

This command searches for errors and outputs them in a readable format.

```bash
# Find the last 20 errors from Cloud Run services
gcloud logging read \
  'resource.type="cloud_run_revision" AND severity="ERROR"' \
  --limit=20 \
  --format='table(timestamp, resource.labels.service_name, textPayload)' \
  --freshness=1h
```

Here is a more complex search that finds connection errors and groups them by service.

```bash
# Find connection errors across all services in the last 6 hours
gcloud logging read \
  'severity >= "ERROR" AND (textPayload : "connection refused" OR textPayload : "connection reset" OR textPayload : "ECONNREFUSED")' \
  --limit=100 \
  --format=json \
  --freshness=6h | \
  jq -r '.[].resource.labels | "\(.service_name // .function_name // .module_id // "unknown")"' | \
  sort | uniq -c | sort -rn
```

## Correlation by Trace ID

In microservice architectures, requests often span multiple services. Cloud Logging includes a `trace` field that you can use to find all log entries for a single request.

First, find a log entry with an error and grab its trace ID.

```bash
# Find an error and extract its trace ID
gcloud logging read \
  'resource.type="cloud_run_revision" AND severity="ERROR"' \
  --limit=1 \
  --format='value(trace)'
```

Then search for all entries with that trace ID.

```
trace = "projects/my-project/traces/abc123def456"
```

This will show you every log entry across every service that was involved in that specific request.

## Saved Queries and Views

If you find yourself running the same filter frequently, save it as a query in the Logs Explorer. Click "Save" in the query bar, give it a name, and it appears in your saved queries list.

For team-wide access, create log views that pre-filter logs for specific use cases.

```bash
# Create a log view that only shows production errors
gcloud logging views create prod-errors \
  --bucket=_Default \
  --location=global \
  --log-filter='resource.labels.environment="production" AND severity >= "ERROR"' \
  --description="Production errors across all services"
```

## Common Filter Patterns Reference

Here is a quick reference of filters I use regularly.

```
# All GKE container errors
resource.type = "k8s_container" AND severity >= "ERROR"

# Cloud SQL slow queries
resource.type = "cloudsql_database" AND textPayload : "slow query"

# Load balancer 5xx responses
resource.type = "http_load_balancer" AND httpRequest.status >= 500

# Cloud Function cold starts
resource.type = "cloud_function" AND textPayload : "Function execution started"
AND labels."execution_id" != ""

# IAM permission denied errors
protoPayload.status.code = 7

# Failed API calls
protoPayload.status.message : "PERMISSION_DENIED"

# Specific user's actions in audit logs
protoPayload.authenticationInfo.principalEmail = "user@example.com"
AND logName : "cloudaudit.googleapis.com"
```

## Performance Tips

A few things to keep in mind when writing filters:

1. **Always include a time range**: Queries without a time constraint scan all retained logs, which is slow and expensive.

2. **Filter on indexed fields first**: `resource.type`, `logName`, `severity`, and `timestamp` are indexed. Put these conditions first in your filter for better performance.

3. **Avoid broad regex**: A regex like `textPayload =~ ".*error.*"` scans every character of every text payload. Use the `:` operator for simple substring matching instead.

4. **Use resource-specific filters**: Instead of searching all logs, narrow down to the resource type you care about. This reduces the amount of data Cloud Logging needs to scan.

## Wrapping Up

Effective log filtering is a skill that pays dividends during every incident. Learn the filter syntax, save your most-used queries, and use trace IDs for cross-service correlation. The few minutes you spend learning these patterns will save hours during your next outage.
