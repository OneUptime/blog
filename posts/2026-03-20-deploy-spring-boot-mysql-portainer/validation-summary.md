# Validation Summary: How to Deploy a Spring Boot + MySQL Stack via Portainer

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Spring Boot
- Spring Boot Actuator
- MySQL
- MySQL Connector/J
- Portainer
- Docker Compose
- Java
- Docker bind mounts

## Sources Consulted
- Docker Docs, Version and name top-level elements: https://docs.docker.com/reference/compose-file/version-and-name/
- Docker Docs, Control startup and shutdown order in Compose: https://docs.docker.com/compose/how-tos/startup-order/
- Portainer Docs, Add a new stack: https://docs.portainer.io/user/docker/stacks/add
- Portainer Docs, How Relative Path Support works in Portainer: https://docs.portainer.io/advanced/relative-paths
- Spring Boot Reference, Endpoints: https://docs.spring.io/spring-boot/3.5/reference/actuator/endpoints.html
- Spring Boot Actuator REST API, Health endpoint: https://docs.spring.io/spring-boot/api/rest/actuator/health.html
- MySQL Docker Official Image: https://hub.docker.com/_/mysql
- MySQL Product Support EOL Announcements: https://www.mysql.com/support/eol-notice.html
- MySQL 8.0 Release Notes: https://dev.mysql.com/doc/relnotes/mysql/8.0/en/
- MySQL Connector/J Developer Guide, Security properties: https://dev.mysql.com/doc/connector-j/en/connector-j-connp-props-security.html
- Eclipse Temurin Docker Official Image: https://hub.docker.com/_/eclipse-temurin

## Issues Found
- The Compose example used the obsolete top-level `version: "3.8"` field. Current Compose documentation marks `version` as obsolete, so I removed it.
- The database image was `mysql:8.0`. MySQL 8.0 reached end of life on April 21, 2026, so I updated the post to `mysql:8.4`.
- The MySQL health check hardcoded `-prootpass`, which would break if the post's own instruction to change `MYSQL_ROOT_PASSWORD` was followed. I changed the health check to use `CMD-SHELL` with `$${MYSQL_ROOT_PASSWORD}` so it stays aligned with the configured password.
- The JDBC URL used `useSSL=false`, which MySQL Connector/J documents as a deprecated legacy property replaced by `sslMode`. I changed the datasource URLs to use `sslMode=DISABLED`.
- The post used a relative bind mount for `./app.jar`, but Portainer documents relative path volumes as a Portainer Business Edition feature for Git-based stack deployments. I replaced it with an explicit Docker host path and updated the copy command accordingly.
- The post implied generic Portainer compatibility for the Compose startup ordering behavior. I clarified that the guidance is for Portainer on Docker Standalone, where Compose `depends_on` with `service_healthy` applies.
- The monitoring section said Actuator returns only `{"status":"UP"}` while also enabling `management.endpoint.health.show-details=always`. Spring Boot's health API returns an overall status plus component details when details are exposed, so I corrected the description.
- The Actuator configuration omitted the requirement that `spring-boot-starter-actuator` must be on the classpath for `/actuator/health` to exist. I added that requirement inline with the properties snippet.

## Review Notes
- `depends_on` with `condition: service_healthy` only helps with initial startup ordering. Applications should still tolerate later database restarts or temporary unavailability.
- The bind-mounted JAR approach assumes the built artifact is copied onto the Docker host before deploying the stack in Portainer.
- Docker was not installed in this workspace, so I could not run `docker compose config`. I validated the Compose snippet as YAML locally and verified the semantics against the official documentation above.
