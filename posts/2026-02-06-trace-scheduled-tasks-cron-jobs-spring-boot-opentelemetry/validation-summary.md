# Validation Summary: How to Trace Scheduled Tasks and Cron Jobs in Spring Boot with OpenTelemetry

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Spring Boot
- Spring Framework scheduling
- Spring AOP
- Spring Retry
- OpenTelemetry Java API
- OpenTelemetry Spring Boot starter
- OpenTelemetry metrics
- JUnit 5
- Maven

## Sources Consulted
- Spring Framework reference: Task Execution and Scheduling, https://docs.spring.io/spring-framework/reference/integration/scheduling.html
- Spring Boot reference: Task Execution and Scheduling, https://docs.spring.io/spring-boot/3.3/reference/features/task-execution-and-scheduling.html
- Spring Boot reference: Application starters including `spring-boot-starter-aop`, https://docs.spring.io/spring-boot/docs/3.2.5/reference/htmlsingle/
- Spring Framework reference: AOP proxying limitations, https://docs.spring.io/spring-framework/reference/core/aop/proxying.html
- OpenTelemetry Java SDK configuration, https://opentelemetry.io/docs/languages/java/configuration/
- OpenTelemetry Java API guide, https://opentelemetry.io/docs/languages/java/api/
- OpenTelemetry `SpanBuilder` Javadoc, https://www.javadoc.io/static/io.opentelemetry/opentelemetry-api/1.36.0/io/opentelemetry/api/trace/SpanBuilder.html
- Spring Retry `RetryTemplateBuilder` Javadoc, https://javadoc.io/static/org.springframework.retry/spring-retry/2.0.0/org/springframework/retry/support/RetryTemplateBuilder.html
- OpenTelemetry JUnit testing extension Javadoc, https://www.javadoc.io/doc/io.opentelemetry/opentelemetry-sdk-testing/latest/io/opentelemetry/sdk/testing/junit5/OpenTelemetryExtension.html

## Issues Found
- The dependency list did not include `spring-boot-starter-aop`, so the custom `@Aspect` example would not be activated in a typical Spring Boot project. Added the AOP starter dependency.
- The retry example used `@Retryable` on a private method invoked from the same class. Spring AOP proxy-based advice cannot advise private methods, and self-invocation bypasses proxy advice. Replaced the example with a `RetryTemplate` implementation that creates a child span for each attempt.
- The retry example used Spring Retry APIs without declaring a Spring Retry dependency. Added the `spring-retry` dependency.
- Several Java snippets omitted required imports for `Tracer`, `Scope`, `StatusCode`, `Span`, or `Component`. Added the missing imports where needed.
- The scheduled task test referenced `DataProcessingTasks.failingTask()`, but no such method was defined in the post. Reworked the test snippet to use a local test fixture with both a successful scheduled method and a failing scheduled method.
- The test snippet used OpenTelemetry testing APIs without listing the test dependency. Added `opentelemetry-sdk-testing` and `spring-boot-starter-test` test dependencies.
- The retry failure path swallowed the final exception after recording it on the span. Updated it to rethrow a runtime exception so failed scheduled executions remain visible to Spring's scheduling error handling and logs.

## Review Notes
- The examples are version-specific to Spring Boot 3.2.1 and OpenTelemetry instrumentation 2.0.0. Newer Spring Boot and OpenTelemetry versions are available, but the APIs used here remain valid for the stated versions.
- The custom span attribute names such as `task.name` and `task.duration_ms` are useful operational attributes, but they are custom attributes rather than standardized OpenTelemetry semantic convention keys.
