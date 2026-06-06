# Validation Summary: How to Build REST APIs with Play Framework

## Status
validated

## Post Type
Tutorial / Guide — walks through building a REST API in Scala with Play Framework, covering routing, controllers, JSON, dependency injection, Slick persistence, error handling, and tests.

## Technologies Covered
- Scala 2.13
- Play Framework (2.8.x via `com.typesafe.play` group)
- Play JSON (Reads/Writes/Format type classes, functional syntax)
- Play Slick + Slick 3.x for PostgreSQL persistence
- Google Guice (Play's default DI container)
- play.filters.cors.CORSFilter
- ScalaTest + scalatestplus-play
- Mockito (Java) used from Scala tests
- sbt + `playframework/play-scala-seed.g8` template
- HOCON configuration

## Sources Consulted
- Play Framework 2.8.x docs (routing, action composition, HttpErrorHandler, JSON, CORS): https://www.playframework.com/documentation/2.8.x/
- Play JSON reference (Reads.email / Reads.minLength / readWithDefault / readNullable / `Json.format` macro): https://www.playframework.com/documentation/2.8.x/ScalaJson and https://github.com/playframework/play-json
- Play Slick GitHub (compatibility matrix for play-slick 5.1.0 → Play 2.8.x): https://github.com/playframework/play-slick
- Slick 3.x manual (`MappedColumnType.base`, `mapTo`, `TableQuery`, `returning`): https://scala-slick.org/doc/3.4.1/
- scalatestplus-play (compatibility for 5.1.0 → Play 2.8.x): https://github.com/playframework/scalatestplus-play
- Mockito 4/5 javadoc — `org.mockito.Mockito.mock`, `org.mockito.ArgumentMatchers.any`: https://javadoc.io/doc/org.mockito/mockito-core/latest/
- play-scala-seed.g8 template repo (current default targets Play 3.0.x): https://github.com/playframework/play-scala-seed.g8

## Issues Found

1. **Slick `*` projection used `mapTo[User]` with a type mismatch.** The `UsersTable` defined `def role = column[String]("role")` while the `User` case class declares `role: UserRole`. Slick's `mapTo[User]` requires the tuple of column types to match the case class's field types element-wise, so this would not compile. Fixed by adding an `implicit val userRoleColumnType: BaseColumnType[UserRole]` built with `MappedColumnType.base[UserRole, String]` (encoding `UserRole` to/from a lowercase string), changing the column to `column[UserRole]("role")`, and removing the now-unnecessary `role.toString` calls in `create` and `update`. This preserves the table-shape and `mapTo` style the author was demonstrating.

2. **Missing Mockito matcher import in `UserControllerSpec`.** The test used `any()` inside `when(mockUserService.createUser(any()))`, but only `org.mockito.Mockito._` was imported. The `any()` matcher lives in `org.mockito.ArgumentMatchers`, so the original code would not compile. Added `import org.mockito.ArgumentMatchers.any`.

## Review Notes

- **Dependency line implicitly pins to Play 2.8.x.** `play-slick 5.1.0` and `scalatestplus-play 5.1.0` are both released against Play 2.8.x; they are consistent with each other, so I did not change them. Worth knowing for any future update: Play 2.9.x needs `play-slick` 5.2.x / `scalatestplus-play` 6.0.x, and Play 3.0.x needs `play-slick` 6.x / `scalatestplus-play` 7.x (plus the group changes from `com.typesafe.play` to `org.playframework`).
- **Seed template default has moved on.** `sbt new playframework/play-scala-seed.g8` (no branch) currently scaffolds a Play 3.0.x project, which would not match the Play 2.8.x dependencies shown later. Readers targeting Play 2.8 should append `--branch 2.8.x` (or `2.9.x`) to the `sbt new` command. Not changed in the post since the author may have intended this as illustrative; flagging for future revisions.
- **`UsersTable` includes a `passwordHash` column** that is intentionally absent from the `User` case class / `*` projection — fine for hiding the hash from API responses, but readers should be aware they cannot insert via `users += someUser` and must use the column-list insert pattern the post already uses in `create`.
- **`Json.format[User]` macro relies on the implicit `Format[UserRole]`** defined in `object UserRole`. Companion-object implicits are in scope at the macro expansion site, so this works, but it's a subtle dependency worth knowing if the role format is ever moved.
- **`AuthenticatedAction` uses `ActionBuilder[AuthenticatedRequest, AnyContent]` with `ActionRefiner[Request, AuthenticatedRequest]`** — this is the correct higher-kinded shape for Play 2.8+ action composition.
- **`CORSFilter` is provided by `filters` dependency.** The post enables it in `application.conf` but does not list `filters` in `libraryDependencies`. Most users will pick it up transitively or already have it; not a blocking error but a soft gotcha.
