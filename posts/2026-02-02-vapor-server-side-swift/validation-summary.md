# Validation Summary: How to Build Server-Side Swift with Vapor

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Swift 5.9
- Vapor 4 (web framework)
- Fluent ORM
- FluentPostgresDriver
- JWT (vapor/jwt package)
- Bcrypt (password hashing)
- XCTVapor (testing)
- vapor/redis (caching)
- Docker / Docker Compose
- PostgreSQL
- Swift Package Manager (Package.swift)

## Sources Consulted
- Vapor documentation: https://docs.vapor.codes
- Vapor GitHub: https://github.com/vapor/vapor
- Vapor Toolbox source: https://github.com/vapor/toolbox/blob/main/Sources/VaporToolbox/New.swift
- FluentKit source: https://github.com/vapor/fluent-kit
- fluent-postgres-driver: https://github.com/vapor/fluent-postgres-driver
- vapor/redis: https://github.com/vapor/redis
- vapor/jwt: https://github.com/vapor/jwt
- Vapor testing docs: https://docs.vapor.codes/basics/testing/
- Swift download page: https://swift.org/download/

## Issues Found

1. **`vapor new --fluent --db postgres` flags are outdated.** The current Vapor toolbox (18.x) uses interactive prompts (or a template manifest) for choosing the Fluent driver and Leaf. The `--fluent` and `--db` flags no longer exist. Fixed by removing the flags and noting that the toolbox will prompt for these choices.

2. **`req.db.execute(query: .raw("SELECT 1"))` is invalid Fluent API.** `DatabaseQuery` has no `.raw` case, and Fluent's `Database.execute` doesn't accept a raw SQL string this way. To run raw SQL, you must cast the database to `SQLDatabase` (from SQLKit / FluentSQL) and use `sql.raw("SELECT 1").run()`. Fixed in the HealthController readiness check.

3. **`app.shutdown()` in `async tearDown` should be `try await app.asyncShutdown()`.** Using the synchronous `shutdown()` in an async test context is discouraged because it blocks the event loop; Vapor 4 provides `asyncShutdown()` for this purpose. Fixed in the XCTVapor test setup.

4. **`req.redis.get(cacheKey, as: [Todo].self)` is incorrect for a Codable type.** The `get(_:as:)` overload requires `RESPValueConvertible`, which `[Todo]` is not. For Codable values you must use `get(_:asJSON:)`. Fixed.

5. **`req.redis.setex(cacheKey, toJSON: todos, expirationInSeconds: 300)` doesn't exist.** vapor/redis does not provide a single `setex` overload that combines JSON encoding with a TTL. Fixed by splitting it into `set(_:toJSON:)` and `expire(_:after:)`.

## Review Notes

- The Package.swift pins `fluent-postgres-driver` from 2.7.0. The newer 2.8+ versions deprecated the `tlsConfiguration:` parameter in favor of `tls:` on `SQLPostgresConfiguration`. The connection-pooling snippet uses the older `tlsConfiguration: .clientDefault, connectionPoolTimeout: .seconds(10)` API, which still resolves for 2.7.x but may show deprecation warnings against newer driver versions. Not changed since the post explicitly pins the older driver.
- The "Vapor 4 requires Swift 5.6 or later" comment is accurate for Vapor 4.89.0 (which the post pins). The current main branch of Vapor 4 has moved its `swift-tools-version` to 5.9, but the pinned version is still valid.
- The XCTVapor test code switches the database to in-memory SQLite via `app.databases.use(.sqlite(.memory), as: .sqlite)`. This implicitly assumes `fluent-sqlite-driver` is added to Package.swift, which it isn't in the example. Readers should add `Fluent.package(url: "https://github.com/vapor/fluent-sqlite-driver.git", from: "4.0.0")` to make the tests compile. Left as-is since adding this is a reasonable inference.
- The migration uses `.field("is_completed", .bool, .required, .custom("DEFAULT FALSE"))`. `.custom(Any)` is a real `DatabaseSchema.FieldConstraint` case, but the idiomatic Fluent approach for a column default is `.sql(unsafeRaw: "DEFAULT FALSE")`. The `.custom` form may behave inconsistently across drivers; this could be improved.
- `JWTSigner.hs256(key: "your-secret-key")` is hardcoded inside `generateToken()` instead of using `req.application.jwt.signers`. The post also configures `app.jwt.signers.use(.hs256(key: jwtSecret))` in `configure.swift`, so the two could drift. The idiomatic approach is `try req.jwt.sign(payload)`. Functional but inconsistent.
- `Validatable` uses both `is: !.empty` and `is: .count(1...255)` for the same field; the first check is redundant since `.count(1...255)` already enforces a minimum length of 1. Cosmetic, not incorrect.
