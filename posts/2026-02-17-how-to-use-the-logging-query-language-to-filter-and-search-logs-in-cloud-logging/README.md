# How to Use the Logging Query Language to Filter and Search Logs in Cloud Logging

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Cloud Logging, Logging Query Language, Log Search, Troubleshooting

Description: A comprehensive guide to the Cloud Logging query language syntax, operators, and patterns for efficiently filtering and searching logs in GCP.

---

Cloud Logging stores enormous amounts of data, and finding what you need quickly depends on knowing how to write effective queries. The Logging query language is the primary way to filter logs in the Logs Explorer, define log sinks, create exclusion filters, and build log-based metrics and alerts. Mastering it pays off every time you need to debug something in production.

In this post, I will cover the query language syntax from basics to advanced patterns, with practical examples you can use right away.

## Query Language Basics

The Logging query language uses a simple structure of field comparisons combined with boolean operators.

### Basic Equality

The simplest query matches a field value exactly:

```
severity=ERROR
```

This finds all log entries with ERROR severity.

### String Matching

Use quotes for values with spaces or special characters:

```
textPayload="Connection refused"
```

### Comparison Operators

Available operators:

| Operator | Meaning |
|----------|---------|
| `=` | Equal |
| `!=` | Not equal |
| `>` | Greater than |
| `<` | Less than |
| `>=` | Greater than or equal |
| `<=` | Less than or equal |
| `:` | Has (substring match) |
| `=~` | Regular expression match |
| `!~` | Regular expression not match |

### The Has Operator

The `:` operator is one of the most useful. It performs a substring match within a field:

```
textPayload:"connection timeout"
```

This finds log entries where `textPayload` contains "connection timeout" anywhere in the string. Unlike `=`, it does not require an exact match.

For nested fields, `:` checks if the parent field contains the value anywhere in its structure:

```
jsonPayload:"database error"
```

This searches through all fields within `jsonPayload` for the string "database error."

## Combining Filters

### AND (Implicit)

Multiple expressions on separate lines or separated by spaces are implicitly ANDed:

```
resource.type="cloud_run_revision"
severity>=ERROR
```

This is the same as:

```
resource.type="cloud_run_revision" AND severity>=ERROR
```

### OR

Use `OR` explicitly:

```
severity=ERROR OR severity=CRITICAL
```

### NOT

Negate a condition:

```
NOT severity=DEBUG
```

Or:

```
severity!=DEBUG
```

### Grouping with Parentheses

Combine complex conditions:

```
resource.type="cloud_run_revision" AND (severity=ERROR OR severity=CRITICAL)
```

## Filtering by Common Fields

### By Resource Type

```
# Compute Engine instances
resource.type="gce_instance"

# Cloud Run services
resource.type="cloud_run_revision"

# GKE containers
resource.type="k8s_container"

# Cloud SQL databases
resource.type="cloudsql_database"

# Cloud Functions
resource.type="cloud_function"
```

### By Severity

Severity levels in order: DEFAULT, DEBUG, INFO, NOTICE, WARNING, ERROR, CRITICAL, ALERT, EMERGENCY.

```
# Exact severity
severity=ERROR

# Severity at or above a level
severity>=WARNING

# Multiple specific severities
severity=ERROR OR severity=CRITICAL
```

### By Log Name

```
# Specific log
logName="projects/my-project/logs/cloudaudit.googleapis.com%2Factivity"

# Log name contains (partial match)
logName:"cloudaudit.googleapis.com"

# Syslog
logName:"syslog"
```

### By Timestamp

```
# After a specific time
timestamp>="2026-02-17T10:00:00Z"

# Before a specific time
timestamp<="2026-02-17T12:00:00Z"

# Time range
timestamp>="2026-02-17T10:00:00Z" AND timestamp<="2026-02-17T12:00:00Z"

# Relative time (use the time picker in the UI for this)
```

### By Resource Labels

```
# Specific VM instance
resource.labels.instance_id="1234567890"

# Specific Cloud Run service
resource.labels.service_name="my-api"

# Specific GKE namespace
resource.labels.namespace_name="production"

# Specific GKE cluster
resource.labels.cluster_name="prod-cluster"
```

## Searching Log Content

### Text Payload Searches

```
# Exact match
textPayload="Error: connection refused"

# Substring match
textPayload:"connection refused"

# Regular expression
textPayload=~"error.*timeout.*\d+ seconds"

# Case-insensitive regex
textPayload=~"(?i)fatal error"
```

### JSON Payload Searches

When your application writes structured JSON logs, you can filter on specific fields:

```
# Exact field value
jsonPayload.user_id="12345"

# Numeric comparison
jsonPayload.response_time_ms>1000

# Nested field
jsonPayload.error.code="NOT_FOUND"

# Substring in a JSON field
jsonPayload.message:"database"

# Boolean field
jsonPayload.is_retry=true
```

### Proto Payload Searches (Audit Logs)

Audit logs use `protoPayload`:

```
# Specific API method
protoPayload.methodName="SetIamPolicy"

# Specific service
protoPayload.serviceName="compute.googleapis.com"

# Specific caller
protoPayload.authenticationInfo.principalEmail="admin@company.com"

# Failed operations
protoPayload.status.code!=0
```

## HTTP Request Fields

For logs that include HTTP request data:

```
# Specific status code
httpRequest.status=500

# Status code range
httpRequest.status>=400

# Specific URL path
httpRequest.requestUrl="/api/users"

# URL contains
httpRequest.requestUrl:"/api/"

# Specific HTTP method
httpRequest.requestMethod="POST"

# Slow requests (latency in seconds)
httpRequest.latency.seconds>5
```

## Advanced Patterns

### Combining Resource and Content Filters

Find errors in a specific service:

```
resource.type="cloud_run_revision"
resource.labels.service_name="payment-service"
severity>=ERROR
jsonPayload.error.type="PaymentDeclined"
```

### Finding Logs Around a Specific Event

Use the time range with content filters:

```
resource.type="gce_instance"
resource.labels.instance_id="1234567890"
timestamp>="2026-02-17T10:25:00Z"
timestamp<="2026-02-17T10:35:00Z"
```

### Searching Across Multiple Resource Types

```
(resource.type="cloud_run_revision" OR resource.type="k8s_container")
severity>=ERROR
textPayload:"database"
```

### Using Regular Expressions for Pattern Matching

```
# Match IP addresses in logs
textPayload=~"\\d{1,3}\\.\\d{1,3}\\.\\d{1,3}\\.\\d{1,3}"

# Match specific error code patterns
jsonPayload.error_code=~"ERR-[0-9]{4}"

# Match email addresses
textPayload=~"[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}"
```

### Excluding Noise from Search Results

```
# Find errors but exclude health check noise
severity>=ERROR
NOT httpRequest.requestUrl="/healthz"
NOT textPayload:"health check"
```

### Using the sample Function

When you have too many results and want a representative subset:

```
resource.type="cloud_run_revision"
sample(insertId, 0.1)
```

This returns approximately 10 percent of matching log entries.

## Query Language in Different Contexts

The same query language is used in multiple places, but with slight differences:

### Logs Explorer
Full query language support with the UI's time picker handling timestamp filtering.

### Log Sinks
Filters determine which logs a sink routes:

```bash
gcloud logging sinks create my-sink \
  storage.googleapis.com/my-bucket \
  --log-filter='severity>=WARNING AND resource.type="cloud_run_revision"'
```

### Exclusion Filters
Filters determine which logs are excluded:

```bash
gcloud logging sinks update _Default \
  --add-exclusion="name=exclude-debug,filter=severity=DEBUG"
```

### Log-Based Metrics
Filters determine which logs increment the metric:

```bash
gcloud logging metrics create error-count \
  --log-filter='severity>=ERROR AND resource.type="cloud_run_revision"'
```

## Performance Tips

1. **Be specific with resource type**: Always include `resource.type` when possible. It dramatically narrows the search space.

2. **Use time ranges**: The Logs Explorer defaults to the last hour. For broader searches, expand the time range, but keep it as narrow as possible for faster results.

3. **Prefer indexed fields**: Fields like `severity`, `resource.type`, `resource.labels`, and `logName` are indexed and search faster than content fields like `textPayload` or `jsonPayload`.

4. **Use `:` instead of `=~` when possible**: The has operator (`:`) is faster than regular expressions (`=~`). Use regex only when you need pattern matching.

5. **Avoid broad content searches**: Searching `textPayload:"error"` across all resource types and time ranges is slow. Narrow it down with resource type and severity filters first.

## Wrapping Up

The Logging query language is your primary tool for navigating Cloud Logging data. The most important things to remember: use `resource.type` to narrow your scope, use severity filters to focus on what matters, use the `:` operator for flexible substring matching, and combine filters with AND/OR for precise results. Build a library of common queries for your environment and you will spend less time searching and more time solving problems.
