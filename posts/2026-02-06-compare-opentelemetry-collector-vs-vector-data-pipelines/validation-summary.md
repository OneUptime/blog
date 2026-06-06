# Validation Summary: How to Compare OpenTelemetry Collector vs Vector for Data Pipelines

## Status
validated

## Post Type
Technical comparison guide

## Technologies Covered
- OpenTelemetry Collector
- OpenTelemetry Transformation Language (OTTL)
- OpenTelemetry Collector filelog receiver
- OpenTelemetry Collector filter and transform processors
- OpenTelemetry Collector Elasticsearch and OTLP HTTP exporters
- Vector
- Vector Remap Language (VRL)
- Vector sources, transforms, routes, and sinks

## Sources Consulted
- OpenTelemetry Collector configuration documentation: https://opentelemetry.io/docs/collector/configuration/
- OpenTelemetry Collector transforming telemetry documentation: https://opentelemetry.io/docs/collector/transforming-telemetry/
- OpenTelemetry Collector filelog receiver README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/receiver/filelogreceiver/README.md
- OpenTelemetry Collector transform processor README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/transformprocessor/README.md
- OpenTelemetry Collector filter processor README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/filterprocessor/README.md
- OpenTelemetry Collector OTTL log context README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/pkg/ottl/contexts/ottllog/README.md
- OpenTelemetry Collector Elasticsearch exporter README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/exporter/elasticsearchexporter/README.md
- Vector configuration reference: https://vector.dev/docs/reference/configuration/
- Vector VRL reference: https://vector.dev/docs/reference/vrl/
- Vector VRL function reference: https://vector.dev/docs/reference/vrl/functions/
- Vector remap transform documentation: https://vector.dev/docs/reference/configuration/transforms/remap/
- Vector filter transform documentation: https://vector.dev/docs/reference/configuration/transforms/filter/
- Vector route transform documentation: https://vector.dev/docs/reference/configuration/transforms/route/
- Vector Elasticsearch sink documentation: https://vector.dev/docs/reference/configuration/sinks/elasticsearch/
- Vector sizing and capacity planning documentation: https://vector.dev/docs/setup/going-to-prod/sizing/

## Issues Found
- The OpenTelemetry Collector filter example claimed to route error logs, but the filter processor drops telemetry that matches its conditions. Changed the condition to drop non-error/non-fatal logs so the error pipeline keeps only errors and fatals.
- The filelog JSON parser example filtered on severity without mapping the parsed `level` field into log severity. Added `severity.parse_from: attributes.level`.
- The OTTL examples used unprefixed log paths such as `attributes` and `severity_text`. Updated them to current explicit log context paths such as `log.attributes` and `log.severity_text`.
- The OTLP HTTP alert exporter endpoint was shown as a generic base URL. Updated it to an OTLP logs endpoint path to make clear that `otlphttp` sends OTLP, not arbitrary webhook JSON.
- The VRL redaction example used an invalid `redact` call with a separate `patterns` argument. Replaced it with a valid regex filter list.
- The VRL numeric conversion example used fallible `to_float` without error handling. Updated it to `to_float!`.
- The VRL example passed dynamically typed JSON fields into string-specific functions. Added `string!` assertions where needed.
- The post described VRL as having loops, but Vector documents VRL as a deliberately limited domain-specific language. Reworded the claim to describe conditionals, compile-time error handling, and the standard library.
- The Vector routing example defined `_unmatched` as a route ID, but `_unmatched` is a reserved output name. Removed the invalid route definition and noted that the unmatched output is available automatically.
- The Vector performance claim cited unsourced 10+ million events per second throughput. Replaced it with Vector's official sizing guidance caveat of roughly 10 MiB/s per vCPU for unstructured logs as a starting estimate.

## Review Notes
The comparison is technically relevant and broadly accurate after the fixes. The post still contains subjective statements about intuition and tool choice, but those are framed as guidance rather than strict technical claims.
