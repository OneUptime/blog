# How to Restore Trace IDs in Spring Boot Logs When Traces Export

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Spring Boot

Description: Diagnose Logback correlation by separating active span context, MDC integration, logging patterns, and asynchronous boundaries.

Successful trace export proves that spans reach a destination. It does not prove that the logging framework reads the active span or renders its identifiers. In Spring Boot, the missing link is often the Logback correlation integration, a pattern using different MDC keys, or a log statement executed outside the request context.

First identify the instrumentation owner. A Java agent, the OpenTelemetry Spring Boot starter, and Micrometer Tracing can each provide integration, but their logging keys and configuration differ. Avoid installing several overlapping bridges without understanding which one supplies the context.

## Check context at the log statement

For an application using the OpenTelemetry API, inspect the active span immediately before a diagnostic log. This Java fragment needs `Span` and `SpanContext` from `io.opentelemetry.api.trace`.

```java
SpanContext context = Span.current().getSpanContext();
logger.info("correlation-check valid={} trace={} span={}",
    context.isValid(), context.getTraceId(), context.getSpanId());
```

If the context is invalid inside a known instrumented request, investigate instrumentation initialization and async propagation first. Changing the console pattern cannot create a missing active span. An invalid context during application startup, a scheduled task, or after a request finishes may be expected.

## Match the pattern to the integration

OpenTelemetry's Logback MDC integration exposes `trace_id`, `span_id`, and `trace_flags`. Micrometer-based integration commonly uses different names such as `traceId` and `spanId`. Select the pattern that matches the installed bridge.

For the OpenTelemetry keys, a Spring Boot properties fragment is:

```properties
logging.pattern.level=%5p [trace_id=%X{trace_id} span_id=%X{span_id}]
```

A custom `logback-spring.xml` may override Boot's default pattern, so inspect the effective appender configuration. Test the console output before troubleshooting the log shipper. If identifiers are present locally but absent in the backend, the problem is parsing, field mapping, or a downstream transform.

```mermaid
flowchart LR
  Span[Active span] --> Bridge[Logback correlation bridge]
  Bridge --> Event[Logging event context]
  Event --> Pattern[Pattern or JSON encoder]
  Pattern --> Shipper[Log collection]
  Shipper --> Search[Searchable trace identifier]
```

## Use the library wrapper only when required

Without the Java agent or another automatically configured correlation integration, the standalone MDC library provides a wrapper appender. Add the matching `opentelemetry-logback-mdc-1.0` dependency using your instrumentation BOM, then configure the wrapper around the real appender.

```xml
<configuration>
  <appender name="CONSOLE" class="ch.qos.logback.core.ConsoleAppender">
    <encoder>
      <pattern>%d %-5level trace_id=%X{trace_id} span_id=%X{span_id} %msg%n</pattern>
    </encoder>
  </appender>
  <appender name="OTEL" class="io.opentelemetry.instrumentation.logback.mdc.v1_0.OpenTelemetryAppender">
    <appender-ref ref="CONSOLE" />
  </appender>
  <root level="INFO"><appender-ref ref="OTEL" /></root>
</configuration>
```

Do not also attach `CONSOLE` directly to the root or each event can print twice. If the agent already injects context, confirm whether the wrapper is necessary before adding another integration.

## Test asynchronous logging and application work separately

An asynchronous appender transports logging events after they are created. An application executor transports application work before the log statement happens. These are different context boundaries. Capture context when submitting application work using supported framework instrumentation or explicit OpenTelemetry context wrapping.

Test one request log, one child-operation log, one executor log, and one background log outside any span. The first three should carry the appropriate active identifiers when context propagation is configured. The background log should remain uncorrelated rather than inheriting stale request identifiers.

Finally, compare a log's trace ID with an actual retained trace. A valid ID can exist for an unsampled trace, so a missing backend link does not necessarily mean the logging bridge is broken. Correlation, sampling, and retention must each be checked at their own boundary.

## References

The [community question](https://stackoverflow.com/questions/75233672/open-telemetry-logger-mdc-auto-instrumentation) motivated this investigation. The implementation references are [official reference 1](https://raw.githubusercontent.com/open-telemetry/opentelemetry-java-instrumentation/main/instrumentation/logback/logback-mdc-1.0/library/README.md), [official reference 2](https://opentelemetry.io/docs/languages/java/api/), [official reference 3](https://opentelemetry.io/docs/zero-code/java/spring-boot-starter/out-of-the-box-instrumentation/).
