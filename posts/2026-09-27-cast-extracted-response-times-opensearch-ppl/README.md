# How to Cast Extracted Response Times Before OpenSearch PPL Aggregation

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenSearch, Observability, Logging

Description: Convert response times extracted by OpenSearch PPL parse into numeric values before averaging, comparing, or sorting them.

A response time that looks numeric in a results table can still be a string. That matters when a log parser extracts `9`, `80`, and `120`: lexical ordering and numeric ordering do not describe the same performance distribution.

Make the conversion explicit before aggregation. Keep the extracted string and the numeric measurement in different fields, preserve the unit in the field name, and examine rejected messages separately.

## Start with the log contract

This example assumes an OpenSearch index named `access-logs` whose `body` field contains messages like:

```text
request_id=a1 route=/checkout response_time_ms=9
request_id=a2 route=/checkout response_time_ms=80.5
request_id=a3 route=/checkout response_time_ms=120
```

The intended measurement is a nonnegative decimal number of milliseconds. An absent value, a timeout label, and an actual zero are three different observations. Decide that contract before writing a regular expression.

The official [parse reference](https://docs.opensearch.org/latest/sql-and-ppl/ppl/commands/parse/) specifies that named captures create string fields. The extraction itself does not infer a floating-point type from the characters it finds.

## Preview the extraction

```text
source=`access-logs`
| parse body '(?:.*[ ])?response_time_ms=(?<responsetimetext>[0-9]+(?:[.][0-9]+)?)(?:[ ]+.*)?'
| fields body, responsetimetext
| head 20
```

This pattern assumes a single-line message, the exact field name at the start or after an ordinary space, and ordinary spaces after the value. It accepts integers and decimal fractions; it intentionally does not accept scientific notation, negative durations, or a unit suffix. Update the log contract and expression together if your producer uses another format.

Test at least one valid integer, one decimal, one missing value, and one malformed value. A message ending in `response_time_ms=80ms` should not quietly contribute `80` to this calculation. Requiring the value to end at the message boundary or before a space prevents that partial interpretation.

## Cast into a new field

```text
source=`access-logs`
| parse body '(?:.*[ ])?response_time_ms=(?<responsetimetext>[0-9]+(?:[.][0-9]+)?)(?:[ ]+.*)?'
| where isnotnull(responsetimetext) and responsetimetext != ''
| eval response_time_ms = cast(responsetimetext as double)
| fields body, responsetimetext, response_time_ms
| head 20
```

`double` retains fractional milliseconds. Use an integer type only when dropping fractions is appropriate for the producer's data model. The [conversion reference](https://docs.opensearch.org/latest/sql-and-ppl/ppl/functions/conversion/) documents `cast(expression as type)` and warns that invalid numeric strings can fail conversion.

Avoid overwriting `responsetimetext`. Besides preserving the original value for diagnosis, this respects documented restrictions around modifying fields produced by `parse`. A separate alias makes the transformation visible to anyone reviewing the query.

## Aggregate the measurement

Once the preview is correct, replace the final projection with aggregation:

```text
source=`access-logs`
| parse body '(?:.*[ ])?response_time_ms=(?<responsetimetext>[0-9]+(?:[.][0-9]+)?)(?:[ ]+.*)?'
| where isnotnull(responsetimetext) and responsetimetext != ''
| eval response_time_ms = cast(responsetimetext as double)
| stats count() as measured_requests,
        avg(response_time_ms) as mean_ms,
        min(response_time_ms) as fastest_ms,
        max(response_time_ms) as slowest_ms
```

For the three sample values, the expected count is 3, minimum is 9, maximum is 120, and mean is approximately 69.83 milliseconds. Those are arithmetic expectations for the fixture, not a benchmark of a particular cluster.

A grouped version can add a mapped service or route field after `by`. Keep the same numeric alias inside every numeric aggregation. Do not calculate an average of formatted strings such as `"80.5 ms"`, and do not infer a change in latency from a change in units.

The [aggregation function documentation](https://docs.opensearch.org/latest/sql-and-ppl/ppl/functions/aggregations/) describes the supported metrics; availability and execution behavior should be checked against your installed OpenSearch version.

## Account for excluded events

Run the same source and time filter with only `stats count()` to count candidate requests. Compare that baseline with `measured_requests`. A fall from 10,000 requests to 4,000 measurements may indicate a producer format change, even if the average of the remaining rows looks healthy.

Do not fill invalid durations with zero. That would make missing telemetry appear fast. Keep a parsing-failure count or inspect unmatched bodies, then correct the producer or ingestion transform. Timeouts may need their own metric because they can lack a completed response time entirely.

For repeated dashboards, store a numeric duration at ingestion using an explicit mapping. The [numeric field documentation](https://docs.opensearch.org/latest/mappings/supported-field-types/numeric/) helps select the stored type. Query-time extraction is useful during investigation, but it repeats parsing work and makes measurement coverage dependent on a regular expression.

## Conclusion

Extract into a string field, validate the accepted format, cast into a separate numeric field, and aggregate that field. Report the number of measured requests alongside latency so missing or malformed values remain visible.
