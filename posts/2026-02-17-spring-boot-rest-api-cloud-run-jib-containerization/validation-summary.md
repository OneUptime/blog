# Validation Summary: How to Build a Spring Boot REST API and Deploy It to Cloud Run

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Java
- Spring Boot
- Spring MVC REST controllers
- Spring Boot Actuator
- Jakarta Bean Validation
- Maven
- Jib Maven plugin
- Docker
- Google Cloud Artifact Registry
- Google Cloud Run
- Google Cloud CLI

## Sources Consulted
- Spring Boot reference documentation: https://docs.spring.io/spring-boot/reference/
- Spring Boot common application properties: https://docs.spring.io/spring-boot/appendix/application-properties/index.html
- Jib Maven plugin official README: https://github.com/GoogleContainerTools/jib/tree/master/jib-maven-plugin
- Cloud Run container runtime contract: https://cloud.google.com/run/docs/container-contract
- Cloud Run CPU configuration and startup CPU boost documentation: https://cloud.google.com/run/docs/configuring/services/cpu
- Google Cloud CLI `gcloud run deploy` reference: https://cloud.google.com/sdk/gcloud/reference/run/deploy
- Google Cloud CLI `gcloud artifacts repositories create` reference: https://cloud.google.com/sdk/gcloud/reference/artifacts/repositories/create
- Artifact Registry repository creation documentation: https://cloud.google.com/artifact-registry/docs/repositories/create-repos

## Issues Found
- The `pom.xml` code block placed an XML comment before the XML declaration. XML declarations must appear at the start of the document, so I moved the comment after the declaration.
- The REST API code omitted the required Spring Boot application entry point. I added a minimal `@SpringBootApplication` class with a `main` method so the project can start as a Spring Boot application.
- The local Jib command used `mvn compile jib:dockerBuild`, but the configured target image name is the Artifact Registry image. The following `docker run cloudrun-api:latest` command would not find that image. I added `-Djib.to.image=cloudrun-api:latest` to the local build command.
- The cold-start section claimed the shown Jib configuration used AppCDS, but the snippet only contained JVM flags and did not configure Application Class Data Sharing. I changed the sentence to describe the snippet accurately as startup-focused JVM flags.

## Review Notes
- The local environment did not have `gcloud` or Maven installed, so CLI and Maven behavior were checked against official documentation rather than local command execution.
- The in-memory task store is correctly labeled as unsuitable for production. A production Cloud Run deployment should use an external data store because instances are ephemeral and can scale horizontally.
- The Spring Boot and Jib versions shown are valid for the code style used in the post, but future updates should consider refreshing dependency versions to currently supported patch releases.
