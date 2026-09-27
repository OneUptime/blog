# How to Keep Missing Service Names Visible in OpenSearch Log Aggregations

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenSearch, Observability, Logging

Description: Retain logs with missing service names in OpenSearch PPL aggregations by making null buckets explicit and normalizing missing values before grouping.

A service breakdown can look complete while omitting the logs that most need attention: events whose producer failed to identify its service. If the missing category disappears, a logging rollout can appear quieter instead of visibly incomplete.

Keep a total-event baseline, choose an explicit policy for missing names, and apply it before grouping. Do not assume that a null, an empty string, and a service named `unknown` mean the same thing.

## Inspect the service field first

These examples use `resource.attributes.service.name` in `logs-prod`. Verify the field and its type:

```http
POST logs-prod/_field_caps?fields=resource.attributes.service.name
```

Use the mapped keyword field intended for aggregation. Some indexes expose a differently named field or a keyword subfield; others already map the complete service path as a keyword. A guessed `.keyword` suffix can turn a schema mismatch into an apparent missing-data problem.

Start with the same source and incident time filter you will use for the breakdown:

```text
source=`logs-prod`
| stats count() as all_events
```

Save that count. It provides the denominator for assessing whether the breakdown accounts for the intended population.

## Preserve the null bucket explicitly

Current PPL documents a `bucket_nullable` option on `stats`:

```text
source=`logs-prod`
| stats bucket_nullable=true count() as events
        by `resource.attributes.service.name`
| sort - events
```

This asks for a null group instead of relying on a default. The [stats reference](https://docs.opensearch.org/latest/sql-and-ppl/ppl/commands/stats/) states that the default is tied to `plugins.ppl.syntax.legacy.preferred`; a query copied between deployments can therefore have different missing-bucket behavior.

Check your installed OpenSearch version before using the option. If an older engine rejects it, do not remove it and assume the remaining query preserves the same semantics. Normalize a grouping label explicitly or consult that version's supported syntax.

Count rows with `count()`, rather than counting the possibly missing service field. The question is how many events belong to each category, including the category without a service value.

## Create a visible label before grouping

For a dashboard, a named missing category is usually easier to recognize than a blank cell:

```text
source=`logs-prod`
| eval service_group = ifnull(`resource.attributes.service.name`, '[missing service]')
| stats count() as events by service_group
| sort - events
```

The sentinel is a display label for this query. It does not repair the stored document. Choose a value outside your real service-naming convention and document it so that an application cannot accidentally collide with the missing category.

OpenSearch's [conditional function reference](https://docs.opensearch.org/latest/sql-and-ppl/ppl/functions/condition/) documents `ifnull`, `nullif`, and `coalesce`. If empty strings should also count as missing, normalize them before applying the fallback:

```text
source=`logs-prod`
| eval service_group = ifnull(nullif(`resource.attributes.service.name`, ''), '[missing service]')
| stats count() as events by service_group
| sort - events
```

Whitespace-only values need an additional deliberate policy. Do not silently trim meaningful names unless your naming convention permits it. A useful fixture contains a valid service, a missing field, an explicit null, an empty string, and a whitespace-only string, with expectations written down before running the query.

## Handle multiple known schemas carefully

During migration, one source might use `serviceName` and another the OpenTelemetry resource path. On versions supporting `coalesce`, you can use a known precedence:

```text
source=`logs-prod`
| eval service_group = coalesce(
    nullif(`resource.attributes.service.name`, ''),
    nullif(serviceName, ''),
    '[missing service]')
| stats count() as events by service_group
| sort - events
```

The current reference identifies nested `ifnull` as an alternative before OpenSearch 3.1. It also notes that `coalesce` treats empty strings as real values, which is why the example converts them to null first.

Only reference alternate fields that belong to the schema you have inspected. Older engines can differ in how they resolve a field absent from the entire index. An index-specific query is a useful diagnostic before applying a cross-index expression.

## Reconcile and repair

Compare the total of all groups with `all_events` before adding `head`, chart limits, or other presentation filters. A top-ten visualization is not a reconciliation report. High-cardinality bucket aggregation limits can also affect counts, so investigate an unexplained difference in the query plan rather than hiding it with a label.

Then inspect representative missing-service events. Group them by another trustworthy attribute, such as a mapped deployment or container identifier, to identify the producer. Correct the resource metadata at its source. OpenTelemetry defines `service.name` as the logical service identifier in its [service resource conventions](https://opentelemetry.io/docs/specs/semconv/resource/).

Keep the missing category after the repair. It becomes a useful signal when a future deployment loses resource metadata again.

## Conclusion

Make missing-value handling explicit before `stats`, count events rather than populated service values, and reconcile the untruncated breakdown with a baseline. The missing-service bucket should remain visible until the producing system supplies a trustworthy identity.
