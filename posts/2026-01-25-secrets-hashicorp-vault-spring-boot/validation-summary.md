# Validation Summary: How to Manage Secrets with HashiCorp Vault in Spring Boot

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Java
- Spring Boot
- Spring Cloud Vault
- Spring Vault
- HashiCorp Vault
- Vault KV v2 secrets engine
- Vault AppRole authentication
- Vault Kubernetes authentication
- Vault database secrets engine
- Vault Transit secrets engine
- Spring Boot Actuator
- HikariCP

## Sources Consulted
- Spring Cloud Vault Reference Documentation: https://docs.spring.io/spring-cloud-vault/docs/current/reference/html/
- Spring Cloud Vault ConfigData API documentation: https://docs.spring.io/spring-cloud-vault/reference/config-data.html
- Spring Cloud Vault Common Application Properties: https://docs.spring.io/spring-cloud-vault/reference/appendix.html
- Spring Vault `VaultTransitOperations` API: https://docs.spring.io/spring-vault/docs/current/api/org/springframework/vault/core/VaultTransitOperations.html
- Spring Vault `Plaintext`, `Ciphertext`, and `VaultTransitContext` APIs: https://docs.spring.io/spring-vault/docs/current/api/org/springframework/vault/support/Plaintext.html
- Spring Vault secrets engine reference: https://docs.spring.io/spring-vault/reference/vault/vault-secret-engines.html
- HashiCorp Vault dev server documentation: https://developer.hashicorp.com/vault/docs/concepts/dev-server
- HashiCorp Vault KV v2 documentation: https://developer.hashicorp.com/vault/docs/secrets/kv/kv-v2
- HashiCorp Vault AppRole authentication documentation: https://developer.hashicorp.com/vault/docs/auth/approle
- HashiCorp Vault Kubernetes authentication documentation: https://developer.hashicorp.com/vault/docs/auth/kubernetes
- HashiCorp Vault Kubernetes auth API documentation: https://developer.hashicorp.com/vault/api-docs/auth/kubernetes
- HashiCorp Vault PostgreSQL database secrets engine documentation: https://developer.hashicorp.com/vault/docs/secrets/databases/postgresql
- HashiCorp Vault Spring secrets reload tutorial: https://developer.hashicorp.com/vault/tutorials/app-integration/spring-reload-secrets

## Issues Found
- The post used `bootstrap.yml` with Spring Cloud Vault 2023.0.0-era dependencies. Spring Cloud Vault 3.0+ uses Spring Boot's ConfigData API by default, so I changed Vault configuration snippets to `application.yml` and added `spring.config.import: vault://`.
- The dependency list omitted modules required by later examples. I added `spring-cloud-vault-config-databases` for database secret backends, `spring-boot-starter-jdbc` for the Hikari `DataSource` example, and `spring-boot-starter-actuator` for the Actuator health example.
- The KV setup command attempted to enable `secret/` after starting a Vault dev server. Vault dev mode already mounts KV v2 at `secret/`, so I changed the enable command into a commented non-dev setup note to avoid a path-already-in-use failure.
- The KV configuration comment incorrectly described `default-context` as using the application name, and the profile-specific secrets had no active profile configured. I corrected the comment and added `spring.profiles.active` so `secret/myapp/development` or another selected profile is loaded.
- The AppRole policy granted `secret/data/myapp/*` but not the base `secret/data/myapp` path, which Spring Cloud Vault reads for the default application context. I added an explicit policy stanza for `secret/data/myapp`.
- The Transit policy example overwrote `myapp-policy` without preserving earlier database permissions. I added the database credentials path and the base KV path to the updated policy.
- The dynamic `DataSource` Java snippet used `@Value` without importing it. I added `org.springframework.beans.factory.annotation.Value`.
- The Transit Java sample manually base64-encoded data before passing it to Spring Vault's `Plaintext` abstraction. Spring Vault already handles the Vault API encoding details, so I changed the sample to use UTF-8 `Plaintext` and `Plaintext.asString(StandardCharsets.UTF_8)`.
- The production configuration showed unsupported `spring.cloud.vault.retry.*` properties and described "multiple Vault servers" while configuring only one URI. I removed the unverified retry block and changed the section to describe a production Vault endpoint.

## Review Notes
The tutorial is technically relevant and salvageable. The examples remain illustrative rather than a complete runnable application because entity, repository, PostgreSQL driver, deployment RBAC, and production Vault TLS/bootstrap details are necessarily environment-specific.
