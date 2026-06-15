# Validation Summary: How to Implement Distributed Tracing with Sleuth and Zipkin

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Spring Boot
- Spring Cloud Sleuth
- Micrometer Tracing
- Zipkin
- OpenTelemetry
- Java
- Maven
- Docker
- Kafka
- Logback

## Sources Consulted
- Spring Cloud Sleuth Reference Documentation: https://docs.spring.io/spring-cloud-sleuth/docs/current/reference/htmlsingle/
- Spring Cloud 2022.0 Release Notes: https://github.com/spring-cloud/spring-cloud-release/wiki/Spring-Cloud-2022.0-Release-Notes
- Spring Cloud project compatibility matrix: https://spring.io/projects/spring-cloud
- Spring Boot Tracing documentation: https://docs.spring.io/spring-boot/reference/actuator/tracing.html
- Zipkin Quickstart: https://zipkin.io/pages/quickstart
- Zipkin tracers and instrumentation documentation: https://zipkin.io/pages/tracers_instrumentation
- Zipkin server storage documentation: https://github.com/openzipkin/zipkin/blob/master/zipkin-server/README.md

## Issues Found
- The post used Spring Cloud BOM `2023.0.0` with Spring Cloud Sleuth dependencies. Sleuth was removed from the Spring Cloud 2022.0 release train and does not support Spring Boot 3.x. Changed the BOM to `2021.0.9` and added a legacy Spring Boot 2.x caveat.
- The baggage example created `user-id` baggage but did not include `user-id` in `spring.sleuth.baggage.remote-fields`, so it would not be propagated as described. Added `user-id` to the remote baggage fields.
- Several Java snippets referenced collaborators that were not declared or injected. Added constructor-injected `OrderService`, `AuditLog`, and `EmailService` fields, and added the missing `BeanFactory` import for the async executor example.
- The production Sleuth configuration used `spring.sleuth.web.skip-pattern`, which replaces the default skip pattern. Changed it to `spring.sleuth.web.additional-skip-pattern` so health checks are added without removing defaults.
- The production configuration included unsupported Sleuth/Zipkin properties for tag max length and HTTP connection/read timeout nesting. Removed those and used the documented `spring.zipkin.queued-max-spans` property instead.
- The Kafka Zipkin sender example did not mention that Spring Kafka must be present on the classpath. Added a short note.
- The migration section described Sleuth as "transitioning" and showed incomplete Spring Boot 3 / Micrometer dependencies. Updated the wording and added the Spring Boot actuator, OpenTelemetry tracing support, and Zipkin support dependencies documented by Spring Boot.
- The Micrometer Zipkin endpoint configuration used the older `management.zipkin.tracing.endpoint` shape. Updated it to the current `management.tracing.export.zipkin.endpoint` namespace from Spring Boot tracing documentation.

## Review Notes
The article is now technically accurate as a legacy Spring Boot 2.x / Spring Cloud Sleuth guide with a migration note for Spring Boot 3.x and newer. For a future article, consider making Micrometer Tracing the primary implementation path because Sleuth 3.1 is no longer actively maintained and does not support modern Spring Boot versions.
