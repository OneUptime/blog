# How to Filter OpenSearch Log Events by Timestamp with PPL Date Functions

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenSearch, Observability, Logging

Description: Build explicit OpenSearch PPL time filters with timestamp values, UTC date functions, half-open intervals, and mapping checks.

Time filters become hard to trust when an event timestamp, an ingestion timestamp, and the browser's displayed time zone are treated as the same thing. Start by choosing the field that answers your question, then compare it with typed timestamp boundaries.

For incident investigation, a fixed half-open interval is especially useful: include the start and exclude the end. It makes adjacent windows easy to reconcile and keeps the same query reproducible tomorrow.

## Confirm that the field represents event time

Inspect both the stored value and its mapping:

```http
GET logs-prod/_mapping

GET logs-prod/_search
{
  "size": 3,
  "_source": ["@timestamp", "time", "observedTime", "body"]
}
```

Use the actual event-time field produced by your pipeline. OpenTelemetry distinguishes the event's `Timestamp` from `ObservedTimestamp`, which records when the collection system observed it. Delayed delivery can make these differ substantially. See the [OpenTelemetry logs data model](https://opentelemetry.io/docs/specs/otel/logs/data-model/).

In these examples, `@timestamp` is mapped as `date` and contains event times normalized to UTC. PPL represents OpenSearch date fields as timestamps, as documented in [SQL and PPL data types](https://docs.opensearch.org/latest/sql-and-ppl/datatypes/).

## Use typed absolute boundaries

For a ten-minute window in UTC:

```text
source=`logs-prod`
| where `@timestamp` >= timestamp('2026-09-27 09:00:00')
    and `@timestamp` < timestamp('2026-09-27 09:10:00')
| sort + `@timestamp`
| fields `@timestamp`, body
| head 100
```

The event at exactly 09:00 is included. The event at exactly 09:10 belongs in the next window. Fractional-second events before 09:10 remain included without inventing an upper bound such as `09:09:59.999`.

These literals intentionally use the documented timestamp format. PPL date and time functions interpret input and output values as UTC. Confirm the browser display time zone before comparing it with the query boundaries. A label reading 10:00 in a local zone can represent the same instant as 09:00 UTC.

Do not compare a date field to a casually formatted string and rely on implicit conversion. Explicit types make the intended comparison easier to review and avoid confusing lexical ordering with chronological ordering.

## Calculate a rolling window

For recent events, use UTC functions:

```text
source=`logs-prod`
| where `@timestamp` >= date_sub(utc_timestamp(), interval 15 minute)
    and `@timestamp` < utc_timestamp()
| stats count() as recent_events
```

`utc_timestamp()` produces the current UTC timestamp, and `date_sub` subtracts the specified interval. Their signatures are documented in the [PPL date and time reference](https://docs.opensearch.org/latest/sql-and-ppl/ppl/functions/datetime/).

A rolling query intentionally changes on each execution. Use absolute timestamps when two people need to compare counts or when an export will be reconciled later. Also remember that “last 15 minutes of event time” excludes late arrivals describing older events; that is different from “documents ingested in the last 15 minutes.”

Current PPL offers additional relative-time forms, but older releases and query engines differ in available syntax. The explicit function form should still be checked against the reference for the installed version before becoming a saved production query.

## Filter before transforming or limiting

Apply the timestamp condition while the original date field is still available. Then parse bodies, calculate metrics, or group events:

```text
source=`logs-prod`
| where `@timestamp` >= timestamp('2026-09-27 09:00:00')
    and `@timestamp` < timestamp('2026-09-27 09:10:00')
| stats count() as events by severityText
```

Placing `head 100` first would restrict the population before the time condition is evaluated. Converting every timestamp to a formatted date string before filtering also obscures type semantics and can make efficient filtering harder.

For a slow query, inspect the plan rather than guessing:

```http
POST /_plugins/_ppl/_explain
{
  "query": "source=`logs-prod` | where `@timestamp` >= timestamp('2026-09-27 09:00:00') and `@timestamp` < timestamp('2026-09-27 09:10:00') | stats count()"
}
```

The [Explain API](https://docs.opensearch.org/latest/sql-and-ppl/sql-and-ppl-api/index/) exposes how the installed engine executes the query. Expression pushdown and plans can change between versions, so use the actual response when diagnosing performance.

## Test boundaries and unexpected omissions

Use a fixture with events just before the start, exactly at the start, just before the end, and exactly at the end. Check an event with no timestamp separately; it cannot satisfy an ordinary timestamp range comparison.

If the API and Dashboards disagree, compare the selected dataset, time field, absolute bounds, and time zone. An additional UI time filter can narrow an otherwise valid PPL query. Avoid changing date parsing until the two requests select the same population.

## Conclusion

Choose event time deliberately, confirm a date mapping, and use typed timestamp boundaries. Fixed half-open windows support reproducible investigations; UTC date functions support rolling views when changing results are expected.
