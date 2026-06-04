# How to Use Kibana Discover with KQL for Advanced Log Searching

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kibana, KQL, Search, Log, Query Language

Description: Master Kibana Query Language (KQL) in Discover to search and filter logs effectively, including field queries, wildcards, logical operators, range queries.

---

Kibana Query Language provides an intuitive syntax for searching logs in Kibana Discover. Unlike Lucene query syntax with its special characters and escaping rules, KQL uses plain language that matches how you think about your data. You type field names and values naturally, and KQL figures out the rest. This makes log searching accessible without requiring query language expertise.

## Understanding KQL Basics

KQL queries consist of field-value pairs connected by logical operators. The simplest query searches for a value in any field. More specific queries target particular fields. KQL uses the field mappings in Elasticsearch, so text, keyword, numeric, boolean, and date fields can behave differently.

The query bar in Discover accepts KQL by default. Type your query, then press Enter or click the refresh button to run it. The query bar also prompts you with available fields and operators as you type, making it easier to refine searches iteratively until you find exactly what you need.

KQL distinguishes between free text search across all fields and field-specific searches. Understanding this distinction helps you write precise queries that return relevant results quickly.

## Basic Field Queries

Search specific fields using colon syntax:

```text
log.level: ERROR
```

This finds all logs where the level field equals ERROR. Field names are case-sensitive. Values on keyword, numeric, date, and boolean fields must match exactly, including case for keyword fields. Text fields are analyzed according to their mapping.

Multiple field queries:

```text
service.name: api AND log.level: ERROR
```

This returns errors from the api service only.

Query numeric fields:

```text
http.response.status_code: 500
```

Finds logs with HTTP 500 status codes.

## Wildcard Searches

Use wildcards for partial matching. KQL supports `*`, which matches zero or more characters:

```text
message: timeout*
```

Matches messages with terms that start with "timeout".

Wildcard at the end:

```text
service.name: user*
```

Multiple wildcards:

```text
url.path: /api/*/users
```

Matches paths like /api/internal/users or /api/public/users. Leading wildcards, such as `*timeout`, are disabled by default for performance reasons unless the `query:allowLeadingWildcards` advanced setting is enabled.

## Logical Operators

Combine conditions with AND, OR, and NOT:

```text
log.level: ERROR AND service.name: database

log.level: ERROR OR log.level: WARN

log.level: ERROR AND NOT service.name: healthcheck
```

Group conditions with parentheses:

```text
(log.level: ERROR OR log.level: WARN) AND (service.name: api OR service.name: database)

environment: production AND NOT (user.name: test* OR user.name: dev*)
```

Operator precedence follows standard logic rules: NOT, then AND, then OR. Use parentheses for clarity.

## Range Queries

Search numeric ranges:

```text
http.response.time > 1000

http.response.status_code >= 400 AND http.response.status_code < 600

request.size >= 1048576 AND request.size <= 10485760
```

Date range queries:

```text
@timestamp > "2024-02-09"

@timestamp >= "2024-02-01" AND @timestamp < "2024-03-01"
```

The time picker at the top handles date ranges more conveniently, but range queries work when you need specific boundaries.

## Searching Arrays and Multiple Values

Match any value in an array field:

```text
tags: error OR tags: critical OR tags: alert

tags: (error OR critical OR alert)
```

Check if array contains all values:

```text
tags: production AND tags: critical
```

## Object and Nested Field Queries

Search object fields using dot notation:

```text
user.details.email: alice@example.com

kubernetes.pod.name: api-deployment-*

http.request.headers.user-agent: Chrome*
```

For fields mapped as the Elasticsearch `nested` type, use KQL's nested query syntax so the conditions match the same nested object:

```text
user:{ first: "Alice" AND last: "White" }
```

## Existence Queries

Check if a field exists:

```text
error_code: *

NOT user: *
```

This works because wildcard matches any value, so the field must exist to match.

## Phrase Queries

Search for exact phrases in text fields:

```text
message: "connection refused"
```

Quotes ensure words appear together in order, unlike separate terms that can appear anywhere. For wildcard matching, use unquoted wildcard terms instead of putting wildcards inside a quoted phrase.

## Case Sensitivity

KQL value matching depends on the field mapping. Keyword fields require an exact value, including case:

```text
log.level: ERROR
```

On text fields, the analyzer configured for the field controls how terms are normalized and matched.

Field names remain case-sensitive:

```text
log.level: ERROR

Log.Level: ERROR
```

## Escaping Special Characters

KQL treats some characters specially. Escape them with backslashes when searching for literals:

```text
message: \*

message: "http://example.com"

message: error\(code\)
```

Characters needing escaping outside quotes include: `\`, `(`, `)`, `:`, `<`, `>`, `"`, and `*`.

## Combining KQL with Filters

Filters provide a visual way to build queries. Add filters through the UI, then combine them with KQL:

```text
log.level: ERROR AND service.name: api
```

The time range stays separate from KQL, controlled by the time picker.

## Saved Queries

Save frequently used queries:

```text
log.level: ERROR AND environment: production
```

Use the saved query menu in the query bar to save query text, filters, and optionally the time filter. Saved Discover sessions are separate and preserve the Discover view, including selected columns, sorting, filters, and the data view.

## Advanced Search Patterns

Find logs missing expected fields:

```text
http.request.method: POST AND NOT user.id: *
```

Search multiple fields for the same value:

```text
simon OR message: simon* OR user.name: simon OR client.name: simon*
```

Complex filtering for troubleshooting:

```text
http.response.status_code >= 500 AND user_agent: Mobile* AND NOT message: "rate limit exceeded" AND NOT url.path: /health
```

## Performance Optimization

Write efficient queries by being specific:

```text
timeout

message: timeout

error_code: ETIMEDOUT
```

Use exact indexed fields when possible:

```text
service.name: api AND message: error

service.name: api AND error_code: ETIMEDOUT
```

Avoid leading wildcards when the setting allows them:

```text
url.path: *users

url.path: /api/users*
```

## Real-World Search Examples

Find authentication failures:

```text
log.level: ERROR AND (message: authentication* OR message: unauthorized* OR http.response.status_code: 401)
```

Identify slow database queries:

```text
service.name: database AND duration > 5000 AND NOT query: SELECT*COUNT*
```

Debug specific user session:

```text
session.id: abc123 AND @timestamp >= "2024-02-09T10:00:00" AND @timestamp < "2024-02-09T11:00:00"
```

Monitor API rate limiting:

```text
http.response.status_code: 429 AND service.name: api AND NOT client.ip: 10.*
```

Find memory-related errors:

```text
(message: OutOfMemory* OR message: heap* OR message: memory*) AND log.level: ERROR
```

## Discovering Available Fields

Explore available fields in the left sidebar:

```text
# Click field names to see top values
# Click "+" to add field to table
# Click "Visualize" to create quick charts
```

Search for field names:

```text
kubernetes
```

This shows all fields with "kubernetes" in their name, helping you discover the correct field names for queries.

## Switching to Lucene Syntax

Toggle between KQL and Lucene when needed. Lucene syntax is selected from the query language menu in the query bar:

```text
message: timeout~2

message: "connection failed"~5
```

KQL covers most use cases, but Lucene offers additional operators for specialized searches.

## Building Queries Incrementally

Start broad and narrow down:

```text
log.level: ERROR

log.level: ERROR AND service.name: api

log.level: ERROR AND service.name: api AND NOT message: "rate limit"

log.level: ERROR AND service.name: api AND NOT message: "rate limit" AND @timestamp >= "2024-02-09T10:00:00"
```

This iterative approach helps you understand your data and build precise queries.

## Conclusion

KQL makes log searching in Kibana Discover intuitive and powerful. By learning field queries, wildcards, logical operators, and range syntax, you can find relevant logs quickly without memorizing complex query languages. Start with simple field-value pairs, add logical operators as you refine your search, and use wildcards carefully to balance flexibility with performance. Save commonly used queries for quick access, and build complex searches incrementally to maintain clarity. Effective log searching with KQL turns your logs from a data dump into a powerful troubleshooting and analysis tool.
