# Validation Summary: How to Deploy a Spring Boot + MySQL Stack via Portainer - A Practical Guide

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Portainer
- Docker Compose
- Dockerfile / container images
- Spring Boot
- Spring Data JPA / Hibernate
- HikariCP
- Flyway
- MySQL
- phpMyAdmin
- Java

## Sources Consulted
- Portainer Stacks: Add a new stack — https://docs.portainer.io/sts/user/docker/stacks/add
- Portainer Relative Path Support — https://docs.portainer.io/sts/advanced/relative-paths
- Portainer Images — https://docs.portainer.io/user/docker/images
- Docker Compose file reference — https://docs.docker.com/reference/compose-file/
- Docker Compose `version` top-level element — https://docs.docker.com/reference/compose-file/version-and-name/
- Docker Compose `depends_on` / healthcheck behavior — https://docs.docker.com/reference/compose-file/services/
- Docker CLI `docker container logs` reference — https://docs.docker.com/reference/cli/docker/container/logs/
- Spring Boot Externalized Configuration (Binding From Environment Variables) — https://docs.spring.io/spring-boot/4.1-SNAPSHOT/reference/features/external-config.html
- Spring Boot Common Application Properties — https://docs.spring.io/spring-boot/appendix/application-properties/
- Spring Boot Actuator Endpoints — https://docs.spring.io/spring-boot/4.1/reference/actuator/endpoints.html
- MySQL Docker Official Image — https://hub.docker.com/_/mysql
- phpMyAdmin Docker Official Image — https://hub.docker.com/_/phpmyadmin/
- MySQL 8.0 Native Pluggable Authentication — https://dev.mysql.com/doc/refman/8.0/en/native-pluggable-authentication.html
- MySQL Connector/J Security Properties — https://dev.mysql.com/doc/connector-j/en/connector-j-connp-props-security.html
- MySQL Connector/J SSL Reference — https://dev.mysql.com/doc/connector-j/en/connector-j-reference-using-ssl.html
- MySQL 8.0 CREATE TABLE Statement — https://dev.mysql.com/doc/mysql/8.0/en/create-table.html
- MySQL 8.0 CREATE INDEX Statement — https://dev.mysql.com/doc/mysql/8.0/en/create-index.html

## Issues Found

1. **The deployment steps assumed a Dockerfile alone was sufficient for the stack deploy.** The stack uses `image:` rather than `build:`, and Portainer documents image building as a separate workflow. I updated the prerequisites and Step 1 text to clarify that the Spring Boot image must be built and made available to the Portainer-managed host or a registry before deploying the stack.

2. **The guide needed to be scoped to Docker Standalone rather than Portainer generically.** The stack relies on Compose behavior such as `depends_on.condition: service_healthy`, so I clarified the prerequisite to target a Portainer-managed Docker Standalone environment.

3. **The relative bind mount `./mysql/init.sql` was not appropriate for a Portainer Web editor stack.** Portainer documents relative path volume support only for Business Edition Git deployments with the feature enabled. Since MySQL initialization is already handled by the official image environment variables and schema changes are handled by Flyway, I removed the bind mount.

4. **The Compose `version: "3.8"` line was outdated.** Docker’s current Compose docs mark the top-level `version` field as obsolete, so I removed it.

5. **The MySQL server was being forced to use `mysql_native_password`, which is deprecated.** MySQL documents `mysql_native_password` as deprecated in 8.0.34, disabled by default in 8.4, and removed in 9.0. I removed the `--default-authentication-plugin=mysql_native_password` option.

6. **The JDBC SSL examples used the legacy `useSSL` property.** Connector/J documents `sslMode` as the replacement for deprecated legacy SSL properties. I changed the demo connection string to `sslMode=DISABLED` and updated the production recommendation to use `sslMode=REQUIRED` or `sslMode=VERIFY_IDENTITY`.

7. **Several Spring Boot environment variable names were incorrect for dashed property names.** Spring Boot’s environment variable binding rules remove dashes from canonical property names. I corrected variables such as `SPRING_DATASOURCE_DRIVER_CLASS_NAME`, `SPRING_DATASOURCE_HIKARI_MAXIMUM_POOL_SIZE`, `SPRING_JPA_HIBERNATE_DDL_AUTO`, and `SPRING_FLYWAY_BASELINE_ON_MIGRATE` to their proper canonical environment variable forms.

8. **The Flyway migration created a redundant index on `users.username`.** In MySQL, `UNIQUE` creates a unique index, so the extra `CREATE INDEX idx_users_username ON users(username);` was unnecessary. I removed the duplicate index statement.

9. **The `docker logs` example used option ordering that did not match the official CLI syntax.** Docker documents the command as `docker container logs [OPTIONS] CONTAINER`, so I changed the example to `docker logs --tail 30 -f spring-app`.

## Review Notes
- The stack is now technically consistent for a Portainer-managed Docker Standalone deployment, but it is still a demo-oriented setup. Exposing phpMyAdmin and using root/default credentials should be tightened or removed for production use.
- The article’s Spring Boot controller snippet is illustrative and assumes the surrounding repository, entity, validation, and exception classes already exist in the application.
- Docker is not installed in this review workspace, so I validated the post by checking it against official documentation rather than by running the stack locally.
