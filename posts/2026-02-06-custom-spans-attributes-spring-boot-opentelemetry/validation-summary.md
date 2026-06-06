# Validation Summary: How to Add Custom Spans and Attributes in Spring Boot with the OpenTelemetry API

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- OpenTelemetry Java API
- OpenTelemetry Java SDK
- OpenTelemetry Spring Boot starter
- OpenTelemetry semantic conventions for Java
- Spring Boot
- Java
- Maven

## Sources Consulted
- OpenTelemetry Java API documentation: https://opentelemetry.io/docs/languages/java/api/
- OpenTelemetry Java ecosystem and BOM documentation: https://opentelemetry.io/docs/languages/java/intro/
- OpenTelemetry Spring Boot starter documentation: https://opentelemetry.io/docs/zero-code/java/spring-boot-starter/
- OpenTelemetry Spring Boot starter getting started guide: https://opentelemetry.io/docs/zero-code/java/spring-boot-starter/getting-started/
- OpenTelemetry semantic conventions Java repository: https://github.com/open-telemetry/semantic-conventions-java
- OpenTelemetry semantic conventions code generation guidance: https://opentelemetry.io/docs/specs/semconv/non-normative/code-generation/
- OpenTelemetry end-user semantic attributes registry: https://opentelemetry.io/docs/specs/semconv/registry/attributes/enduser/

## Issues Found
- The dependency snippet used old direct OpenTelemetry versions and did not include the OpenTelemetry Spring Boot starter, even though the examples inject an `OpenTelemetry` bean. I updated the snippet to import the official `opentelemetry-instrumentation-bom` and include `io.opentelemetry.instrumentation:opentelemetry-spring-boot-starter`.
- The dependency snippet described the SDK as usually added by the Java agent or starter. For manual instrumentation with the starter, the API is the direct compile-time need; the SDK dependency is only needed when the application configures the SDK itself. I clarified the SDK comment.
- The semantic conventions dependency and import used the older `SemanticAttributes.ENDUSER_ID` pattern. The `enduser.id` attribute is currently a development semantic convention, so I updated the snippet to use `opentelemetry-semconv-incubating:1.41.1-alpha` and `EnduserIncubatingAttributes.ENDUSER_ID`.

## Review Notes
The examples use placeholder application types such as `PaymentRequest`, `PaymentResult`, `Product`, and custom exceptions; that is acceptable for a tutorial, but readers would need to define those classes in a real project. The local environment does not have Maven or Java installed, so I could not compile the snippets locally; the API usage was checked against official OpenTelemetry documentation instead.
