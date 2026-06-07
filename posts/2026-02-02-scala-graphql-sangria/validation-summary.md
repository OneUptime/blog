# Validation Summary: How to Build GraphQL APIs with Sangria in Scala

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Scala (2.13 / 3 compatible patterns)
- Sangria 4.1.0 (GraphQL library)
- sangria-spray-json 1.0.3 (marshaller)
- Akka HTTP 10.5.3
- Akka Streams 2.8.5
- spray-json
- GraphQL (query language and runtime)

## Sources Consulted
- Sangria source — `sangria.schema` package object (LongType definition): https://github.com/sangria-graphql/sangria/blob/master/modules/core/src/main/scala/sangria/schema/package.scala
- Sangria documentation: https://sangria-graphql.github.io/
- Maven Central directory listing for `org.sangria-graphql:sangria_2.13` (confirmed 4.1.0 exists): https://repo1.maven.org/maven2/org/sangria-graphql/sangria_2.13/
- Maven Central directory listing for `org.sangria-graphql:sangria-spray-json_2.13` (confirmed 1.0.3 exists): https://repo1.maven.org/maven2/org/sangria-graphql/sangria-spray-json_2.13/
- Maven Central directory listing for `com.typesafe.akka:akka-http_2.13` (confirmed 10.5.3 exists): https://repo1.maven.org/maven2/com/typesafe/akka/akka-http_2.13/
- Maven Central directory listing for `com.typesafe.akka:akka-stream_2.13` (confirmed 2.8.5 exists): https://repo1.maven.org/maven2/com/typesafe/akka/akka-stream_2.13/
- spray-json `JsObject` companion (confirmed `JsObject.empty` exists): https://github.com/spray/spray-json/blob/v1.3.6/src/main/scala/spray/json/JsValue.scala
- GraphQL specification (scalar types — Int, Float, String, Boolean, ID): https://spec.graphql.org/

## Issues Found

1. **Incorrect GraphQL type mapping for `LongType` in the reference table.** The original table claimed Sangria's `LongType` maps to GraphQL's `Int` ("GraphQL has no Long"). In fact, Sangria's `LongType` is declared in `sangria.schema.package` as `ScalarType[Long]("Long", ...)`, which registers a custom GraphQL scalar named `Long` (capable of representing values between `-(2^63)` and `2^63 - 1`). Updated the row to: `` `Long` (Sangria custom scalar) ``.

2. **Broken reference `Schema.schema` in the Akka HTTP integration.** The schema is defined as a top-level `val schema: Schema[AppContext, Unit] = ...` in `Schema.scala` and the server file does `import graphql._`, but the `Executor.execute` call referenced `Schema.schema` — which would resolve to `sangria.schema.Schema` (the class) and fail to compile because that companion has no `schema` member. Changed the named argument to `schema = schema` so it picks up the imported val.

## Review Notes
- All four library versions cited (Sangria 4.1.0, sangria-spray-json 1.0.3, Akka HTTP 10.5.3, Akka Streams 2.8.5) were confirmed present on Maven Central. Note that Sangria's latest 4.x line is now 4.2.18 (released 2026-04-13); the 4.1.0 example will compile but readers wanting current bugfixes should bump to a 4.2.x patch. Similarly, Akka HTTP has since moved to 10.7.x under the BSL license — 10.5.3 is the last in the 10.5 line and remains under Apache 2.0.
- The schema-definition snippets (`lazy val PostType`, `lazy val UserType`, `val QueryType`, etc.) are shown as top-level vals in `Schema.scala`. This compiles under Scala 3's top-level definitions, or under Scala 2 if wrapped in a `package object graphql` / `object SchemaDefinition`. The post does not state which Scala version it targets; readers using Scala 2.13 will need a package object or enclosing object for the snippets to compile as written.
- The `defaultValue = 10` on the `limit` argument (`OptionInputType(IntType)`) relies on Sangria's `ToInput[Int, _]` implicit and works correctly; the subsequent `ctx.arg[Int]("limit")` returns the supplied or default value (no `Option` unwrapping needed because Sangria applies the default during coercion).
- `JsObject.empty` (used in the Akka HTTP route) is provided by spray-json's `JsObject` companion (`val empty = JsObject(TreeMap.empty[String, JsValue])`), so that call is valid.
- The mutation resolvers use `Map[String, Any]` plus `asInstanceOf[String]` to unpack `InputObjectType[DefaultInput]` arguments. This is correct for the default input representation (`type DefaultInput = Map[String, Any]` in `sangria.schema`) but is not type-safe; a real codebase would typically derive a case-class-backed `InputObjectType` via `deriveInputObjectType` from `sangria.macros.derive` to get compile-time safety.
- The `.map(_.toJson)` call after `Executor.execute(...)` is technically a no-op when the spray-json marshaller is in scope (the executor already returns `JsValue`), but it compiles via the identity `JsValueFormat` and does not produce incorrect output.
