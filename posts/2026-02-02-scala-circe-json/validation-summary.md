# Validation Summary: How to Handle JSON with Circe

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Scala (2.13)
- Circe 0.14.6 (circe-core, circe-generic, circe-parser, circe-generic-extras, circe-optics)
- circe-fs2 (streaming)
- Monocle (via circe-optics)
- Http4s (integration example)
- Cats / Cats Effect
- ScalaTest + ScalaCheck (testing)

## Sources Consulted
- Circe official documentation: https://circe.github.io/circe/
- Circe source code at tag v0.14.6: https://github.com/circe/circe/tree/v0.14.6
  - `modules/core/shared/src/main/scala/io/circe/Parser.scala` (verified `decodeAccumulating` signature)
  - `modules/core/shared/src/main/scala/io/circe/Error.scala` (verified `Error`, `ParsingFailure`, `DecodingFailure` API)
  - `modules/core/shared/src/main/scala/io/circe/Decoder.scala` (verified `AccumulatingResult` type alias)
  - `modules/parser/jvm-native/src/main/scala/io/circe/parser/package.scala` (verified `parser` package object structure)
- Maven Central search for available versions:
  - `io.circe:circe-core_2.13` (confirmed 0.14.6 exists)
  - `io.circe:circe-generic-extras_2.13` (confirmed only goes up to 0.14.4 stable / 0.14.5-RC1)
- Http4s documentation: https://http4s.org/v0.23/docs/json.html (Circe integration)

## Issues Found

1. **Incorrect `circe-generic-extras` version pinning (`build.sbt`)**
   - The dependency was declared as `"io.circe" %% "circe-generic-extras" % circeVersion` where `circeVersion = "0.14.6"`. There is no `circe-generic-extras` 0.14.6 published — that artifact's latest stable release is `0.14.4` (with a `0.14.5-RC1` pre-release). Using `circeVersion` would cause dependency resolution to fail.
   - **Fix:** Pinned to `"0.14.4"` explicitly and added a comment noting the separate version line.

2. **Compile error in accumulating-errors example (`errors/ErrorHandling.scala`)**
   - Code called `parser.decodeAccumulating[Person](jsonWithMultipleErrors)`. With `import io.circe.parser._`, the package object members are imported but the name `parser` is not in scope, so the qualified call does not compile. Inside the `parser` package object there is a `private[this] val parser` that is also not accessible externally.
   - **Fix:** Changed to `decodeAccumulating[Person](jsonWithMultipleErrors)` (matches the post's existing import).

3. **Type error iterating accumulated errors**
   - The original code did `errors.toList.foreach { error => error.history; error.message }`. In circe 0.14.x, `Parser.decodeAccumulating` returns `ValidatedNel[Error, A]` (not `ValidatedNel[DecodingFailure, A]`), and `io.circe.Error` is a sealed abstract class that does not expose `.history` or `.message` directly — only the `DecodingFailure` subclass does.
   - **Fix:** Pattern-matched on subtype (`case df: DecodingFailure` / `case pf: ParsingFailure`) so the field accesses are well-typed.

4. **Broken Http4s `handleErrors` middleware (`http/Http4sIntegration.scala`)**
   - The function used `routes(req).map { case Some(response) => Some(response); case None => Some(Response[IO](Status.NotFound)) }`. In Http4s 0.23+, `HttpRoutes[F]` is `Kleisli[OptionT[F, *], Request[F], Response[F]]`, so `routes(req)` returns `OptionT[IO, Response[IO]]`. `OptionT#map` transforms the inner `Response[IO]`, not an `Option[Response[IO]]`, so the `Some/None` patterns do not match the value being mapped. The example also referenced `OptionT.liftF` without an explicit import.
   - **Fix:** Removed the broken middleware block. The main `userRoutes` example (which is the actual focus of the Circe integration section) was left intact since it is correct.

## Review Notes

- The post is pinned to Circe `0.14.6`. The current latest 0.14.x release is `0.14.13` (as of the Maven snapshot taken during review). 0.14.6 is still a valid pinned version, but a future refresh could bump to the latest patch release.
- circe-generic-extras is effectively in maintenance mode in the 0.14.x line and its features have largely been folded into circe-generic / circe-generic-extras for Scala 2.x users only. Readers using Scala 3 should be aware that some derivation features (especially `@ConfiguredJsonCodec` and the `Configuration`-driven helpers) require different setup.
- The encoder section defines both `moneyDecoder` and `flexibleMoneyDecoder` as `implicit val Decoder[Money]` in the same `object`. If imported together this would cause an "ambiguous implicit" error. The intent is clearly to present them as alternatives; leaving as-is since the prose frames them that way and breaking them into separate objects would be a stylistic change beyond the scope of this technical review.
- The `JsonCursors.scala` `withFocus` example uses a roundabout `Json.fromInt(...).asNumber.get` to round-trip through `JsonNumber`. It is technically correct but could be simplified in a future revision.
- The "Output: At path: .age" comment for `CursorOp.opsToPath` is plausible for 0.14.x but the exact path string is an implementation detail of circe and could differ; this is illustrative only.
- The `Decoder.forProduct3("id", "name", "active")(TestUser.apply)` call relies on Scala 2.13's eta-expansion of `TestUser.apply`; in Scala 3 a `TestUser.apply` reference (or `TestUser(_, _, _)`) would be needed in some contexts. Out of scope to change for a 2.13-targeted tutorial.
