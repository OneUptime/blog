# Validation Summary: How to Instrument Jakarta EE 10 Applications with OpenTelemetry

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Jakarta EE 10
- Jakarta RESTful Web Services / JAX-RS 3.1
- CDI 4.0 and Jakarta Interceptors
- Jakarta Persistence 3.1
- OpenTelemetry Java agent
- OpenTelemetry Java API and SDK
- OTLP gRPC exporters
- OpenTelemetry semantic conventions
- WildFly and Open Liberty JVM configuration

## Sources Consulted
- OpenTelemetry Java documentation: https://opentelemetry.io/docs/languages/java/
- OpenTelemetry Java SDK configuration: https://opentelemetry.io/docs/languages/java/configuration/
- OpenTelemetry Java SDK management/exporters: https://opentelemetry.io/docs/languages/java/sdk/
- OpenTelemetry Java agent configuration: https://opentelemetry.io/docs/zero-code/java/agent/configuration/
- OpenTelemetry Java agent supported libraries and application servers: https://opentelemetry.io/docs/zero-code/java/agent/supported-libraries/
- OpenTelemetry Java API documentation for context propagation: https://opentelemetry.io/docs/languages/java/api/
- OpenTelemetry HTTP semantic conventions: https://opentelemetry.io/docs/specs/semconv/http/http-spans/
- OpenTelemetry database semantic conventions: https://opentelemetry.io/docs/specs/semconv/database/database-spans/
- OpenTelemetry resource documentation: https://opentelemetry.io/docs/concepts/resources/
- Jakarta EE 10 Platform specification: https://jakarta.ee/specifications/platform/10/jakarta-platform-spec-10.0
- Jakarta RESTful Web Services 3.1 API docs: https://jakarta.ee/specifications/restful-ws/3.1/apidocs/
- Jakarta CDI 4.0 specification: https://jakarta.ee/specifications/cdi/4.0/jakarta-cdi-spec-4.0.html
- Jakarta Persistence 3.1 specification: https://jakarta.ee/specifications/persistence/3.1/jakarta-persistence-spec-3.1

## Issues Found
- The Java agent examples set `otel.exporter.otlp.endpoint=http://localhost:4317` without setting `otel.exporter.otlp.protocol=grpc`. OpenTelemetry Java agent 2.x defaults to `http/protobuf`, so this could send HTTP/protobuf traffic to the gRPC port. Added `-Dotel.exporter.otlp.protocol=grpc` to both WildFly and Open Liberty examples.
- The manual SDK dependency version was outdated and the semantic convention dependency used an old alpha artifact/class. Updated the OpenTelemetry Java version to `1.62.0`, removed the obsolete semantic-convention dependency, and used stable string semantic attribute keys for resource attributes.
- The SDK producer configured only tracing, but the article later claimed to collect custom metrics. Added `OtlpGrpcMetricExporter`, `SdkMeterProvider`, and `PeriodicMetricReader`, and closed the meter provider during cleanup.
- The manual SDK example did not configure W3C trace context and baggage propagators, while the JAX-RS example now extracts inbound request context. Added explicit propagator setup.
- The JAX-RS section called the implementation an interceptor even though it used request/response filters. Corrected the wording to "filter".
- The JAX-RS filter created a server span but did not extract the parent context or make the new span current for downstream resource/repository code. Added `TextMapGetter`, context extraction, parent assignment, and scope lifecycle handling.
- The JAX-RS filter used deprecated/old HTTP semantic attributes and set server span status to error for 4xx responses. Updated to `http.request.method`, `url.full`, and `http.response.status_code`, and left 4xx server span status unset per current HTTP semantic conventions.
- The CDI interceptor binding used a `value` member for custom span names without marking it `@Nonbinding`, which would prevent bindings like `@Traced("UserRepository.findAll")` from matching the interceptor. Added `@Nonbinding`.
- The JPA examples used deprecated/old database semantic attributes. Updated them to `db.system.name`, `db.operation.name`, and `db.collection.name`.
- The complete `UserResource` example used `List<User>` and `User` without imports. Added `java.util.List` and `com.example.service.User`.

## Review Notes
Maven is not installed in the workspace, so I could not compile the Java snippets locally. The review was completed through official documentation checks and static inspection. The examples remain illustrative and assume the `User` entity and Jakarta EE application packaging are provided elsewhere in the application.
