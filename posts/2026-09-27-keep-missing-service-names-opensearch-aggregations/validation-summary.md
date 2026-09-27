# Validation Summary: How to Keep Missing Service Names Visible in OpenSearch Log Aggregations

## Status

validated

## Post Type

Technical guide with OpenSearch REST API and PPL query examples.

## Technologies Covered

- OpenSearch field mappings and field capabilities API
- OpenSearch Piped Processing Language (PPL)
- Log aggregation and missing-value normalization
- OpenTelemetry service resource attributes

## Sources Consulted

- [OpenSearch stats command](https://docs.opensearch.org/latest/sql-and-ppl/ppl/commands/stats/) — grouping syntax, null buckets, default behavior, and high-cardinality limitations.
- [OpenSearch conditional functions](https://docs.opensearch.org/latest/sql-and-ppl/ppl/functions/condition/) — ifnull, nullif, coalesce, missing values, and version guidance.
- [OpenSearch aggregation functions](https://docs.opensearch.org/latest/sql-and-ppl/ppl/functions/aggregations/) — row counts and field-value counts.
- [OpenSearch field capabilities API](https://docs.opensearch.org/latest/api-reference/search-apis/field-caps/) — POST endpoint and fields parameter.
- [OpenSearch keyword field type](https://docs.opensearch.org/latest/mappings/supported-field-types/keyword/) — aggregation support, subfields, and mapping behavior.
- [OpenSearch eval command](https://docs.opensearch.org/latest/sql-and-ppl/ppl/commands/eval/) — computed field assignment.
- [OpenSearch sort command](https://docs.opensearch.org/latest/sql-and-ppl/ppl/commands/sort/) — descending sort syntax and default result count.
- [OpenTelemetry resource semantic conventions](https://opentelemetry.io/docs/specs/semconv/resource/) and [service semantic conventions](https://opentelemetry.io/docs/specs/semconv/resource/service/) — service.name meaning and resource conventions.
- [Author GitHub profile](https://github.com/nawazdhandala) — author link destination.

## Issues Found

No technical issues found.

## Review Notes

- Reviewed all six examples: the field capabilities request, baseline count, explicit null bucket, null fallback, empty-string normalization, and schema-precedence expression. No README changes were necessary.
- The documented stats syntax accepts bucket_nullable before the aggregation. Its default follows plugins.ppl.syntax.legacy.preferred, so explicitly enabling it is appropriate. The documented dotted service field and descending sort syntax match the examples.
- count() counts events; counting a service-field expression excludes null and missing values. Normalizing a non-null display label before grouping preserves the intended missing category without changing stored documents.
- ifnull supplies a fallback for null values, nullif converts an empty string to null, and coalesce selects the first available value. The current conditional-function reference explicitly recommends nested ifnull for versions before OpenSearch 3.1. Empty and whitespace-only strings otherwise remain values.
- The field capabilities request correctly uses the supported index-scoped POST endpoint and fields query parameter. Readers must substitute their actual mapped, aggregatable field as the post instructs.
- Reconciliation must use the same source and time interval. The sample queries contain no explicit time predicate; readers must apply their incident filter consistently. The warnings about presentation limits and high-cardinality aggregation behavior are justified.
- Deployment-specific mappings remain relevant: keyword null_value, ignore_above, and normalizers can affect indexed values. The suggested fixture and schema inspection are appropriate checks before rollout.
- The linked documentation and author destination were accessible. The resource-conventions page links to the dedicated service conventions defining service.name.
- This was a documentation-based review. Queries were not executed against a live OpenSearch deployment, and no cluster version or index mapping was supplied. Compatibility with older engines remains subject to the version checks already stated in the post.
