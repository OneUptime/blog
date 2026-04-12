# Validation Summary: How to Connect to MySQL from Kotlin

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Kotlin
- MySQL / MySQL Connector/J 9.0.0
- JDBC (Java Database Connectivity)
- HikariCP 5.1.0 (connection pooling)
- JetBrains Exposed 0.53.0 (ORM / DSL)
- Kotlin Coroutines (with Exposed `newSuspendedTransaction`)
- Gradle Kotlin DSL

## Sources Consulted
- JetBrains Exposed GitHub repository and changelog: https://github.com/JetBrains/Exposed
- Exposed 0.46.0 changelog — deprecation of `Table.select { }` in favor of `selectAll().where { }` (PR #1916, EXPOSED-65)
- MySQL Connector/J documentation: https://dev.mysql.com/doc/connector-j/en/
- HikariCP GitHub repository: https://github.com/brettwooldridge/HikariCP
- Kotlin standard library documentation for `.use` extension function

## Issues Found
1. **Deprecated Exposed `select` API**: The Exposed ORM code example used `Products.select { Products.price less 50.0 }`, which was deprecated in Exposed 0.46.0. Since the post specifies Exposed version 0.53.0, this was updated to the current API: `Products.selectAll().where { Products.price less 50.0 }`. The old `select` with a where clause was deprecated via EXPOSED-65 and replaced with the `selectAll().where { }` pattern to better align the DSL with SQL syntax.

## Review Notes
- The JDBC URL uses `serverTimezone=UTC`, which still works in Connector/J 9.0.0 but was renamed to `connectionTimeZone` in Connector/J 8.0.23+. The old name functions as an alias and is not broken, so no change was made, but future updates may want to use `connectionTimeZone=UTC` instead.
- The `useUnicode=true` parameter has been true by default since Connector/J 5.x and is effectively redundant, though harmless.
- All other code examples (basic JDBC, HikariCP config, Exposed insert, coroutines with `newSuspendedTransaction`) are syntactically correct and use current, non-deprecated APIs.
- Dependency coordinates (`com.mysql:mysql-connector-j`, `com.zaxxer:HikariCP`, `org.jetbrains.exposed:exposed-*`) are all correct Maven coordinates with valid version numbers.
