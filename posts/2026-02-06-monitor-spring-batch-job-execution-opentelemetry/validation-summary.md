# Validation Summary: How to Monitor Spring Batch Job Execution with OpenTelemetry

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Spring Batch
- Spring Boot
- OpenTelemetry Java
- OpenTelemetry Spring Boot Starter
- Java
- Maven
- YAML configuration
- H2 database

## Sources Consulted
- OpenTelemetry Spring Boot Starter getting started documentation: https://opentelemetry.io/docs/zero-code/java/spring-boot-starter/getting-started/
- OpenTelemetry Spring Boot Starter SDK configuration documentation: https://opentelemetry.io/docs/zero-code/java/spring-boot-starter/sdk-configuration/
- OpenTelemetry Spring Boot Starter annotations documentation: https://opentelemetry.io/docs/zero-code/java/spring-boot-starter/annotations/
- OpenTelemetry Java API documentation: https://opentelemetry.io/docs/languages/java/api/
- OpenTelemetry Java SDK configuration documentation: https://opentelemetry.io/docs/languages/java/configuration/
- Spring Batch ChunkListener API documentation: https://docs.spring.io/spring-batch/docs/current/api/org/springframework/batch/core/ChunkListener.html
- Spring Batch JobExecution API documentation: https://docs.spring.io/spring-batch/docs/5.1.0/org/springframework/batch/core/JobExecution.html
- Spring Batch StepExecution API documentation: https://www.springframework.org/spring-batch/docs/5.2.3/api/org/springframework/batch/core/StepExecution.html
- Spring Batch ItemWriter API documentation: https://docs.enterprise.spring.io/spring-batch/docs/5.1.4/api/org/springframework/batch/item/ItemWriter.html
- Spring Batch JobBuilder API documentation: https://docs.spring.io/spring-batch/docs/5.1.0/org/springframework/batch/core/job/builder/JobBuilder.html
- Spring Batch chunk-oriented step configuration documentation: https://docs.spring.io/spring-batch/reference/5.1/step/chunk-oriented-processing/configuring.html

## Issues Found
- The dependency snippet only included `opentelemetry-api` and annotations, but the `application.yml` OpenTelemetry properties and exported spans require a configured SDK. Replaced the API-only setup with the OpenTelemetry Spring Boot starter and instrumentation BOM so Spring Boot configuration files are used for SDK autoconfiguration.
- The `@WithSpan` examples used the Spring Boot starter path but did not include `spring-boot-starter-aop`. Added the AOP starter because the OpenTelemetry Spring Boot starter implements annotation support through Spring AOP proxies.
- The OpenTelemetry instrumentation annotation dependency used version `2.1.0`, which is outdated relative to the current instrumentation BOM. Removed the explicit version and aligned it through `opentelemetry-instrumentation-bom` version `2.28.1`.
- The job and step duration examples called `toInstant()` on Spring Batch 5 `LocalDateTime` values. Replaced those calls with `Duration.between(startTime, endTime)`.
- The job-level aggregate count code used `mapToInt`, but Spring Batch 5 count accessors return `long`. Changed the aggregates to `mapToLong` and `long` variables.
- The chunk error listener ended spans without setting error status or recording the rollback exception. Added `StatusCode.ERROR` and recorded the exception from `ChunkListener.ROLLBACK_EXCEPTION_KEY` when available.
- The chunk success/error listener ended spans before closing the current scope. Reordered cleanup to close the scope before ending the span.

## Review Notes
The snippets are technically valid for a Spring Batch 5 / Spring Boot application using the OpenTelemetry Spring Boot starter. For highly parallel or partitioned batch jobs, the listener examples may need additional context propagation design because OpenTelemetry scopes are thread-local.
