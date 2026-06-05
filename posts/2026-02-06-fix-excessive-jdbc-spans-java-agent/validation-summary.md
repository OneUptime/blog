# Validation Summary: How to Fix OpenTelemetry Java Agent Producing Excessive JDBC Spans That

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- OpenTelemetry Java agent
- Java JDBC instrumentation
- Hibernate instrumentation
- OpenTelemetry Collector filter processor
- OpenTelemetry Collector tail sampling processor
- OpenTelemetry trace sampling

## Sources Consulted
- OpenTelemetry Java agent suppressing instrumentation documentation: https://opentelemetry.io/docs/zero-code/java/agent/disable/
- OpenTelemetry Java instrumentation supported libraries documentation: https://github.com/open-telemetry/opentelemetry-java-instrumentation/blob/main/docs/supported-libraries.md
- OpenTelemetry Java JDBC instrumentation settings: https://github.com/open-telemetry/opentelemetry-java-instrumentation/blob/main/instrumentation/jdbc/README.md
- OpenTelemetry Java instrumentation release notes for query-sanitization property deprecations: https://github.com/open-telemetry/opentelemetry-java-instrumentation/releases
- OpenTelemetry trace SDK sampling specification: https://opentelemetry.io/docs/specs/otel/trace/sdk/
- OpenTelemetry Collector filter processor documentation: https://pkg.go.dev/github.com/open-telemetry/opentelemetry-collector-contrib/processor/filterprocessor
- OpenTelemetry Collector tail sampling processor documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/tailsamplingprocessor/README.md
- OpenTelemetry Java instrumentation generated instrumentation list for Hibernate and JDBC settings: https://github.com/open-telemetry/opentelemetry-java-instrumentation/blob/main/docs/instrumentation-list.yaml

## Issues Found
- The post said the Java agent instruments both JDBC and `jdbc-datasource` by default. The official supported-libraries documentation says `jdbc-datasource` is disabled by default because it can be noisy. Updated Fix 2 to explain that the property is useful only if datasource instrumentation was enabled.
- The post used `otel.instrumentation.jdbc.statement-sanitizer.enabled`. Current Java instrumentation settings use `otel.instrumentation.jdbc.query-sanitization.enabled`, with the old statement-sanitizer names deprecated. Updated the command and wording in Fix 3.
- The custom sampler example claimed it could drop short database queries, but OpenTelemetry samplers make decisions at span creation before duration is known. Replaced the broken sampler section with guidance to use Collector filtering for duration-based filtering.
- The Collector filter processor snippet used older include/exclude-style configuration and did not actually filter by duration. Replaced it with current OTTL `trace_conditions` syntax using span start/end time and database attributes.
- The tail sampling example claimed it kept slow DB queries, but the `latency` policy samples based on whole trace duration. Updated the wording and policy name to refer to slow traces.
- The Hibernate section described Hibernate instrumentation as grouping related queries under a single operation. The Java instrumentation docs describe Hibernate spans for ORM operations. Updated the description to session/query/transaction ORM operation visibility.

## Review Notes
The post is technically relevant and salvageable. The broad recommendation to control JDBC span volume is valid, but future updates should mention version-specific semantic convention differences such as `db.system` versus `db.system.name` when stable database semantic conventions are enabled.
