# Validation Summary: How to Set Up a Java/Spring Boot Development Environment with Portainer (2)

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Java
- Spring Boot
- Spring Boot DevTools
- Spring Boot Actuator
- Maven and Maven Wrapper
- Gradle
- Docker
- Docker Compose
- Portainer
- PostgreSQL
- Redis
- Apache Kafka / Confluent Platform
- VS Code Java debugging
- IntelliJ IDEA remote JVM debugging

## Sources Consulted
- Spring Boot DevTools reference: https://docs.spring.io/spring-boot/reference/using/devtools.html
- Spring Boot Actuator endpoints reference: https://docs.spring.io/spring-boot/3.5/reference/actuator/endpoints.html
- Spring Boot Maven plugin `spring-boot:run`: https://docs.spring.io/spring-boot/maven-plugin/run.html
- Docker Compose startup ordering and `depends_on` conditions: https://docs.docker.com/compose/how-tos/startup-order/
- Docker `exec` CLI reference: https://docs.docker.com/engine/reference/commandline/exec
- Portainer stack deployment docs: https://docs.portainer.io/sts/user/docker/stacks/add
- Portainer relative path support docs: https://docs.portainer.io/sts/advanced/relative-paths
- Portainer Git deployment build limitation: https://docs.portainer.io/faqs/troubleshooting/stacks-deployments-and-updates/can-i-build-an-image-while-deploying-a-stack-application-from-git
- Portainer remote environment build limitation: https://docs.portainer.io/sts/faqs/known-issues/docker-compose-files-including-build-steps-fail
- Apache Maven configuration reference: https://maven.apache.org/configure
- Apache Maven Dependency Plugin usage: https://maven.apache.org/plugins/maven-dependency-plugin/usage.html
- Maven Surefire single-test execution: https://maven.apache.org/surefire/maven-surefire-plugin/examples/single-test.html
- Confluent Docker image configuration reference: https://docs.confluent.io/platform/current/installation/docker/config-reference.html
- Confluent Kafka listeners reference: https://docs.confluent.io/platform/current/kafka/listeners.html
- VS Code Java debugging docs: https://code.visualstudio.com/docs/java/java-debugging
- IntelliJ IDEA remote debug tutorial: https://www.jetbrains.com/help/idea/tutorial-remote-debug.html
- Eclipse Temurin container source repository: https://github.com/adoptium/containers

## Issues Found
- The development Dockerfile installed Gradle from a ZIP archive but did not install `unzip`, so the image build would fail. I added `unzip` to the Alpine package list.
- The Portainer stack used a `build:` directive alongside relative bind mounts. Portainer documents that Git-based stack deployments do not reliably build images from Compose, and remote Docker environments do not support Compose build steps. I changed the stack to reference a prebuilt `spring-app-dev:latest` image and added the necessary Portainer deployment caveats.
- The stack relied on relative bind mounts without noting that Portainer only supports relative path volumes in Business Edition when deploying from Git with relative path support enabled. I added that requirement and the absolute-path fallback.
- The article described Spring DevTools as “hot-reload” driven purely by mounting `src/`, but Spring Boot documents that DevTools restarts after compiled classpath changes rather than raw source edits. I updated the wording throughout to describe automatic restarts after recompilation.
- The Compose file set JVM options in `JAVA_OPTS`, but Maven documents `MAVEN_OPTS` for the Maven JVM, while Spring Boot’s Maven plugin accepts application JVM flags through `spring-boot.run.jvmArguments`. I moved the debug, heap, and DevTools JVM flags into the `spring-boot:run` command where they actually apply to the app process.
- The application configuration placed `management` under `spring`, which is not a valid Spring Boot property hierarchy for actuator endpoint configuration. I moved `management` to the top level of `application-dev.yml`.
- The app service only used simple `depends_on`, but Docker documents that Compose does not wait for services to become ready. I added PostgreSQL and Redis healthchecks plus `depends_on` conditions so the app waits for healthy dependencies.
- The optional Kafka example used `confluentinc/cp-zookeeper:latest` and `confluentinc/cp-kafka:latest` with ZooKeeper-based settings. Confluent documents that ZooKeeper was removed in Confluent Platform 8.0. I replaced the example with a current single-node KRaft-based Confluent configuration and pinned it to a specific image version.
- The Flyway command assumed Flyway was configured in the project. I clarified that the command applies only if Flyway is configured.

## Review Notes
- The actuator configuration is valid, but exposing endpoints such as `env` is sensitive outside a trusted development environment. Spring Boot recommends securing exposed actuator endpoints if the app is reachable beyond local development.
- The Kafka example now uses KRaft combined mode, which Confluent documents as suitable for local experimentation rather than production. That matches the post’s development-environment scope.
- The article still references Gradle in tags and installs Gradle in the image, but the runnable examples are Maven-based. This is not technically incorrect, though the Maven-first emphasis is worth keeping in mind for future revisions.
