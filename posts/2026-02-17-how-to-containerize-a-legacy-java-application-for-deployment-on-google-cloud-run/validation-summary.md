# Validation Summary: How to Containerize a Legacy Java Application for Deployment on Google Cloud Run

## Status
validated

## Post Type
Tutorial / deployment guide

## Technologies Covered
- Google Cloud Run
- Google Cloud SDK / gcloud CLI
- Google Artifact Registry
- Docker and Dockerfiles
- Java 17
- Spring Boot
- Apache Tomcat
- GraalVM Native Image
- JVM Class Data Sharing (CDS)
- Cloud SQL for PostgreSQL
- Google Secret Manager

## Sources Consulted
- Cloud Run container runtime contract: https://docs.cloud.google.com/run/docs/container-contract
- gcloud run deploy reference: https://cloud.google.com/sdk/gcloud/reference/run/deploy
- gcloud run services update reference: https://cloud.google.com/sdk/gcloud/reference/run/services/update
- Artifact Registry repository creation reference: https://docs.cloud.google.com/sdk/gcloud/reference/artifacts/repositories/create
- Cloud SQL for PostgreSQL from Cloud Run: https://docs.cloud.google.com/sql/docs/postgres/connect-run
- Cloud SQL JDBC socket factory reference: https://docs.cloud.google.com/java/docs/reference/jdbc-socket-factory-parent/latest/overview
- Spring Boot lazy initialization reference: https://docs.spring.io/spring-boot/reference/features/spring-application.html
- Spring Boot Dockerfile and CDS reference: https://docs.spring.io/spring-boot/reference/packaging/container-images/dockerfiles.html
- Spring Boot native image reference: https://docs.spring.io/spring-boot/how-to/native-image/developing-your-first-application.html
- Apache Tomcat 10 migration guide: https://tomcat.apache.org/migration-10
- Apache Tomcat 10 configuration reference: https://tomcat.apache.org/tomcat-10.1-doc/config/
- Dockerfile builder reference: https://docs.docker.com/reference/builder
- GraalVM Community container image reference: https://www.graalvm.org/dev/getting-started/container-images/

## Issues Found
- The Spring Boot Dockerfile set `SERVER_PORT` with Dockerfile `ENV` substitution, which is evaluated when the image is built rather than dynamically from Cloud Run's runtime `PORT` value. Changed the entrypoint to read `${PORT:-8080}` at container startup.
- The WAR example used Tomcat 10 for a legacy Java EE application. Tomcat 10 uses Jakarta EE `jakarta.*` APIs and can break older `javax.*` WARs. Changed the example to Tomcat 9 and added a note that Tomcat 10+ is appropriate after Jakarta migration.
- The Tomcat port replacement used `${PORT:-8080}` directly in `server.xml`, but Tomcat configuration substitution is based on Java system properties. Changed `server.xml` to use `${http.port}` and set `-Dhttp.port=${PORT:-8080}` at runtime.
- The GraalVM native-image example used a general GraalVM image. Changed it to the official `native-image-community` image, which includes the native-image tooling.
- The native-image runtime entrypoint did not pass Cloud Run's runtime port to the Spring Boot executable. Changed it to pass `--server.port=${PORT:-8080}`.
- The CDS example used `--exit`, which is not a standard Spring Boot application option and could hang during Docker build. Replaced it with Spring Boot's documented CDS training-run pattern using `-Dspring.context.exit=onRefresh` and `-XX:ArchiveClassesAtExit`.
- The Cloud SQL section described Java connectivity as going through the Unix socket proxy while using the Cloud SQL Java Connector socket factory. Updated the wording to refer to the Cloud SQL Java Connector.
- The `postgres-socket-factory` dependency version was outdated. Updated it from `1.14.0` to the current documented `1.15.0`.

## Review Notes
The remaining commands and configuration snippets are technically valid for the documented workflow. The post could later mention service account permissions for Secret Manager and the Cloud SQL Client IAM role, but those omissions do not make the existing commands incorrect.
