# Validation Summary: How to Configure Play Framework Action Composition

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Scala
- Play Framework (`play.api.mvc`)
- Play Framework Action Composition (`ActionBuilder`, `ActionRefiner`, `ActionFilter`, `ActionTransformer`)
- Play JSON (`play.api.libs.json`, `play.api.libs.functional.syntax`)
- JSR-330 Dependency Injection (`javax.inject.Inject`, `@Singleton`)
- Scala concurrent / `Future`, `ExecutionContext`

## Sources Consulted
- Play Framework 2.8 Action Composition documentation: https://www.playframework.com/documentation/2.8.x/ScalaActionsComposition
- Play JSON Combinators documentation: https://www.playframework.com/documentation/2.8.x/ScalaJsonCombinators
- Play Framework Scaladoc for `JsonValidationError`: https://www.playframework.com/documentation/2.8.x/api/scala/play/api/libs/json/JsonValidationError.html
- Play Framework Scaladoc for `ActionBuilder`, `ActionRefiner`, `ActionFilter` traits

## Issues Found

1. **`AuthenticatedAction` parser self-reference bug** — The original code had:
   ```scala
   class AuthenticatedAction @Inject()(
     parser: BodyParsers.Default,   // no `val`
     ...
   )(implicit ec: ExecutionContext) extends ActionBuilder[...]
     with ActionRefiner[...] {

     override def parser: BodyParser[AnyContent] = parser   // self-recursive!
     override protected def executionContext: ExecutionContext = ec
     ...
   }
   ```
   Because the constructor parameter `parser` is not declared `val`, the override `def parser = parser` references the method itself, producing infinite recursion (StackOverflowError) at runtime. Fixed by switching to the official Play idiom: declare the constructor parameter as `val parser: BodyParsers.Default` and the execution context as `(implicit val executionContext: ExecutionContext)`. The (now redundant) override stubs were removed. This matches the `UserAction` example in the official Play 2.8 Action Composition docs.

2. **Missing `play.api.libs.functional.syntax._` import** — The `UserController` example uses the `and` combinator to build a `Reads[CreateUserRequest]`:
   ```scala
   (__ \ "name").read[String]... and (__ \ "email").read[String]... and ...
   ```
   `and` is provided by `FunctionalBuilderOps` in `play.api.libs.functional.syntax`, not by `play.api.libs.json`. Without this import the snippet would fail to compile. Added `import play.api.libs.functional.syntax._` to the imports block.

## Review Notes
- The use of the type lambda `({type L[A] = ValidatedRequest[A, T]})#L` in `ValidationAction` is valid Scala 2 syntax and works in Play 2.8 against Scala 2.12/2.13. In a Scala 3 / Play 3.0 codebase the kind-projector or native type lambda syntax would be preferred — worth noting for readers on newer stacks.
- `BodyParsers.Default` extends `BodyParser[AnyContent]`, so satisfying the abstract `parser: BodyParser[B]` member of `ActionBuilder[_, AnyContent]` via `val parser: BodyParsers.Default` is well-formed.
- The `RateLimitFilter` (and `PermissionAction`) only extends `ActionFilter`, not `ActionBuilder`, so it cannot be used standalone — only via `andThen`. The post uses it correctly, but this is a common point of confusion.
- `JsonValidationError` exposes both `messages: Seq[String]` and a `message: String` lazy accessor in Play 2.8+, so the `e.message` reference in `ValidationAction.refine` is fine and was left as-is.
- The composition order in `Actions.api` places `errorHandlingAction` first; that means `errorHandlingAction.invokeBlock`'s `recover` will catch exceptions from downstream actions as well — which is the intended behaviour for a global error wrapper, but the post does not explicitly call this out.
- The post targets the Play 2.8 / 2.9 (Scala 2.13) DI style. If a future migration to Play 3.x (Pekko-based, Scala 3) is undertaken, package names (`play.api.*`) remain stable but the implicit `executionContext` / parser idiom continues to apply.
