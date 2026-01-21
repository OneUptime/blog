# How to Use LogQL Line Filters Effectively

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Grafana Loki, LogQL, Line Filters, Log Search, Regex Filters, Query Optimization

Description: A comprehensive guide to using LogQL line filters for efficient log searching in Grafana Loki, covering contains, regex, JSON filters, and performance optimization techniques.

---

Line filters in LogQL are the primary mechanism for searching log content in Loki. Understanding how to use them effectively is crucial for building performant queries. This guide covers all aspects of line filtering in LogQL.

## Prerequisites

Before starting, ensure you have:

- Grafana Loki deployed with log data
- Grafana connected to Loki as a data source
- Basic understanding of LogQL stream selectors
- Familiarity with regular expressions

## Understanding Line Filters

Line filters match against the raw log line text. They are applied after stream selection and before any parsing stages.

### Filter Operators

| Operator | Description | Example |
|----------|-------------|---------|
| `\|=` | Contains | `\|= "error"` |
| `!=` | Does not contain | `!= "debug"` |
| `\|~` | Regex matches | `\|~ "error\|warn"` |
| `!~` | Regex does not match | `!~ "health.*check"` |

## Contains Filter (|=)

### Basic Contains

```logql
# Find logs containing "error"
{job="app"} |= "error"

# Case-sensitive matching
{job="app"} |= "Error"
{job="app"} |= "ERROR"
```

### Multiple Contains (AND)

```logql
# Logs containing both "error" AND "database"
{job="app"} |= "error" |= "database"

# Three conditions
{job="app"} |= "timeout" |= "connection" |= "refused"
```

### Chained Contains (OR with Regex)

```logql
# Use regex for OR conditions
{job="app"} |~ "error|warning|critical"
```

## Does Not Contain (!=)

### Exclude Patterns

```logql
# Exclude health checks
{job="nginx"} != "healthcheck" != "health-check"

# Exclude debug logs
{job="app"} != "DEBUG" != "TRACE"
```

### Combine Include and Exclude

```logql
# Find errors, excluding known issues
{job="app"} |= "error" != "expected error" != "ignorable"
```

## Regex Filters (|~ and !~)

### Basic Regex Matching

```logql
# Match error or warning
{job="app"} |~ "(?i)error|warning"

# Match specific pattern
{job="nginx"} |~ "status=[45][0-9]{2}"
```

### Case-Insensitive Matching

```logql
# Use (?i) flag
{job="app"} |~ "(?i)error"

# Matches: error, Error, ERROR, eRrOr
```

### Word Boundaries

```logql
# Match "error" as whole word
{job="app"} |~ "\\berror\\b"

# Prevents matching "errors", "errorhandler"
```

### Character Classes

```logql
# Match any digit sequence
{job="app"} |~ "id=[0-9]+"

# Match IP addresses
{job="nginx"} |~ "[0-9]{1,3}\\.[0-9]{1,3}\\.[0-9]{1,3}\\.[0-9]{1,3}"
```

### Quantifiers

```logql
# One or more
{job="app"} |~ "retry[0-9]+"

# Zero or more
{job="app"} |~ "prefix.*suffix"

# Optional
{job="app"} |~ "https?://"

# Specific count
{job="app"} |~ "[a-f0-9]{8}"
```

### Alternation

```logql
# Multiple patterns
{job="app"} |~ "(error|exception|failure)"

# Match different log levels
{job="app"} |~ "level=(error|warn|fatal)"
```

### Negated Character Classes

```logql
# Match non-whitespace
{job="app"} |~ "user=[^\\s]+"

# Match until quote
{job="app"} |~ "message=\"[^\"]+\""
```

## JSON Filters

For JSON-formatted logs, use the json parser with filters:

### JSON Field Filtering

```logql
# Parse JSON and filter
{job="app"} | json | level = "error"

# Filter specific field value
{job="app"} | json | status_code >= 500
```

### JSON Contains

```logql
# Check if JSON field contains text
{job="app"} | json | message |= "timeout"
```

### Nested JSON

```logql
# Access nested fields
{job="app"} | json | json error_details from error | error_details |= "database"
```

## Logfmt Filters

For logfmt (key=value) logs:

```logql
# Parse and filter
{job="app"} | logfmt | level = "error"

# Multiple conditions
{job="app"} | logfmt | level = "error" | service = "payment"
```

## Filter Order and Optimization

### Filter Early

```logql
# Efficient - filter before parsing
{job="app"} |= "error" | json | status_code >= 500

# Less efficient - parse everything first
{job="app"} | json | status_code >= 500 |= "error"
```

### Most Selective First

```logql
# Put most selective filter first
{job="app"} |= "rare_event" |= "common_word"

# Better than
{job="app"} |= "common_word" |= "rare_event"
```

### Use Line Filters Before Regex

```logql
# Efficient
{job="nginx"} |= "500" |~ "status=5[0-9]{2}"

# Line filter narrows results before regex
```

## Real-World Examples

### Error Searching

```logql
# Find all errors
{job="app"} |~ "(?i)(error|exception|failed|failure)"

# Exclude expected errors
{job="app"} |~ "(?i)error" != "expected" != "ignored"
```

### HTTP Status Codes

```logql
# 4xx errors
{job="nginx"} |~ "\" 4[0-9]{2} "

# 5xx errors
{job="nginx"} |~ "\" 5[0-9]{2} "

# Specific status
{job="nginx"} |= "\" 503 "
```

### User Activity

```logql
# Find user actions
{job="app"} |~ "user_id=(12345|67890)"

# User login failures
{job="auth"} |= "login" |= "failed" |~ "user=[^\\s]+"
```

### Database Queries

```logql
# Slow queries
{job="postgresql"} |= "duration:" |~ "duration: [0-9]{4,}"

# Failed queries
{job="app"} |= "query" |~ "(error|failed|timeout)"
```

### API Endpoints

```logql
# Specific endpoint
{job="api"} |= "POST" |= "/api/orders"

# Multiple endpoints
{job="api"} |~ "/(users|orders|products)"
```

### Security Events

```logql
# Failed authentication
{job="auth"} |~ "(unauthorized|forbidden|denied|invalid.*token)"

# SQL injection attempts
{job="waf"} |~ "(union.*select|drop.*table|--)"
```

### Container Logs

```logql
# OOM events
{job="kubernetes"} |~ "(OOM|Out of memory|killed)"

# Container crashes
{job="kubernetes"} |~ "(CrashLoopBackOff|Error|Failed)"
```

## Combining Filters with Parsers

### Pattern Parser

```logql
{job="nginx"}
|= "error"
| pattern `<ip> - - [<_>] "<method> <path> <_>" <status> <_>`
| status >= 400
```

### Regex Parser with Line Filter

```logql
{job="app"}
|= "duration"
| regexp `duration=(?P<duration>[0-9]+)ms`
| duration > 1000
```

### JSON with Pre-Filter

```logql
{job="app"}
|= "error"
| json
| level = "error"
| status_code >= 500
```

## Metric Queries with Filters

### Error Rate

```logql
sum(rate(
  {job="app"} |= "error" [5m]
))
```

### Count by Pattern

```logql
sum by (status) (
  count_over_time(
    {job="nginx"}
    | pattern `<_> "<_>" <status> <_>`
    | status >= 400
    [5m]
  )
)
```

### Rate with Regex

```logql
rate(
  {job="api"} |~ "status=(4|5)[0-9]{2}" [5m]
)
```

## Performance Tips

### Use Specific Stream Selectors

```logql
# Good - specific selector
{job="nginx", env="production"} |= "error"

# Less efficient - broad selector
{job=~".*"} |= "error"
```

### Avoid Broad Regex

```logql
# Efficient
{job="app"} |= "error" |~ "code=[0-9]+"

# Less efficient
{job="app"} |~ ".*error.*code=[0-9]+.*"
```

### Use Time Ranges

```logql
# Narrow time window in Grafana
{job="app"} |= "error"
# Combined with dashboard time picker
```

### Limit Results

```logql
# For exploration
{job="app"} |= "rare_error" | limit 100
```

## Troubleshooting Filters

### No Results

```logql
# Check if logs exist
{job="app"} | limit 10

# Try broader filter
{job="app"} |~ "(?i)err"

# Check stream selector
{job="app"}
```

### Too Many Results

```logql
# Add more filters
{job="app"} |= "error" |= "database" |= "timeout"

# Be more specific
{job="app", env="production"} |= "critical error"
```

### Regex Not Matching

```logql
# Escape special characters
{job="app"} |~ "\\[ERROR\\]"

# Use raw string for clarity
{job="app"} |~ `\[ERROR\]`
```

## Filter Best Practices

### Do's

1. Filter as early as possible
2. Use contains (`|=`) before regex (`|~`)
3. Put most selective filters first
4. Use specific stream selectors
5. Escape special regex characters

### Don'ts

1. Avoid `.*` at start/end of regex
2. Don't use regex when contains works
3. Avoid overly complex patterns
4. Don't filter after heavy parsing

## Conclusion

Line filters are fundamental to efficient log querying in Loki. Key takeaways:

- Use `|=` for simple contains matching
- Use `|~` for pattern matching with regex
- Filter before parsing for better performance
- Combine multiple filters with AND logic
- Use case-insensitive matching with `(?i)`
- Put most selective filters first

With proper line filter usage, you can quickly find relevant logs even in large datasets.
