# Validation Summary: How to Use Akka for Actor-Based Concurrency

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Scala
- Akka Typed (version 2.9.0)
- Akka actor model
- Akka TestKit
- SLF4J / Logback
- HOCON configuration
- ScalaTest

## Sources Consulted
- Akka 2.9 Routers Scaladoc: https://doc.akka.io/api/akka/2.9/akka/actor/typed/scaladsl/Routers$.html
- Akka 2.9 GroupRouter Scaladoc: https://doc.akka.io/api/akka/2.9/akka/actor/typed/scaladsl/GroupRouter.html
- Akka 2.9 PoolRouter Scaladoc: https://doc.akka.io/api/akka/2.9/akka/actor/typed/scaladsl/PoolRouter.html
- Akka 2.9 AskPattern Scaladoc: https://doc.akka.io/api/akka/2.9/akka/actor/typed/scaladsl/AskPattern$.html
- Akka source: https://github.com/akka/akka/blob/v2.9.5/akka-actor-typed/src/main/scala/akka/actor/typed/scaladsl/Routers.scala
- Akka source: https://github.com/akka/akka/blob/v2.9.5/akka-actor-typed/src/main/scala/akka/actor/typed/MessageAndSignals.scala
- Akka source: https://github.com/akka/akka/blob/v2.9.5/akka-actor-typed/src/main/scala/akka/actor/typed/scaladsl/AskPattern.scala
- Akka Fault Tolerance docs: https://doc.akka.io/libraries/akka-core/2.9/typed/fault-tolerance.html
- Akka Actor Lifecycle docs: https://doc.akka.io/libraries/akka-core/2.9/typed/actor-lifecycle.html
- Akka Routers docs: https://doc.akka.io/docs/akka/2.9/typed/routers.html

## Issues Found

1. **Incorrect `Routers.group` usage in `broadcastRouter`** — The original code called `Routers.group(workers.head, workers.tail: _*).withBroadcastPredicate(_ => true)`. Two errors:
   - `Routers.group[T]` only accepts a `ServiceKey[T]`, not a variadic list of `ActorRef`s. Group routers discover routees via the Receptionist, not from direct refs.
   - `withBroadcastPredicate` is defined only on `PoolRouter`, not on `GroupRouter`.

   **Fix**: Rewrote `broadcastRouter` to use `Routers.pool(poolSize) { ... }.withBroadcastPredicate(_ => true)`, which is the supported broadcast idiom in Akka Typed. The function signature changed from `Vector[ActorRef[TaskCommand]] => Behavior` to `Int => Behavior` accordingly.

2. **Non-existent `PreStart` / `PostRestart` signals in the lifecycle diagram** — The state diagram labeled the `Created → Running` transition as `PreStart` and the `Restarting → Running` transition as `PostRestart`. Neither signal exists in Akka Typed (only `PreRestart`, `PostStop`, `Terminated`, and `ChildFailed` are typed `Signal`s). In Akka Typed, initialization on creation and after restart is performed by `Behaviors.setup`.

   **Fix**: Relabeled both transitions to `Setup` to reflect the actual mechanism in Akka Typed.

## Review Notes

- The Akka version pinned in `build.sbt` (`2.9.0`) is valid; logback-classic `1.4.14` is appropriate. Newer Akka 2.9.x patch releases are available, but `2.9.0` is not incorrect.
- The nested `Behaviors.supervise` pattern in `PaymentProcessor` correctly composes per-exception-type strategies, matching documented Akka Typed practice.
- The `AskPattern` usage — `import akka.actor.typed.scaladsl.{Behaviors, AskPattern}` followed by `import AskPattern._` inside the method, with an implicit `ActorSystem[_]` in scope — is valid: `AskPattern` provides `schedulerFromActorSystem` so the required implicit `Scheduler` is derived.
- `ref.unsafeUpcast[String]` in the `WorkerPool` example is the documented way to recover the routee's actual type from `Terminated.ref` (which is `ActorRef[Nothing]`).
- `Routers.pool(...).withRoundRobinRouting()` is redundant since round-robin is the default routing strategy for pool routers, but it is harmless and serves as explicit documentation.
- The `provider = "local"` HOCON setting is valid (other accepted values are `"remote"` and `"cluster"`).
- The `context.system.dispatchers.lookup(DispatcherSelector.fromConfig(...))` pattern for resolving the blocking dispatcher is correct for Akka Typed.
