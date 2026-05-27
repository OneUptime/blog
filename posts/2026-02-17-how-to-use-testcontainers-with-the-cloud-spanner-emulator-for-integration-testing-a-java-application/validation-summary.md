# Validation Summary: How to Use Testcontainers with the Cloud Spanner Emulator for Integration

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Google Cloud Spanner
- Cloud Spanner emulator
- Testcontainers for Java
- Java
- JUnit 5
- Spring Boot
- Spring Framework on Google Cloud / Spring Cloud GCP Spanner
- GitHub Actions

## Sources Consulted
- Testcontainers for Java GCloud module documentation: https://java.testcontainers.org/modules/gcloud/
- Testcontainers for Java JUnit 5 documentation: https://java.testcontainers.org/test_framework_integration/junit_5/
- Google Cloud Spanner emulator documentation: https://docs.cloud.google.com/spanner/docs/emulator
- Google Cloud Java SpannerOptions.Builder reference: https://docs.cloud.google.com/java/docs/reference/google-cloud-spanner/latest/com.google.cloud.spanner.SpannerOptions.Builder
- Google Cloud Java TransactionRunner reference: https://docs.cloud.google.com/java/docs/reference/google-cloud-spanner/latest/com.google.cloud.spanner.TransactionRunner
- Spring Framework on Google Cloud reference documentation for Spanner emulator properties: https://googlecloudplatform.github.io/spring-cloud-gcp/5.13.2/reference/html/index.html
- Maven Central artifact metadata for Testcontainers: https://central.sonatype.com/artifact/org.testcontainers/testcontainers
- Maven Central artifact metadata for Testcontainers GCloud: https://central.sonatype.com/artifact/org.testcontainers/testcontainers-gcloud
- Maven Central artifact metadata for Testcontainers JUnit Jupiter: https://central.sonatype.com/artifact/org.testcontainers/testcontainers-junit-jupiter
- GitHub-hosted runners reference: https://docs.github.com/en/actions/reference/github-hosted-runners-reference

## Issues Found
- The Testcontainers dependency coordinates were outdated for the current 2.x documentation. I updated the examples from `org.testcontainers:gcloud`, `org.testcontainers:junit-jupiter`, and version `1.19.3` to the current 2.0.5 artifact names `testcontainers-gcloud` and `testcontainers-junit-jupiter`.
- The emulator Docker image used the mutable `latest` tag. I changed the examples to the documented `gcr.io/cloud-spanner-emulator/emulator:1.4.0` tag for reproducible integration tests.
- The Spanner client setup omitted explicit no-credential configuration. I added `setCredentials(NoCredentials.getInstance())`, matching the Testcontainers Spanner emulator example and the emulator's no-auth behavior.
- The instance creation example selected the first listed instance config. I changed it to use the emulator's documented `emulator-config` instance config explicitly.
- The rollback test expected `SpannerException` when the transaction callback throws a plain `RuntimeException`. The Java client documentation says unchecked exceptions normally propagate from `TransactionRunner.run`, so I changed the assertion to `RuntimeException.class`.
- The Spring Boot example set the emulator host but did not enable emulator mode. I added `spring.cloud.gcp.spanner.emulator.enabled=true` through `DynamicPropertySource`.
- The conclusion claimed the emulator supports the full Spanner API. I softened this to note common test APIs and documented production differences, matching Google Cloud's emulator limitations documentation.

## Review Notes
The snippets remain illustrative and omit imports, repository implementation, and project dependency management such as a Google Cloud BOM or Spring dependency BOM. A complete runnable sample would also need to create the Spring test instance and database before repository access if the application does not already do that in test setup.
