# How to Sort the Top Ten OpenSearch Error Groups by Count in PPL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenSearch, Observability, Logging

Description: Rank OpenSearch error groups by event count with PPL, keeping aggregation, sorting, limits, and parsed-field restrictions in the correct order.

An error table is useful only if its first row represents the most frequent problem in the selected population. Taking ten log events and then counting their messages answers a different question from counting all matching events and taking the ten largest groups.

In PPL, the reliable sequence is **filter, group, sort by the count alias, then limit**. Start with a structured error identifier when your logs have one; parse the body when they do not.

## Establish the fields and population

The examples use a `logs-prod` index with `severityText` and `errorType` mapped as keywords. The timestamp is a date field. Confirm your actual mappings before copying field names:

```http
GET logs-prod/_mapping
```

An application-defined `errorType` such as `DatabaseTimeout` is often a better grouping key than a complete message containing request IDs. Otherwise, two occurrences of the same failure can become separate groups. A field named `errorType.keyword` is appropriate only if your mapping actually defines that subfield.

Use a fixed incident interval when comparing results across tools. For the initial query, assume that the chosen source already represents the period you want to inspect, or apply your timestamp filter immediately after `source`.

## Rank structured error groups

```text
source=`logs-prod`
| where severityText = 'ERROR'
| stats count() as error_count by errorType
| sort - error_count, + errorType
| head 10
```

The result contains at most ten groups. `error_count` is the number of matching events in each group, while `errorType` identifies the group. A secondary alphabetical sort makes equal counts easier to compare between refreshes.

The `sort` command defaults to ascending order, so the minus sign matters. Current PPL also documents suffix syntax such as `error_count desc`; keep one notation style throughout a single sort command. The prefix form above is easy to recognize in older examples. See the [sort reference](https://docs.opensearch.org/latest/sql-and-ppl/ppl/commands/sort/).

For a fixture with 12 database errors, 7 connection errors, and 3 authorization errors, the expected counts are 12, 7, and 3 in that order. If the results instead contain ten individual messages, inspect whether `stats` was omitted or the grouping field includes a unique value per request.

## Extract a group from unstructured messages

Suppose bodies have this shape:

```text
DatabaseTimeout: connection pool exhausted
AuthorizationDenied: invalid role for operation
```

Extract the prefix, reject unmatched or empty extractions before grouping, and sort on the aggregate alias:

```text
source=`logs-prod`
| where severityText = 'ERROR'
| parse body '(?<errorgroup>[^:]+):[\s\S]*'
| where isnotnull(errorgroup) and errorgroup != ''
| stats count() as error_count by errorgroup
| sort - error_count
| head 10
```

There is deliberately no secondary sort on `errorgroup` in this version. The official [parse documentation](https://docs.opensearch.org/latest/sql-and-ppl/ppl/commands/parse/) lists restrictions on filtering or sorting parsed fields after `stats`. Sorting the numeric aggregation alias avoids relying on that unsupported sequence. For stable alphabetical tie handling across engines, normalize the grouping key during ingestion and use the structured-field query instead.

The expression consumes the entire body, including any lines after the initial summary. It does not promise that every application's message follows the colon convention. Preview `body` and `errorgroup` together before accepting the classification.

## Avoid accidental sampling

This sequence is unsuitable for finding the global top ten:

```text
source=`logs-prod`
| where severityText = 'ERROR'
| head 10
| stats count() as error_count by errorType
```

It summarizes only ten input events. Moving `head` after `stats` but before `sort` is also wrong: it selects groups before ranking them. Limit after the sort unless the intended analysis is explicitly a sample.

Filters after aggregation require similar care. A service filter belongs before `stats` when the output no longer contains service names. A count threshold, such as keeping only groups with more than five events, belongs after the count exists.

## Check the meaning of the result

Keep a separate baseline:

```text
source=`logs-prod`
| where severityText = 'ERROR'
| stats count() as all_errors
```

The sum of the top ten need not equal `all_errors`: there may be more groups, missing group fields, or messages that did not match the extraction pattern. Investigate those categories instead of presenting the top ten as a complete error census.

There is also an accuracy boundary. The [stats reference](https://docs.opensearch.org/latest/sql-and-ppl/ppl/commands/stats/) explains that a pushed-down terms aggregation can produce approximate counts for high-cardinality grouping fields. Treat a close ranking as a triage aid; inspect the execution plan and underlying aggregation when exact counts are necessary.

## Conclusion

Give the count an explicit alias, sort it descending, and apply `head 10` last. Use a structured error key for repeatable rankings, and make parsing coverage and aggregation limits part of how you interpret the table.
