# Validation Summary: How to Deploy a Java Application with Epinio

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Epinio
- Java
- Spring Boot
- Maven
- Paketo Buildpacks
- Kubernetes

## Sources Consulted
- Epinio introduction: https://docs.epinio.io/
- Epinio quickstart: https://docs.epinio.io/tutorials/quickstart
- Epinio supported applications: https://docs.epinio.io/references/supported_applications
- Epinio push process details: https://docs.epinio.io/explanations/detailed-push-process
- Epinio CLI references: https://docs.epinio.io/references/commands/cli/epinio_push , https://docs.epinio.io/references/commands/cli/epinio_target , https://docs.epinio.io/references/commands/cli/namespace/epinio_namespace_show , https://docs.epinio.io/references/commands/cli/app/epinio_app_show , https://docs.epinio.io/references/commands/cli/app/epinio_app_list , https://docs.epinio.io/references/commands/cli/app/epinio_app_logs , https://docs.epinio.io/references/commands/cli/app/epinio_app_update , https://docs.epinio.io/references/commands/cli/app/epinio_app_delete , https://docs.epinio.io/references/commands/cli/app/env/epinio_app_env_set , https://docs.epinio.io/references/commands/cli/app/env/epinio_app_env_list
- Paketo Java buildpack reference and Java how-to: https://paketo.io/docs/reference/java-reference/ , https://paketo.io/docs/howto/java/
- Paketo Maven buildpack README: https://github.com/paketo-buildpacks/maven
- Spring Boot system requirements and web reference: https://docs.spring.io/spring-boot/system-requirements.html , https://docs.spring.io/spring-boot/reference/web/index.html
- Official Spring Boot getting-started guide: https://spring.io/guides/gs/spring-boot
- Official Epinio Java example repository: https://github.com/epinio/example-java

## Issues Found
- The post title and description said Java/Spring Boot, but the body created a shell script and a Node.js app. I replaced those snippets with a real Spring Boot Maven project, Java application class, and `application.properties`.
- The custom route example used a placeholder that was not safe to paste into a shell, and the test step depended on brittle text parsing plus the macOS-only `open` command. I replaced that with a reserved example hostname, kept the DNS caveat, and changed the test step to use the route shown by `epinio app show my-app`.
- The environment variable examples were generic and not Spring Boot oriented. I changed them to `SPRING_PROFILES_ACTIVE` and `LOGGING_LEVEL_ROOT`, which map directly to Spring Boot configuration.
- Several explanations were overstated or imprecise. I changed runtime detection wording to application/build-tool detection, changed the update wording to rebuild/redeploy, and changed “deploy any application” to supported Java applications.

## Review Notes
- The post is now technically aligned with Epinio's documented CLI and Paketo-based source build flow.
- The example uses Maven, which is valid for Epinio because the Paketo Maven buildpack can build from a `pom.xml` even when `mvnw` is absent.
- The description mentions Maven and Gradle buildpack support. The corrected tutorial demonstrates Maven specifically; adding a short Gradle variant later would make that broader claim more explicit.
- I did not execute the Java build locally because `java` and `mvn` are not installed in this review environment.
