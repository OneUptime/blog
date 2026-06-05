# Validation Summary: How to Fix the OpenTelemetry Java Scope Not Being Closed Properly

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Java
- OpenTelemetry Java API
- OpenTelemetry Context and Scope
- Servlet filters
- Java executors and async callbacks
- Spring AOP

## Sources Consulted
- OpenTelemetry Java API documentation: https://opentelemetry.io/docs/languages/java/api/
- OpenTelemetry Context Javadoc: https://www.javadoc.io/doc/io.opentelemetry/opentelemetry-context/latest/io/opentelemetry/context/Context.html
- OpenTelemetry Scope Javadoc: https://www.javadoc.io/static/io.opentelemetry/opentelemetry-context/0.17.0/io/opentelemetry/context/Scope.html
- OpenTelemetry Span Javadoc: https://www.javadoc.io/static/io.opentelemetry/opentelemetry-api/1.25.0/io/opentelemetry/api/trace/Span.html
- OpenTelemetry Java StrictContextStorage source: https://github.com/open-telemetry/opentelemetry-java/blob/main/context/src/main/java/io/opentelemetry/context/StrictContextStorage.java
- OpenTelemetry Java LazyStorage source for strict-context property: https://github.com/open-telemetry/opentelemetry-java/blob/main/context/src/main/java/io/opentelemetry/context/LazyStorage.java
- Java Servlet Filter Javadoc: https://jakarta.ee/specifications/platform/10/apidocs/jakarta/servlet/filter

## Issues Found
- The post said the OpenTelemetry SDK detects scope leaks. This is more precisely handled by OpenTelemetry Java context storage, so the wording was updated.
- The strict-context section implied the system property can be set at any time. The property is read when context storage is initialized, so the wording now says it must be enabled before OpenTelemetry context storage is initialized.
- The strict-context section said unclosed scopes throw an error unconditionally. Strict context storage throws an AssertionError when it checks for leaks, and may log garbage-collected leaked scopes, so the wording was narrowed to "can throw an error when strict context storage checks for leaks."
- The broken servlet filter example called `chain.doFilter(...)` without declaring `IOException` and `ServletException`. The method signature was updated so the snippet is syntactically valid for the Servlet API.

## Review Notes
The main guidance is technically correct: `Span.makeCurrent()` returns a `Scope`; `Scope` implements `AutoCloseable`; `Scope.close()` restores the previous context; and spans still need to be ended separately with `span.end()`. The examples are intentionally illustrative and omit imports, tracer setup, and application-specific request types.
