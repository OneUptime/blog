# Validation Summary: How to Set Up MySQL with Java using JDBC

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL (8.0+)
- Java (JDBC API)
- MySQL Connector/J 9.1.0
- HikariCP 5.1.0
- Maven

## Sources Consulted
- MySQL Connector/J: Using Character Sets and Unicode — https://dev.mysql.com/doc/connector-j/en/connector-j-reference-charsets.html
- MySQL Connector/J: Security Configuration Properties — https://dev.mysql.com/doc/connector-j/en/connector-j-connp-props-security.html
- MySQL Connector/J: Datetime Types Processing Properties — https://dev.mysql.com/doc/connector-j/en/connector-j-connp-props-datetime-types-processing.html
- MySQL Connector/J: Other Changes (8.x to 9.x) — https://dev.mysql.com/doc/connector-j/en/connector-j-other-changes.html
- MySQL Bug #76889: Setting utf8mb4 character encoding — https://bugs.mysql.com/bug.php?id=76889
- HikariCP GitHub README — https://github.com/brettwooldridge/HikariCP
- Java JDBC API (java.sql package) — https://docs.oracle.com/en/java/javase/17/docs/api/java.sql/java/sql/package-summary.html

## Issues Found
1. **`characterEncoding=utf8mb4` is not a valid Java charset name (BROKEN):** The `characterEncoding` JDBC property accepts Java charset names, not MySQL charset names. `utf8mb4` is a MySQL charset name and would cause `java.io.UnsupportedEncodingException` at runtime. Changed to `characterEncoding=UTF-8`, which Connector/J correctly maps to MySQL's `utf8mb4`. Updated in the HikariCP connection setup code block.

2. **`useSSL=false` is deprecated in Connector/J 9.x:** The `useSSL` property was deprecated in Connector/J 8.0.13 in favor of `sslMode`. While it still works as a translated alias in 9.x, a tutorial targeting version 9.1.0 should use the current property. Changed to `sslMode=DISABLED`. Updated in the HikariCP connection setup code block.

3. **`serverTimezone=UTC` replaced by `connectionTimeZone` in Connector/J 9.x:** The `serverTimezone` property was replaced by `connectionTimeZone` in Connector/J 8.0.23 and is now only an alias that "may be deprecated in the future." Changed to `connectionTimeZone=UTC` in both the HikariCP connection setup code block and the Best Practices section.

## Review Notes
- The `createProduct` method uses `ps.setDouble(2, price)` to set a `DECIMAL(10,2)` column. While this works, `setBigDecimal` would be more precise for financial data, avoiding potential floating-point representation issues. The `getProduct` method correctly reads the column with `rs.getBigDecimal("price")`.
- The `bulkInsert` method sets `autoCommit(false)` but does not explicitly rollback or restore `autoCommit` on failure. HikariCP handles this when the connection is returned to the pool, but this is inconsistent with the `transferStock` method which properly restores `autoCommit` in a `finally` block.
- All Java code is syntactically correct and uses current, non-deprecated JDBC APIs (PreparedStatement, try-with-resources, ResultSet, etc.).
- The Maven coordinates (`com.mysql:mysql-connector-j:9.1.0` and `com.zaxxer:HikariCP:5.1.0`) are correct and current.
- The SQL `DEFAULT NOW()` for a DATETIME column is valid in MySQL 8.0+ (NOW() is accepted as a synonym for CURRENT_TIMESTAMP in column defaults).
- The transaction pattern in `transferStock` correctly handles the insufficient-stock case with an explicit rollback before throwing, and catches `SQLException` for rollback on database errors.
