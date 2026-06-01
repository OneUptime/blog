# Validation Summary: How to Connect Spring Boot to Azure Database for MySQL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Spring Boot
- Spring Data JPA
- Java
- JDBC
- MySQL Connector/J
- Azure Database for MySQL Flexible Server
- Microsoft Entra ID authentication
- Azure managed identities
- Azure CLI
- Spring Cloud Azure JDBC MySQL starter
- HikariCP

## Sources Consulted
- Microsoft Learn: Microsoft Entra authentication for Azure Database for MySQL - Flexible Server: https://learn.microsoft.com/en-us/azure/mysql/flexible-server/security-entra-authentication
- Microsoft Learn: Set up Microsoft Entra authentication for Azure Database for MySQL - Flexible Server: https://learn.microsoft.com/en-us/azure/mysql/flexible-server/security-how-to-entra
- Microsoft Learn: Use Java and JDBC with Azure Database for MySQL - Flexible Server: https://learn.microsoft.com/en-us/azure/mysql/flexible-server/connect-java
- Microsoft Learn: Passwordless Authentication with Spring Cloud Azure: https://learn.microsoft.com/en-us/azure/developer/java/spring-framework/passwordless-authentication
- Microsoft Learn: Migrate an application to use passwordless connections with Azure Database for MySQL: https://learn.microsoft.com/en-us/azure/developer/java/spring-framework/migrate-mysql-to-passwordless-connection
- Spring Cloud Azure reference documentation: https://microsoft.github.io/spring-cloud-azure/
- Azure CLI reference for `az mysql flexible-server ad-admin`: https://learn.microsoft.com/en-us/cli/azure/mysql/flexible-server/ad-admin
- Azure CLI reference for `az mysql flexible-server identity`: https://learn.microsoft.com/en-us/cli/azure/mysql/flexible-server/identity
- Azure CLI reference for `az mysql flexible-server firewall-rule`: https://learn.microsoft.com/en-us/cli/azure/mysql/flexible-server/firewall-rule

## Issues Found
- The post claimed the MySQL JDBC driver and Azure Identity library automatically handle token refresh. I changed this to say Spring Cloud Azure handles token acquisition, while manual token-based pooling must recycle connections before token expiry.
- The Azure setup omitted the user-assigned managed identity required by Azure Database for MySQL Flexible Server for Microsoft Entra authentication. I added `az identity create`, `az mysql flexible-server identity assign`, the required `--identity` argument on `ad-admin create`, and a note about Graph permissions or Directory Readers.
- The SQL example granted permissions before creating the database and omitted the `aad_auth_validate_oids_in_tenant` setting used in Microsoft's managed identity/service principal examples. I reordered database creation and added the setting before `CREATE AADUSER`.
- The Maven example pinned an outdated Spring Cloud Azure starter version without a BOM. I added `spring-cloud-azure-dependencies` BOM management and removed explicit Azure dependency versions.
- The Spring Boot YAML placed managed identity settings under `spring.cloud.azure` and did not enable `spring.datasource.azure.passwordless-enabled`. I moved the settings under `spring.datasource.azure` and added `passwordless-enabled: true`.
- The local development YAML had the same missing passwordless property and incorrect credential namespace. I corrected it to use `spring.datasource.azure`.
- The firewall CLI examples used `--server-name` and put the rule name in `--name`. For `az mysql flexible-server firewall-rule create`, `--name` is the server name and `--rule-name` is the firewall rule name, so I corrected both commands.

## Review Notes
- The examples assume Spring Boot 3.1.x through 3.5.x for the `spring-cloud-azure-dependencies` 5.25.0 BOM. Spring Boot 4 projects should use the matching Spring Cloud Azure 7.x BOM instead.
- The manual `DataSource` example is intentionally lower-level than the Spring Cloud Azure starter and still requires careful pool lifetime management because new tokens are only applied when new connections are created.
