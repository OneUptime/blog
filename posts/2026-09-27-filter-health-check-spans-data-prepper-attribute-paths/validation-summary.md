# Validation Summary: How to Filter Health-Check Spans with the Correct Data Prepper Attribute Paths

## Status
validated

## Post Type
Technical troubleshooting guide with YAML pipeline configuration examples.

## Technologies Covered
- OpenSearch Data Prepper and trace analytics
- OpenTelemetry and OTLP span attributes
- Data Prepper expressions and JSON pointers
- YAML processor and sink configuration

## Sources Consulted
- [Data Prepper expression syntax](https://docs.opensearch.org/latest/data-prepper/pipelines/expression-syntax/)
- [Data Prepper 2.16.0 expression grammar](https://github.com/opensearch-project/data-prepper/blob/2.16.0/data-prepper-expression/src/main/antlr/DataPrepperExpression.g4)
- [Data Prepper 2.16.0 expression parser](https://github.com/opensearch-project/data-prepper/blob/2.16.0/data-prepper-expression/src/main/java/org/opensearch/dataprepper/expression/ParseTreeParser.java)
- [Data Prepper 2.16.0 expression evaluator](https://github.com/opensearch-project/data-prepper/blob/2.16.0/data-prepper-expression/src/main/java/org/opensearch/dataprepper/expression/GenericExpressionEvaluator.java)
- [Data Prepper 2.16.0 equality operator](https://github.com/opensearch-project/data-prepper/blob/2.16.0/data-prepper-expression/src/main/java/org/opensearch/dataprepper/expression/GenericEqualOperator.java)
- [OpenSearch-format OTLP codec at the post's pinned commit](https://github.com/opensearch-project/data-prepper/blob/0c8acd7ffc0328b1f9dbd9bc7161ed673a59be42/data-prepper-plugins/otel-proto-common/src/main/java/org/opensearch/dataprepper/plugins/otel/codec/OTelProtoOpensearchCodec.java)
- [JacksonSpan at the post's pinned commit](https://github.com/opensearch-project/data-prepper/blob/0c8acd7ffc0328b1f9dbd9bc7161ed673a59be42/data-prepper-api/src/main/java/org/opensearch/dataprepper/model/trace/JacksonSpan.java)
- [Data Prepper 2.16.0 standard OTLP codec](https://github.com/opensearch-project/data-prepper/blob/2.16.0/data-prepper-plugins/otel-proto-common/src/main/java/org/opensearch/dataprepper/plugins/otel/codec/OTelProtoStandardCodec.java)
- [Drop events processor](https://docs.opensearch.org/latest/data-prepper/pipelines/configuration/processors/drop-events/)
- [Add entries processor](https://docs.opensearch.org/latest/data-prepper/pipelines/configuration/processors/add-entries/)
- [OTel trace source](https://docs.opensearch.org/latest/data-prepper/pipelines/configuration/sources/otel-trace-source/)
- [Trace analytics pipeline architecture](https://docs.opensearch.org/latest/data-prepper/common-use-cases/trace-analytics/)
- [OpenTelemetry HTTP span conventions](https://opentelemetry.io/docs/specs/semconv/http/http-spans/)
- [OpenTelemetry HTTP attribute registry, including deprecated http.target](https://opentelemetry.io/docs/specs/semconv/registry/attributes/http/)
- [OpenTelemetry Collector tail sampling processor](https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/main/processor/tailsamplingprocessor)

## Issues Found
- **Preserved newline breaks the scoped expression's `or` operator.** The two comparisons inside the parentheses were more indented than the surrounding folded YAML scalar. Parsing that YAML preserved a newline immediately after `or`. The 2.16.0 grammar defines this operator with literal spaces on both sides, and `ParseTreeParser` passes the expression to the lexer without normalizing newlines. Aligned both comparison lines with the other scalar lines so `>-` folds the expression into one line with valid spaces. The filter's logic and scope are unchanged.

## Review Notes
- Confirmed that the OpenSearch codec prefixes span attribute names and replaces their dots with `@`. JacksonSpan stores those keys inside `attributes`, while its JSON serialization flattens that map. The processor pointer and serialized field in the table are correct.
- Confirmed that the standard OTLP codec preserves dotted attribute keys inside the span's `attributes` map. The source supports both documented output formats, with `opensearch` as the documented default.
- Verified quoted pointers and triple-quoted string literals against the 2.16.0 grammar. Ordinary double-quoted `/healthz` is recognized as a pointer. Quoting pointers containing dots or `@` is valid, although this grammar also accepts those characters in unquoted pointers.
- Confirmed `drop_when`, `handle_failed_events: skip`, its warning behavior, the default failure policy, and `add_entries.value_expression`. Equality with a null operand and a non-null string returns false, supporting the missing-field warning in the post.
- Confirmed the distinction between route templates, URL paths, and the deprecated `http.target`, which can include a query string. The post correctly treats the latter as a legacy attribute rather than recommending it for new instrumentation.
- Checked the documented entry/raw/service-map pipeline topology. The filter placement advice follows that topology. A per-event filter does not implement a whole-trace decision; root removal can leave children and affect downstream trace-group and relationship processing. Upstream tail sampling requires spans of a trace to reach the same sampler instance.
- Parsed all three YAML examples with PyYAML. Confirmed that the corrected scoped expression contains no embedded newlines and retains spaces around both logical operators. Reviewed the resulting expressions against the upstream grammar and parser; did not run a Data Prepper server or an end-to-end OTLP fixture.
- The examples are pipeline fragments, intended for an existing staging pipeline with a configured source. There are no terminal commands to validate. Technical reference links were checked through official documentation and upstream source; the author profile is attribution rather than technical evidence.
- Version-sensitive syntax was checked against the explicitly cited 2.16.0 grammar; schema behavior was checked against the pinned codec and serializer plus the 2.16.0 standard codec. The post appropriately recommends verifying the installed release and testing retained span IDs before production use.
