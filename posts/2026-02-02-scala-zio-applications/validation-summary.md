# Validation Summary: How to Build Applications with ZIO

## Status
validated

## Post Type
Tutorial / Guide — a practical introduction to ZIO covering effects, error handling, ZLayer DI, concurrency, resource management, HTTP serving, testing, and application structure.

## Technologies Covered
- Scala 3.3.1
- ZIO 2.0.21 (core)
- zio-json 0.6.2
- zio-http 3.0.0-RC4
- zio-test 2.0.21
- zio-config (magnolia + typesafe)
- sbt

## Sources Consulted
- ZIO official documentation: https://zio.dev/
- ZIO 2.x Migration Guide: https://zio.dev/guides/migrate/zio-2.x-migration-guide/
- ZIO `Unsafe` API: https://zio.dev/reference/core/unsafe
- ZIO Ref API: https://zio.dev/reference/concurrency/ref
- zio-config (Automatic Derivation): https://zio.dev/zio-config/automatic-derivation-of-config/
- zio-http GitHub: https://github.com/zio/zio-http (Middleware trait, Routes API for 3.0.0-RC4)
- zio-http Middleware Javadoc: https://javadoc.io/static/dev.zio/zio-http-shaded_sjs1_2.13/3.0.0-RC9/zio/http/Middleware.html
- "A Brief History of ZIO" by John A. De Goes: https://degoes.net/articles/zio-history
- Scala `Either.LeftProjection` API: https://www.scala-lang.org/api/current/scala/util/Either$$LeftProjection.html

## Issues Found

1. **Incorrect ZIO name expansion.** The intro stated `ZIO (Zero-cost IO) is an effect system...`. "Zero-cost IO" is not the official expansion of ZIO; the name is a portmanteau from Scalaz's `Z` + `IO` and has no acronym meaning. Removed the parenthetical so the sentence simply reads "ZIO is an effect system...".

2. **Missing markdown heading marker on "Resource Management".** The section header was written as a plain paragraph (`Resource Management`) instead of `## Resource Management`, breaking the document outline. Fixed to use `##`.

3. **`Ref.unsafe.make` used outside an `Unsafe` scope.** The HTTP server example had `val users = Ref.unsafe.make(Map.empty[String, User])` at object scope. In ZIO 2.x, `Ref.unsafe.make` takes an implicit `Unsafe` capability and will not compile unless wrapped in `Unsafe.unsafe { implicit u => ... }`. Wrapped the call accordingly and added an explicit `Ref[Map[String, User]]` type annotation so the route handlers (`users.get`, `users.update`) still type-check.

4. **Outdated zio-config API in the Configuration Management example.** The example mixed the legacy zio-config 3.x API (`ConfigDescriptor[A]`, `read(descriptor from ConfigSource.fromResourcePath)`, `ReadError`) with the modern macro (`deriveConfig[A]`, which actually returns `Config[A]` from ZIO core in zio-config 4.x). The mix would not compile. Rewrote the snippet to the modern API: `Config[AppConfig]` for the derived value, `Config.Error` for the error channel, and `TypesafeConfigProvider.fromResourcePath().load(config)` for loading HOCON resources.

## Review Notes

- The zio-http middleware examples (`Middleware[Any]` + `routes.transform`) are valid for zio-http 3.0.0-RC4. By the time of publication zio-http has shipped stable 3.x releases; readers on later versions should consult the zio-http changelog as the middleware combinators continue to evolve.
- The `Application.scala` example references undefined symbols (`UserRoutes`, `OrderRoutes`, `OrderService`, `DatabaseLayer`, `PostgresOrderRepository`, `SmtpEmailService`). These are illustrative placeholders, consistent with the post's intent to show layer wiring rather than a runnable file.
- `someEither.left.toOption.get` (used in the test example) compiles in Scala 3.3.1 because `LeftProjection` is retained, but the idiom is mildly deprecated. A more modern equivalent would be `result.swap.toOption.get`. Left unchanged — it is not broken.
- `ZIO.fromEither(body.fromJson[CreateUserRequest]).mapError(e => new Exception(e))` works because zio-json's `fromJson` returns `Either[String, A]` and `new Exception(String)` is valid; no change needed.
- The post does not pin specific zio-config or zio-test versions in `build.sbt`. If a reader follows along verbatim, they will pick up zio-config transitively from another dependency or need to add it explicitly. Worth noting but outside the scope of "technical correction".
