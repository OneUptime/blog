# How to Parse and Extract Fields from Custom Logs in Azure Log Analytics

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure Log Analytics, KQL, Custom Logs, Log Parsing, Data Extraction, Azure Monitor, Observability

Description: Learn how to parse unstructured custom log data in Azure Log Analytics using KQL functions to extract meaningful fields for analysis and alerting.

---

Not all logs come in clean, structured formats. When you ingest custom logs into Azure Log Analytics - whether from legacy applications, custom agents, or third-party systems - they often arrive as raw text strings. A line might look like `2024-03-15 14:22:01 ERROR [PaymentService] Failed to process payment for order #12345 - timeout after 30s`. That is useful for reading, but useless for querying until you extract the timestamp, severity, service name, order ID, and error reason into separate fields.

KQL provides powerful string parsing functions that let you extract structure from unstructured data. This guide covers the main techniques, from simple pattern matching to complex regex extraction.

## How Custom Logs Land in Log Analytics

Custom logs ingested through the Azure Monitor Agent, the HTTP Data Collector API, or custom log collection rules end up in tables you define. The raw log text typically lands in a column like `RawData` or a custom column name you specify in your data collection rule.

For example, if you configured a custom text log collection, your data might look like this in the `MyApp_CL` table:

| TimeGenerated | RawData |
|---|---|
| 2024-03-15T14:22:01Z | ERROR [PaymentService] Failed to process payment for order #12345 - timeout after 30s |
| 2024-03-15T14:22:03Z | INFO [OrderService] Order #12345 status changed to PAYMENT_FAILED |
| 2024-03-15T14:22:05Z | WARN [InventoryService] Stock level for SKU-789 below threshold: 3 remaining |

The challenge is turning these text blobs into queryable fields.

## Method 1: parse Operator

The `parse` operator is the simplest way to extract fields from text that follows a consistent pattern. It uses literal text as delimiters.

```kql
// Extract severity, service name, and message from log lines
MyApp_CL
| parse RawData with Severity:string " [" ServiceName:string "] " Message:string
| project TimeGenerated, Severity, ServiceName, Message
```

This works by matching the literal text between the field placeholders. The parser looks for a space followed by `[`, extracts text until `]`, then grabs everything after `] `.

For more complex patterns with multiple fields:

```kql
// Parse order-related log entries to extract order ID and action details
MyApp_CL
| where RawData contains "order"
| parse RawData with * "order #" OrderId:long " " Action:string
| where isnotempty(OrderId)
| project TimeGenerated, OrderId, Action
```

The `*` wildcard matches any text before the pattern, so it skips the severity and service name prefix.

## Method 2: parse-where Operator

`parse-where` is like `parse` but it filters out rows where the pattern does not match. This is useful when your log table contains multiple formats.

```kql
// Extract payment failure details, ignoring non-matching log lines
MyApp_CL
| parse-where RawData with * "[PaymentService] Failed to process payment for order #" OrderId:long " - " ErrorReason:string
| project TimeGenerated, OrderId, ErrorReason
```

Only rows that match the pattern are returned. With plain `parse`, non-matching rows would still appear with null values for the extracted fields.

## Method 3: extract Function with Regex

When your log format is irregular or you need more precise control, use the `extract` function with regular expressions.

```kql
// Use regex to extract specific fields from varied log formats
MyApp_CL
| extend Severity = extract(@"^(ERROR|WARN|INFO|DEBUG)", 1, RawData)
| extend ServiceName = extract(@"\[(\w+)\]", 1, RawData)
| extend OrderId = extract(@"order\s*#?(\d+)", 1, RawData)
| extend Duration = extract(@"(\d+)s$", 1, RawData)
| project TimeGenerated, Severity, ServiceName, OrderId, Duration
```

The `extract` function takes a regex pattern, a capture group number (1 for the first group), and the input string. It returns the matched text as a string - you can cast it to other types with `toint()`, `tolong()`, or `todatetime()`.

## Method 4: extract_all for Multiple Matches

When a single log line contains multiple instances of a pattern, use `extract_all`:

```kql
// Extract all IP addresses from a log line
MyApp_CL
| extend IPs = extract_all(@"(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})", RawData)
| mv-expand IP = IPs to typeof(string)
| project TimeGenerated, IP, RawData
```

## Method 5: split Function

For delimiter-separated values (CSV-like formats, pipe-delimited logs), `split` is the right tool:

```kql
// Parse pipe-delimited custom log format
// Format: timestamp|severity|service|request_id|message
MyApp_CL
| extend Fields = split(RawData, "|")
| extend
    LogTimestamp = tostring(Fields[0]),
    Severity = tostring(Fields[1]),
    Service = tostring(Fields[2]),
    RequestId = tostring(Fields[3]),
    Message = tostring(Fields[4])
| project TimeGenerated, Severity, Service, RequestId, Message
```

## Method 6: parse_json for JSON Logs

If your custom logs contain embedded JSON (common with modern application frameworks), use `parse_json`:

```kql
// Parse logs that contain JSON payloads
MyApp_CL
| where RawData startswith "{"
| extend ParsedLog = parse_json(RawData)
| extend
    Severity = tostring(ParsedLog.level),
    Service = tostring(ParsedLog.service),
    Message = tostring(ParsedLog.message),
    TraceId = tostring(ParsedLog.traceId),
    Duration = toint(ParsedLog.durationMs)
| project TimeGenerated, Severity, Service, Message, TraceId, Duration
```

For partially JSON logs (text prefix with JSON body):

```kql
// Extract and parse the JSON portion from mixed-format logs
MyApp_CL
| extend JsonPart = extract(@"(\{.*\})", 1, RawData)
| where isnotempty(JsonPart)
| extend Parsed = parse_json(JsonPart)
| extend ErrorCode = tostring(Parsed.errorCode)
| extend Details = tostring(Parsed.details)
| project TimeGenerated, ErrorCode, Details
```

## Creating Reusable Functions

If you find yourself writing the same parsing logic repeatedly, save it as a KQL function:

```kql
// Save this as a function named "ParseAppLogs"
// This makes the parsing reusable across multiple queries and alerts
let ParseAppLogs = () {
    MyApp_CL
    | parse RawData with Severity:string " [" ServiceName:string "] " Message:string
    | extend OrderId = extract(@"order\s*#?(\d+)", 1, Message)
    | extend ErrorReason = extract(@"- (.+)$", 1, Message)
};
ParseAppLogs
```

To save it as a workspace function:

1. Go to your Log Analytics workspace
2. Click on Functions in the left menu
3. Click New function
4. Paste the query, give it a name and category
5. Save

Now you can use `ParseAppLogs` in any query as if it were a table:

```kql
// Use the saved function in other queries
ParseAppLogs
| where Severity == "ERROR"
| where ServiceName == "PaymentService"
| summarize ErrorCount = count() by ErrorReason, bin(TimeGenerated, 1h)
| render timechart
```

## Data Collection Rule Transformations

Instead of parsing at query time, you can parse during ingestion using Data Collection Rule (DCR) transformations. This approach parses the data once and stores the extracted fields, which makes queries faster and simpler.

In your DCR, add a transformation:

```kql
// DCR transformation KQL - runs during ingestion
source
| parse RawData with Severity:string " [" ServiceName:string "] " Message:string
| extend OrderId = extract(@"order\s*#?(\d+)", 1, Message)
| project TimeGenerated, Severity, ServiceName, Message, OrderId
```

The advantage of DCR transformations is that:
- Parsing happens once at ingestion, not on every query
- You can filter out unwanted log lines before they are stored (reducing costs)
- The stored data has clean, typed columns

The downside is that if you need to change the parsing logic, it only applies to new data.

## Performance Tips for Parsing Queries

Parsing raw text is computationally expensive. Here are tips to keep your queries fast:

**Filter before parsing**: Narrow down the data before applying parse operations:

```kql
// Good: Filter first, then parse
MyApp_CL
| where TimeGenerated > ago(1h)
| where RawData contains "ERROR"
| parse RawData with * "[" ServiceName:string "] " Message:string
```

**Avoid regex when simple parsing works**: The `parse` operator is faster than `extract` with regex. Use regex only when the pattern is too irregular for `parse`.

**Use has instead of contains**: `has` uses the term index and is much faster than `contains` for filtering:

```kql
// Fast: uses term index
MyApp_CL | where RawData has "PaymentService"

// Slower: substring search without index
MyApp_CL | where RawData contains "Payment"
```

**Limit regex complexity**: Avoid greedy quantifiers and backtracking-heavy patterns. Simple capture groups with explicit character classes perform better.

## Practical Example: Building a Dashboard from Custom Logs

Combine parsing with summarization to build useful dashboards:

```kql
// Error rate by service over time
MyApp_CL
| where TimeGenerated > ago(24h)
| parse RawData with Severity:string " [" ServiceName:string "] " *
| where Severity == "ERROR"
| summarize ErrorCount = count() by ServiceName, bin(TimeGenerated, 1h)
| render timechart
```

```kql
// Top error reasons in the last hour
MyApp_CL
| where TimeGenerated > ago(1h)
| parse-where RawData with "ERROR [" ServiceName:string "] " ErrorMessage:string
| summarize Count = count() by ErrorMessage
| top 10 by Count
```

## Summary

Parsing custom logs in Azure Log Analytics is a matter of picking the right tool for the format. Use `parse` for consistent patterns, `extract` with regex for irregular formats, `split` for delimited data, and `parse_json` for JSON payloads. For frequently queried logs, consider DCR transformations to parse at ingestion time rather than query time. The goal is always the same - turn raw text into structured, queryable fields that let you build alerts, dashboards, and reports.
