# Validation Summary: How to Use Cloud Logging in a Spring Boot Application Using the Logback Appender

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Google Cloud Logging
- Cloud Run
- Google Kubernetes Engine
- Spring Boot
- Spring Cloud GCP / Spring Framework on Google Cloud
- Logback
- SLF4J MDC
- Google Cloud CLI
- Java

## Sources Consulted
- Google Cloud Logging Logback `LoggingAppender` reference: https://cloud.google.com/java/docs/reference/google-cloud-logging-logback/latest/com.google.cloud.logging.logback.LoggingAppender
- Google Cloud Logging Logback `LoggingEventEnhancer` reference: https://docs.cloud.google.com/java/docs/reference/google-cloud-logging-logback/latest/com.google.cloud.logging.logback.LoggingEventEnhancer
- Google Cloud Logging Logback `TraceLoggingEventEnhancer` reference: https://cloud.google.com/java/docs/reference/google-cloud-logging-logback/latest/com.google.cloud.logging.logback.TraceLoggingEventEnhancer
- Google Cloud Java Logback appender source and README: https://github.com/googleapis/java-logging-logback
- Spring Framework on Google Cloud Logging reference: https://googlecloudplatform.github.io/spring-cloud-gcp/reference/html/logging.html
- Cloud Run logging documentation: https://docs.cloud.google.com/run/docs/logging
- Cloud Logging query language documentation: https://docs.cloud.google.com/logging/docs/view/logging-query-language
- Google Cloud CLI `gcloud logging metrics create` reference: https://cloud.google.com/sdk/gcloud/reference/logging/metrics/create
- Logback level API documentation: https://logback.qos.ch/apidocs/ch.qos.logback.classic/ch/qos/logback/classic/Level.html

## Issues Found
- The post used `WARNING` as a Logback `flushLevel`; Logback's standard level name is `WARN`. Changed the configuration to `<flushLevel>WARN</flushLevel>`.
- The trace enhancer was configured as `com.google.cloud.logging.TraceLoggingEnhancer` under `<enhancer>`, but the current Logback appender trace helper is `com.google.cloud.logging.logback.TraceLoggingEventEnhancer` and is a `LoggingEventEnhancer`. Updated both the XML and Java snippets.
- The stdout JSON example incorrectly used `LoggingAppender` as a Logback layout inside `LayoutWrappingEncoder`. Replaced it with the appender's supported `redirectToStdout` configuration and added the valid Spring Cloud GCP JSON appender include example.
- The MDC section claimed fields would appear under `jsonPayload` with the direct appender. The direct Logback appender uses labels for MDC/enhancer metadata. Updated the explanation, custom enhancer, and log-based metric filter to use labels.
- The application properties section implied `spring.cloud.gcp.project-id` configures the Logback appender. Spring Cloud GCP documents that Logback logging setup uses environment/project detection instead. Updated the text to reference Application Default Credentials and `GOOGLE_CLOUD_PROJECT`.

## Review Notes
The post is now technically valid for the current Google Cloud Logback appender APIs. In a future revision, it could mention that managed environments such as Cloud Run commonly prefer stdout/structured JSON ingestion because the platform logging agent handles buffering and retry behavior.
