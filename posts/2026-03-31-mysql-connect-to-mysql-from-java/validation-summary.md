# Validation Summary: How to Connect to MySQL from Java

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Java (JDBC API)
- MySQL
- MySQL Connector/J 9.0.0
- HikariCP 5.1.0 (connection pooling)
- Maven / Gradle (dependency management)

## Sources Consulted
- MySQL Connector/J 9.0 official documentation — https://dev.mysql.com/doc/connector-j/en/
- Java SE `java.sql` package documentation (Connection, DriverManager, PreparedStatement, ResultSet, Statement)
- HikariCP GitHub repository and documentation — https://github.com/brettwooldridge/HikariCP
- Maven Central for artifact coordinates (`com.mysql:mysql-connector-j`, `com.zaxxer:HikariCP`)

## Issues Found
No technical issues found.

## Review Notes
- `PreparedStatement.RETURN_GENERATED_KEYS` is inherited from `java.sql.Statement`. It compiles and runs correctly, though `Statement.RETURN_GENERATED_KEYS` is the more conventional reference. This is a style preference, not a bug.
- The `useUnicode=true&characterEncoding=UTF-8` parameters in the JDBC URL are redundant in Connector/J 8.x and 9.x (UTF-8 is the default), but including them is harmless and makes the encoding explicit for readers.
- Using `double` for monetary values (price, order total) works for a tutorial but `BigDecimal` would be preferred in production to avoid floating-point precision issues. This is a pedagogical simplification, not an error.
- The connection pooling explanation ("too slow") is slightly imprecise — the real issue is the overhead of creating a new TCP connection per request rather than raw speed — but the practical guidance is correct.
