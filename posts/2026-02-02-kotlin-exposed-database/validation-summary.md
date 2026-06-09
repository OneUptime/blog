# Validation Summary: How to Connect Kotlin to Databases with Exposed

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kotlin (JVM 1.9.22)
- JetBrains Exposed 0.47.0 (exposed-core, exposed-dao, exposed-jdbc, exposed-java-time)
- PostgreSQL (driver 42.7.1)
- MySQL (connector 8.0.33)
- H2 in-memory database (2.2.224)
- HikariCP 5.1.0 (connection pooling)
- Kotlin coroutines (`newSuspendedTransaction`)
- JUnit 5 (Jupiter) for testing
- Gradle Kotlin DSL and Maven build configuration

## Sources Consulted
- Exposed Breaking Changes page: https://www.jetbrains.com/help/exposed/breaking-changes.html
- Exposed CHANGELOG: https://github.com/JetBrains/Exposed/blob/main/CHANGELOG.md
- Exposed source for v0.47.0 (`Aggregate.kt`, `Query.kt`, `SizedIterable.kt`, `ColumnDefinitions.kt`)
- Exposed Wiki/Docs (DAO, DSL, Transactions, Java-Time module)
- HikariCP documentation (transactionIsolation parameter format)
- `java.sql.Connection` JDBC isolation level constants

## Issues Found

1. **Fabricated aggregate function `countIf { ... }`** — The aggregation example used `Posts.id.countIf { Posts.status eq "published" }` to compute a conditional count. This extension does not exist in Exposed 0.47.0 (or any version). The idiomatic alternative is a `CASE WHEN ... THEN 1 ELSE 0 END` wrapped in `Sum`. I simplified the example by removing the `publishedCount` column from `AuthorStats` and counting all posts via `Posts.id.count()`. I also stored the aggregate in a `val` so the same `Expression` instance is used in both `select(...)` and `row[...]` — the original code called `Posts.id.count()` twice, which produces two non-equal `Function<Long>` instances and causes `row[...]` lookups to throw at runtime.

2. **`.limit(n).offset(m)` chain does not exist in 0.47.0** — The pagination example chained separate `.limit()` and `.offset()` calls on `SizedIterable`. Per the official Breaking Changes page, `limit(n, offset)` was the single-method API in 0.47.0; the split into independent `limit()` / `offset()` methods only landed in **0.55.0**. Rewrote the example to use `User.all().limit(pageSize, offset = (page - 1).toLong() * pageSize)`.

3. **`.default(LocalDateTime.now())` captures startup time, not insertion time** — All four table definitions (DSL `Users`, DSL `Posts`, DAO `UsersTable`, DAO `PostsTable`) used `.default(LocalDateTime.now())` for `createdAt`/`updatedAt`. Because `.default(value)` takes a plain value and the table is a Kotlin `object` initialized once, the `LocalDateTime.now()` is captured exactly once at class-init time — every row that relies on the default would receive the same fixed timestamp rather than the current time. Switched all of these to `.clientDefault { LocalDateTime.now() }`, which evaluates the lambda on every insert.

## Review Notes
- Exposed 0.47.0 is now significantly out of date (the latest releases in the 0.5x line and beyond have a notably different DSL — separate `limit`/`offset`, new query semantics, kotlin-datetime defaults, etc.). The post pins to 0.47.0 throughout and the code is consistent with that version. A future revision could either pin to a current release or add a "version notes" callout.
- The post mixes DSL tables (`Users`, `Posts`) and DAO tables (`UsersTable`, `PostsTable`) in the same conceptual schema. In the subquery example, `UsersTable.id` (typed `Column<EntityID<Int>>`) is compared against a subquery producing `Posts.authorId` (typed `Column<Int>`). This compiles because `inSubQuery` does not constrain the subquery's column type, and at the SQL layer the integer comparison works — but mixing two table objects bound to the same physical table is unusual and could confuse readers. Not changed.
- HikariCP's `transactionIsolation = "TRANSACTION_REPEATABLE_READ"` and `connectionTestQuery = "SELECT 1"` are correct per HikariCP docs. `isAutoCommit = false` is a recommended setting when Exposed manages transactions.
- The `newSuspendedTransaction(Dispatchers.IO) { ... }` API is correctly named for 0.47.0 (still in the `experimental` package).
- `suspendedTransactionAsync` is imported in the coroutine example but never used. Minor; left as-is.
- The Ktor example in the coroutine section is commented out and uses a non-standard `Route("/users") { ... }` block (real Ktor uses `routing { route("/users") { ... } }`); since it's commented illustration only, not changed.
