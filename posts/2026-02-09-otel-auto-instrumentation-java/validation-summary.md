# Validation Summary: How to implement OpenTelemetry auto-instrumentation with Java

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- OpenTelemetry Java agent
- Java auto-instrumentation
- Spring Boot
- JDBC and JdbcTemplate
- HTTP client instrumentation
- Kafka, RabbitMQ, and JMS messaging instrumentation
- Docker Compose
- Kubernetes
- OpenTelemetry OTLP exporter configuration

## Sources Consulted
- OpenTelemetry Java agent getting started: https://opentelemetry.io/docs/zero-code/java/agent/getting-started/
- OpenTelemetry Java agent configuration: https://opentelemetry.io/docs/zero-code/java/agent/configuration/
- OpenTelemetry Java SDK configuration: https://opentelemetry.io/docs/languages/java/configuration/
- OpenTelemetry Java agent supported libraries: https://opentelemetry.io/docs/zero-code/java/agent/supported-libraries/
- OpenTelemetry Java agent instrumentation configuration: https://opentelemetry.io/docs/zero-code/java/agent/instrumentation/
- OpenTelemetry Java agent declarative configuration: https://opentelemetry.io/docs/zero-code/java/agent/declarative-configuration/
- OpenTelemetry Kubernetes Operator auto-instrumentation docs: https://opentelemetry.io/docs/platforms/kubernetes/operator/automatic/
- OpenTelemetry resource semantic conventions: https://opentelemetry.io/docs/specs/semconv/resource/
- OpenTelemetry service resource attributes: https://opentelemetry.io/docs/specs/semconv/registry/attributes/service/
- OpenTelemetry deployment resource attributes: https://opentelemetry.io/docs/specs/semconv/registry/attributes/deployment/

## Issues Found
- The OTLP examples used `http://localhost:4317` and `http://otel-collector:4317` without setting `grpc`. Current OpenTelemetry Java agent 2.x defaults to `http/protobuf`, whose default port is 4318. Added `otel.exporter.otlp.protocol=grpc` / `OTEL_EXPORTER_OTLP_PROTOCOL=grpc` when using port 4317.
- The Docker Compose example used `OTEL_SERVICE_VERSION` and `OTEL_DEPLOYMENT_ENVIRONMENT`, which are not standard Java SDK resource environment variables. Moved these values into `OTEL_RESOURCE_ATTRIBUTES` as `service.version` and `deployment.environment.name`.
- The Docker Compose example included `OTEL_INSTRUMENTATION_JDBC_STATEMENT_SANITIZER_ENABLED`, which is not the documented common DB statement sanitizer property. Removed it and kept `OTEL_INSTRUMENTATION_COMMON_DB_STATEMENT_SANITIZER_ENABLED`.
- The Docker Compose block was fenced as `bash` even though the content is YAML. Changed the code fence to `yaml`.
- The database instrumentation description overstated JDBC connection instrumentation and connection pool metrics. Updated it to describe JDBC statement spans and supported connection pool metrics more precisely.
- The Kafka consumer example said arbitrary custom processing creates child spans automatically. Updated it to clarify that the custom method runs under the consumer span and needs manual instrumentation for child spans.
- The Kubernetes init container image used the wrong repository path. Changed it to the OpenTelemetry Operator auto-instrumentation Java image path.
- The verification section showed outdated and overly specific instrumentation loading log lines. Replaced them with the stable startup version log pattern and noted that detailed loading information requires debug logging.
- The statement that the shown environment variables control every aspect of auto-instrumentation was too broad. Changed it to "common aspects" to match the documented configuration surface.

## Review Notes
The examples are illustrative and omit Java imports, application model classes, and collector configuration. The Spring Boot and service snippets are still valid as conceptual examples, but a production tutorial could later add imports, constructor injection, and a matching collector receiver configuration.
