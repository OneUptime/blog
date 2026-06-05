# Validation Summary: How to Configure the JMX Receiver in the OpenTelemetry Collector

## Status
validated

## Post Type
Tutorial / configuration guide

## Technologies Covered
- OpenTelemetry Collector Contrib
- OpenTelemetry JMX receiver
- OpenTelemetry Java Contrib JMX Scraper / JMX Metric Gatherer
- Java Management Extensions (JMX)
- JVM remote monitoring configuration
- Collector processors and OTLP HTTP exporter
- Kubernetes sidecar and collector deployment patterns
- OneUptime OTLP ingestion

## Sources Consulted
- OpenTelemetry Collector Contrib JMX receiver documentation: https://pkg.go.dev/github.com/open-telemetry/opentelemetry-collector-contrib/receiver/jmxreceiver
- OpenTelemetry JMX Metrics documentation: https://opentelemetry.io/docs/languages/java/jmx/
- OpenTelemetry Java Contrib JMX Scraper README: https://github.com/open-telemetry/opentelemetry-java-contrib/tree/main/jmx-scraper
- OpenTelemetry Java Contrib JMX Metric Gatherer README and target-system docs: https://github.com/open-telemetry/opentelemetry-java-contrib/tree/main/jmx-metrics
- OpenTelemetry Collector configuration documentation: https://opentelemetry.io/docs/collector/configuration/
- OpenTelemetry Collector internal telemetry documentation: https://opentelemetry.io/docs/collector/internal-telemetry/
- Oracle Java JMX monitoring and management guide: https://docs.oracle.com/en/java/javase/22/management/monitoring-and-management-using-jmx-technology.html
- OneUptime OpenTelemetry documentation: https://oneuptime.com/docs/telemetry/open-telemetry

## Issues Found
- The post did not mention that the Collector `jmx` receiver is deprecated as of January 30, 2026. Added a deprecation caveat and pointed readers toward the standalone JMX Scraper or Java agent JMX metrics extension for new deployments.
- Several Collector examples omitted `jar_path`, even though the receiver launches a Java JMX metrics JAR and official docs require users to provide the JAR path. Added `jar_path` where examples are intended to be copied.
- Environment variable examples used `${VAR}`. Updated Collector configuration snippets to the current `${env:VAR}` expansion form.
- The production receiver snippet used invalid receiver fields `keystore` and `truststore`; the documented fields are `keystore_path` and `truststore_path`. Updated those names and added `truststore_type`.
- The production receiver snippet used `remote_profile: true`, but `remote_profile` is a string SASL/TLS profile such as `"TLS SASL/PLAIN"`. Replaced it with a commented optional example.
- The custom MBean example used an unsupported inline `mbeans` schema. Replaced it with the supported `jmx_configs` field and a separate JMX metric mapping YAML file using `rules`, `bean`, and `mapping`.
- The key metrics list included JVM CPU and daemon/peak thread metric names that are not part of the documented built-in JMX receiver JVM target-system metrics. Removed those metric entries.
- Later short snippets were missing required context such as `endpoint`, `jar_path`, or resource processor `action` fields. Updated those snippets.
- The Kubernetes sidecar example used the official contrib image directly, but official docs note Collector images do not include a Java runtime for the deprecated JMX receiver. Changed it to a custom image placeholder that includes a JRE and JMX metrics JAR.
- The Collector internal telemetry example had incomplete OTLP declarative exporter configuration. Added `protocol: http/protobuf` and fixed indentation.

## Review Notes
The article is technically valid after corrections, but the JMX receiver itself is deprecated. A future rewrite should likely focus on the standalone OpenTelemetry JMX Scraper or the OpenTelemetry Java agent JMX metrics extension instead of the Collector receiver.
