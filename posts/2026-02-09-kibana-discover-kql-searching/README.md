# How to Use Kibana Discover with KQL for Advanced Log Searching

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kibana, KQL, Search, Logs, Query Language

Description: Master Kibana Query Language (KQL) in Discover to search and filter logs effectively, including field queries, wildcards, logical operators, range queries, and nested field syntax for complex log analysis.

---

Kibana Query Language provides an intuitive syntax for searching logs in Kibana Discover. Unlike Lucene query syntax with its special characters and escaping rules, KQL uses plain language that matches how you think about your data. You type field names and values naturally, and KQL figures out the rest. This makes log searching accessible without requiring query language expertise.

## Understanding KQL Basics

KQL queries consist of field-value pairs connected by logical operators. The simplest query searches for a value in any field. More specific queries target particular fields. KQL automatically handles field types, so you don't worry about whether a field is text, keyword, or numeric.

The query bar in Discover accepts KQL by default. Type your query, and results update in real-time as you type. This immediate feedback makes it easy to refine searches iteratively until you find exactly what you need.

KQL distinguishes between free text search across all fields and field-specific searches. Understanding this distinction helps you write precise queries that return relevant results quickly.

## Basic Field Queries

Search specific fields using colon syntax:

```
log.level: ERROR
```

This finds all logs where the level field equals ERROR. Field names are case-sensitive, but values match case-insensitively by default.

Multiple field queries:

```
service.name: api AND log.level: ERROR
```

This returns errors from the api service only.

Query numeric fields:

```
http.response.status_code: 500
```

Finds logs with HTTP 500 status codes.

## Wildcard Searches

Use wildcards for partial matching:

```
message: *timeout*
```

Matches messages containing "timeout" anywhere in the text.

Wildcard at the beginning or end:

```
# Find services starting with "user"
service.name: user*

# Find log messages ending with "failed"
message: *failed
```

Multiple wildcards:

```
url.path: */api/*/users
```

Matches paths like /v1/api/internal/users or /v2/api/public/users.

## Logical Operators

Combine conditions with AND, OR, and NOT:

```
# AND: Both conditions must match
log.level: ERROR AND service.name: database

# OR: Either condition matches
log.level: ERROR OR log.level: WARN

# NOT: Exclude matches
log.level: ERROR NOT service.name: healthcheck
```

Group conditions with parentheses:

```
# Errors or warnings from critical services
(log.level: ERROR OR log.level: WARN) AND (service.name: api OR service.name: database)

# Exclude test and development environments
environment: production NOT (user.name: test* OR user.name: dev*)
```

Operator precedence follows standard logic rules: NOT, then AND, then OR. Use parentheses for clarity.

## Range Queries

Search numeric ranges:

```
# Response times over 1000ms
http.response.time > 1000

# Status codes in error range
http.response.status_code >= 400 AND http.response.status_code < 600

# Request size between 1MB and 10MB
request.size >= 1048576 AND request.size <= 10485760
```

Date range queries:

```
# Timestamp after a specific date
@timestamp > "2024-02-09"

# Events in February 2024
@timestamp >= "2024-02-01" AND @timestamp < "2024-03-01"
```

The time picker at the top handles date ranges more conveniently, but range queries work when you need specific boundaries.

## Searching Arrays and Multiple Values

Match any value in an array field:

```
# Find logs with specific tags
tags: error OR tags: critical OR tags: alert

# Shortened syntax
tags: (error OR critical OR alert)
```

Check if array contains all values:

```
# Both tags must be present
tags: production AND tags: critical
```

## Nested Field Queries

Search nested objects using dot notation:

```
# User information in nested structure
user.details.email: *@example.com

# Kubernetes metadata
kubernetes.pod.name: api-deployment-*

# HTTP request details
http.request.headers.user-agent: *Chrome*
```

Nested objects maintain their structure in KQL, making hierarchical data easy to query.

## Existence Queries

Check if a field exists:

```
# Logs that have an error_code field
error_code: *

# Logs missing the user field
NOT user: *
```

This works because wildcard matches any value, so the field must exist to match.

## Phrase Queries

Search for exact phrases in text fields:

```
# Exact phrase match
message: "connection refused"

# Partial phrase with wildcard
message: "connection * failed"
```

Quotes ensure words appear together in order, unlike separate terms that can appear anywhere.

## Case Sensitivity

KQL is case-insensitive for values by default:

```
# These are equivalent
log.level: error
log.level: ERROR
log.level: Error
```

Field names remain case-sensitive:

```
# Correct
log.level: ERROR

# Wrong (field name must match exactly)
Log.Level: ERROR
```

## Escaping Special Characters

KQL treats some characters specially. Escape them with backslashes when searching for literals:

```
# Search for actual asterisk
message: \*

# Search for colon
message: "http\://example.com"

# Search for parentheses
message: "error\(code\)"
```

Characters needing escaping include: *, ?, (, ), {, }, [, ], ", \, :, <, >

## Combining KQL with Filters

Filters provide a visual way to build queries. Add filters through the UI, then convert to KQL:

```
# Add filter: log.level is ERROR
# Add filter: service.name is api
# Add filter: @timestamp is in the last 15 minutes

# Equivalent KQL query
log.level: ERROR AND service.name: api
```

The time range stays separate from KQL, controlled by the time picker.

## Saved Queries

Save frequently used searches:

```
# Click "Save" in the query bar
# Name: "Production Errors"
# Query: log.level: ERROR AND environment: production
# Time filter: Last 24 hours
```

Load saved queries quickly without retyping. Share them with team members by exporting and importing.

## Advanced Search Patterns

Find logs missing expected fields:

```
# Requests without user authentication
http.request.method: POST AND NOT user.id: *
```

Search multiple fields for the same value:

```
# Username in any field
simon OR message: *simon* OR user.name: simon OR client.name: *simon*
```

Complex filtering for troubleshooting:

```
# Failed requests from mobile apps, excluding known issues
http.response.status_code >= 500 AND user_agent: *Mobile* NOT message: "rate limit exceeded" NOT url.path: /health
```

## Performance Optimization

Write efficient queries by being specific:

```
# Slow: Searches all fields
*timeout*

# Fast: Searches specific field
message: *timeout*

# Faster: Exact match instead of wildcard
error_code: ETIMEDOUT
```

Lead with indexed fields:

```
# Good: Starts with indexed keyword field
service.name: api AND message: *error*

# Less efficient: Starts with text search
message: *error* AND service.name: api
```

Avoid leading wildcards when possible:

```
# Slow: Leading wildcard scans all terms
url.path: *users

# Fast: Trailing wildcard uses index efficiently
url.path: /api/users*
```

## Real-World Search Examples

Find authentication failures:

```
log.level: ERROR AND (message: *authentication* OR message: *unauthorized* OR http.response.status_code: 401)
```

Identify slow database queries:

```
service.name: database AND duration > 5000 AND NOT query: *SELECT*COUNT*
```

Debug specific user session:

```
session.id: abc123 AND @timestamp >= "2024-02-09T10:00:00" AND @timestamp < "2024-02-09T11:00:00"
```

Monitor API rate limiting:

```
http.response.status_code: 429 AND service.name: api AND NOT client.ip: 10.*
```

Find memory-related errors:

```
(message: *OutOfMemory* OR message: *heap* OR message: *memory*) AND log.level: ERROR
```

## Discovering Available Fields

Explore available fields in the left sidebar:

```
# Click field names to see top values
# Click "+" to add field to table
# Click "Visualize" to create quick charts
```

Search for field names:

```
# In the field filter box
kubernetes
```

This shows all fields with "kubernetes" in their name, helping you discover the correct field names for queries.

## Switching to Lucene Syntax

Toggle between KQL and Lucene when needed:

```
# Disable KQL in query options
# Switch to Lucene for advanced features like fuzzy matching

# Lucene fuzzy search
message: timeout~2

# Lucene proximity search
message: "connection failed"~5
```

KQL covers most use cases, but Lucene offers additional operators for specialized searches.

## Building Queries Incrementally

Start broad and narrow down:

```
# Step 1: Find all errors
log.level: ERROR

# Step 2: From a specific service
log.level: ERROR AND service.name: api

# Step 3: Exclude expected errors
log.level: ERROR AND service.name: api NOT message: *rate limit*

# Step 4: In a specific time window
log.level: ERROR AND service.name: api NOT message: *rate limit* AND @timestamp >= "2024-02-09T10:00:00"
```

This iterative approach helps you understand your data and build precise queries.

## Conclusion

KQL makes log searching in Kibana Discover intuitive and powerful. By learning field queries, wildcards, logical operators, and range syntax, you can find relevant logs quickly without memorizing complex query languages. Start with simple field-value pairs, add logical operators as you refine your search, and use wildcards carefully to balance flexibility with performance. Save commonly used queries for quick access, and build complex searches incrementally to maintain clarity. Effective log searching with KQL turns your logs from a data dump into a powerful troubleshooting and analysis tool.
