# Validation Summary: How to Configure Logging in Spring Boot

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Java
- Spring Boot logging
- Logback
- SLF4J
- MDC
- logstash-logback-encoder
- Spring Web filters
- Spring AOP
- Spring Boot Actuator-style runtime log level management

## Sources Consulted
- Spring Boot Logging reference: https://docs.spring.io/spring-boot/reference/features/logging.html
- Spring Framework `CommonsRequestLoggingFilter` Javadoc: https://docs.spring.io/spring-framework/docs/current/javadoc-api/org/springframework/web/filter/CommonsRequestLoggingFilter.html
- Spring Framework `AbstractRequestLoggingFilter` Javadoc: https://docs.spring.io/spring-framework/docs/current/javadoc-api/org/springframework/web/filter/AbstractRequestLoggingFilter.html
- logstash-logback-encoder documentation: https://github.com/logfellow/logstash-logback-encoder
- Maven Central artifact page for `net.logstash.logback:logstash-logback-encoder`: https://central.sonatype.com/artifact/net.logstash.logback/logstash-logback-encoder

## Issues Found
- The default logging behavior said Spring Boot uses INFO for application code and WARN for most libraries. Spring Boot's default behavior is root console logging for ERROR, WARN, and INFO messages, with debug mode enabling selected core loggers. Updated the bullets to match the official behavior.
- The properties example set both `logging.file.name` and `logging.file.path` together without explaining that `logging.file.path` is ignored when `logging.file.name` is set. Updated the sample to show `logging.file.path` as an alternative.
- The `logback-spring.xml` example used `scan="true"`. Spring Boot's Logback extensions are not compatible with Logback configuration scanning, and the post recommends `logback-spring.xml`, so the scanning attributes were removed.
- The JSON logging dependency used `logstash-logback-encoder` version `7.4`. Maven Central lists `9.0` as the current release, so the snippet was updated.
- The SLF4J parameterized logging comment said parameters are only evaluated if the log level is enabled. Parameterized logging avoids message formatting when disabled, but Java method arguments are still evaluated before the call. Updated the comment to avoid overstating the behavior.
- The built-in `CommonsRequestLoggingFilter` example appeared under request/response logging, but the filter logs request details rather than response status/body. Adjusted the lead-in to say it is for request-only details.

## Review Notes
The examples omit imports and supporting types such as repositories, annotations, and custom exceptions, which is acceptable for a focused blog guide. Projects using Spring Boot's native structured logging support may not need `logstash-logback-encoder`, but the encoder configuration remains technically valid when that dependency is present.
