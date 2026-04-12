# Validation Summary: How to Use HikariCP Connection Pool for MySQL in Java

## Status
validated

## Post Type
Tutorial / Configuration Reference

## Technologies Covered
- HikariCP 5.1.0 (JDBC connection pool)
- MySQL Connector/J 8.2.0 (JDBC driver)
- Java (JDBC API, try-with-resources, PreparedStatement)
- JMX (pool health monitoring via HikariPoolMXBean)
- Maven (dependency management)

## Sources Consulted
- HikariCP GitHub wiki — configuration properties: https://github.com/brettwooldridge/HikariCP#configuration-knobs-baby
- HikariCP GitHub wiki — MySQL configuration tips: https://github.com/brettwooldridge/HikariCP/wiki/MySQL-Configuration
- MySQL Connector/J 8.x documentation — connection properties: https://dev.mysql.com/doc/connector-j/en/connector-j-reference-configuration-properties.html
- HikariCP Maven Central — version verification: https://central.sonatype.com/artifact/com.zaxxer/HikariCP
- MySQL Connector/J Maven Central — artifactId and version verification: https://central.sonatype.com/artifact/com.mysql/mysql-connector-j
- HikariPoolMXBean Javadoc for method signatures

## Issues Found
No technical issues found.

## Review Notes
- `connectionTestQuery("SELECT 1")` is unnecessary when using MySQL Connector/J 8.x, which is a JDBC4-compliant driver. HikariCP recommends not setting this property for JDBC4 drivers, as it uses `Connection.isValid()` by default which is more efficient. The code is functional but adds minor overhead.
- The JDBC URL uses `useSSL=false`, which is deprecated in MySQL Connector/J 8.0.13+ in favor of `sslMode=DISABLED`. It still works but newer tutorials may want to adopt the current parameter name.
- The summary describes HikariCP's performance as coming from "bytecode instrumentation" — more precisely, HikariCP uses Javassist for bytecode generation of proxy classes (not instrumentation of existing classes in the Java agent sense). This is a minor terminology imprecision.
- The "2x CPU cores" pool sizing guideline is a common simplification of the more complete formula `connections = (core_count * 2) + effective_spindle_count` from the well-known pool sizing article referenced in the HikariCP wiki. The guideline refers to database server cores, which could be clarified.
