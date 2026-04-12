# Validation Summary: How to Configure MySQL Connector/J (Java JDBC Driver)

## Status
validated

## Post Type
Tutorial / Configuration Guide

## Technologies Covered
- MySQL Connector/J 9.1.0 (JDBC driver)
- Java / JDBC
- HikariCP (connection pool)
- Spring Boot (application.yml datasource config)
- Maven / Gradle (dependency management)

## Sources Consulted
- MySQL Connector/J Security Properties Documentation — https://dev.mysql.com/doc/connector-j/en/connector-j-connp-props-security.html
- MySQL Connector/J 9.0.0 Release Notes — https://dev.mysql.com/doc/relnotes/connector-j/en/news-9-0-0.html
- MySQL Connector/J 8.0.13 Release Notes (sslMode introduction) — https://dev.mysql.com/doc/relnotes/connector-j/en/news-8-0-13.html
- MySQL Connector/J High Availability Properties — https://dev.mysql.com/doc/connector-j/en/connector-j-connp-props-high-availability-and-clustering.html
- MySQL Connector/J Character Sets Documentation — https://dev.mysql.com/doc/connector-j/en/connector-j-reference-charsets.html
- MySQL Connector/J Changed Properties — https://dev.mysql.com/doc/connector-j/en/connector-j-properties-changed.html
- Maven Central mysql-connector-j — https://mvnrepository.com/artifact/com.mysql/mysql-connector-j/9.1.0

## Issues Found

1. **Deprecated SSL properties used with Connector/J 9.1.0**: The post used `useSSL=true`, `requireSSL=true`, and `verifyServerCertificate=true` throughout. These properties were deprecated in Connector/J 8.0.13 in favor of the `sslMode` property. Since the post targets version 9.1.0, readers should use the modern `sslMode` property. Replaced with `sslMode=VERIFY_IDENTITY` (where full certificate verification was intended) and `sslMode=REQUIRED` (where only encrypted transport was specified). Affected sections: Basic Connection URL, HikariCP config, Spring Boot config, Replication URL.

2. **Removed `useUnicode` property**: The HikariCP code example included `&useUnicode=true`. This property is no longer documented in Connector/J 9.x — the driver always uses Unicode. Removed from the JDBC URL in the HikariCP config.

3. **Removed `readFromMasterWhenNoSlaves` property**: The replication URL example used `readFromMasterWhenNoSlaves=true`, which was removed in Connector/J 9.0.0 (WL#16319 — removal of deprecated insensitive terminology). Replaced with the current property name `readFromSourceWhenNoReplicas=true`.

4. **Summary section referenced deprecated approach**: The summary paragraph mentioned "enabling SSL with certificate verification" which implied the old property names. Updated to reference the `sslMode` property instead.

## Review Notes
- The `useSSL`, `requireSSL`, and `verifyServerCertificate` properties are still accepted (as deprecated aliases) in Connector/J 9.x — they are translated to `sslMode` values internally. However, a tutorial targeting 9.1.0 should use the canonical `sslMode` property.
- `autoReconnect=false` is still a valid property in 9.x but is discouraged. The post correctly sets it to `false` and pairs it with HikariCP, which is the recommended approach.
- `config.setDriverClassName("com.mysql.cj.jdbc.Driver")` is unnecessary with JDBC 4.0+ (auto-detected from the URL), but it is not wrong and can be left for explicitness.
- `config.setConnectionTestQuery("SELECT 1")` is unnecessary with HikariCP and JDBC 4.0+ drivers (HikariCP uses `Connection.isValid()` by default), but it still works and is not incorrect.
- The post uses version 9.1.0. Newer versions are available (9.2.0+), but 9.1.0 is a valid release and the configuration advice applies to the entire 9.x line.
