# Validation Summary: How to Suppress Specific Instrumentations in the OpenTelemetry Java Agent

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- OpenTelemetry Java agent
- Java system properties and environment variables
- OTLP exporter configuration
- Java application servers: Tomcat, WildFly, Open Liberty
- Docker and Kubernetes configuration
- Java OpenTelemetry API

## Sources Consulted
- OpenTelemetry Java agent suppression documentation: https://opentelemetry.io/docs/zero-code/java/agent/disable/
- OpenTelemetry Java agent configuration documentation: https://opentelemetry.io/docs/zero-code/java/agent/configuration/
- OpenTelemetry Java agent supported libraries documentation: https://opentelemetry.io/docs/zero-code/java/agent/supported-libraries/
- OpenTelemetry Java agent instrumentation configuration documentation: https://opentelemetry.io/docs/zero-code/java/agent/instrumentation/
- OpenTelemetry Java SDK configuration documentation: https://opentelemetry.io/docs/languages/java/configuration/
- OpenTelemetry declarative configuration documentation: https://opentelemetry.io/docs/zero-code/java/agent/declarative-configuration/
- OpenTelemetry declarative configuration health check exclusion post: https://opentelemetry.io/blog/2025/declarative-config/

## Issues Found
- Several instrumentation names were invalid or overly generic. Replaced examples such as `redis`, `httpclient`, `logback`, `log4j`, `jboss-logging`, `executor`, `thread`, `actuator`, `aws-sqs`, `kafka-clients`, `kafka-streams`, `resttemplate`, and database-driver-specific names with documented Java agent instrumentation names.
- The "Suppressing by Library Version" section described version-specific enablement with unsupported names such as `spring-webmvc-3.1` and `spring-webmvc-5.3`. Reworked it to describe related component names that are actually supported.
- The HTTP endpoint suppression example used a non-existent `otel.instrumentation.servlet.suppress-spans-for-paths` property and a sampler example that would not drop health checks. Replaced it with declarative configuration using rule-based routing for `url.path`.
- OTLP endpoint examples used port `4317` without setting the exporter protocol to gRPC. Updated examples to use `4318`, matching the Java agent 2.x default `http/protobuf` protocol.
- The runtime verification section claimed code could list active auto-instrumentations. Updated the wording to clarify it can verify SDK activity and configured environment variables, not active agent instrumentation internals.
- The Java snippet used `var`, which unnecessarily required newer Java syntax. Replaced it with an explicit `Span` import and variable type.
- The opening claim said the agent instruments "hundreds" of libraries. Changed this to "many" to match official documentation wording more closely.

## Review Notes
Some examples still depend on the application stack and transitive instrumentation dependencies. The OpenTelemetry docs caution that selectively enabling instrumentations is advanced usage because dependent instrumentations may also need to be enabled.
