# Validation Summary: How to Centralize Config with Spring Cloud Config Server

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Spring Boot
- Spring Cloud Config Server
- Spring Cloud Config Client
- Spring Cloud Bus
- Spring Boot Actuator
- Spring Security
- Spring Retry
- Spring Cloud Netflix Eureka
- HashiCorp Vault
- Git
- Maven
- YAML
- Java
- curl

## Sources Consulted
- Spring Cloud Config Git Backend documentation: https://docs.spring.io/spring-cloud-config/reference/server/environment-repository/git-backend.html
- Spring Cloud Config Client documentation: https://docs.spring.io/spring-cloud-config/reference/client.html
- Spring Cloud Config Encryption and Decryption documentation: https://docs.spring.io/spring-cloud-config/reference/server/encryption-and-decryption.html
- Spring Cloud Config Vault Backend documentation: https://docs.spring.io/spring-cloud-config/reference/server/environment-repository/vault-backend.html
- Spring Cloud Config File System Backend documentation: https://docs.spring.io/spring-cloud-config/reference/server/environment-repository/file-system-backend.html
- Spring Cloud Config Composite Environment Repositories documentation: https://docs.spring.io/spring-cloud-config/reference/server/environment-repository/composite-repositories.html
- Spring Cloud Commons Refresh Scope documentation: https://docs.spring.io/spring-cloud-commons/reference/spring-cloud-commons/application-context-services.html
- Spring Cloud Bus endpoint documentation: https://docs.spring.io/spring-cloud-bus/reference/spring-cloud-bus/bus-endpoints.html
- Spring Cloud 2025.1.2 release announcement: https://spring.io/blog/2026/06/11/spring-cloud-2025-1-2-aka-oakwood-has-been-released/

## Issues Found
- The Maven BOM used `spring-cloud-dependencies` version `2023.0.0`, which is outdated for a current Spring Cloud tutorial. Updated it to `2025.1.2`, the current release train documented by Spring as of June 2026.
- The Config Server YAML snippet defined the top-level `spring:` key twice. Merged the security configuration under the existing `spring:` key so the YAML is valid and does not overwrite earlier settings.
- The Config Client dependency list included retry configuration but did not include `spring-retry` and `spring-boot-starter-aop`, which Spring Cloud Config requires for client retry. Added both dependencies.
- The composite backend snippet omitted `spring.profiles.active: composite`. Added it and clarified that precedence in a `composite` list is based on list order, not the `order` property used by distinct backend profiles.
- The standalone Vault backend snippet omitted `spring.profiles.active: vault`, which is required to enable the Vault backend profile. Added it.
- The Eureka service discovery example omitted the required Eureka client dependency. Added `spring-cloud-starter-netflix-eureka-client` before the Eureka configuration.

## Review Notes
The remaining examples align with current Spring Cloud Config behavior: Git search paths support `{application}`, config imports use `configserver:`, encrypted values use the `{cipher}` prefix, `/actuator/refresh` and `/actuator/busrefresh` are valid POST endpoints when exposed, and native file system backends require the `native` profile. The examples remain illustrative and still require real credentials, repository URLs, broker configuration, and production hardening before deployment.
