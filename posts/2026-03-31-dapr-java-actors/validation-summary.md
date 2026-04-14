# Validation Summary: How to Use Dapr Actors with Java

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr (actor building block)
- Dapr Java SDK (`dapr-sdk-actors`, `dapr-sdk-springboot`)
- Java
- Spring Boot
- Project Reactor (Mono)

## Sources Consulted
- Dapr Java SDK source — `ActorStateManager.java`: https://github.com/dapr/java-sdk/blob/master/sdk-actors/src/main/java/io/dapr/actors/runtime/ActorStateManager.java
- Dapr Java SDK source — `ActorProxyBuilder.java`: https://github.com/dapr/java-sdk/blob/master/sdk-actors/src/main/java/io/dapr/actors/client/ActorProxyBuilder.java
- Dapr Java SDK source — `AbstractActor.java`: https://github.com/dapr/java-sdk/blob/master/sdk-actors/src/main/java/io/dapr/actors/runtime/AbstractActor.java
- Dapr official documentation: https://docs.dapr.io/developing-applications/building-blocks/actors/

## Issues Found

1. **`getOrDefault()` does not exist on `ActorStateManager`** (critical, would not compile): The post used `this.getActorStateManager().getOrDefault(COUNT_KEY, Integer.class, 0)` in both `increment()` and `getCount()`. The `ActorStateManager` class only exposes `add`, `get`, `set`, `remove`, `contains`, `save`, and `clear`. Fixed by replacing with the `contains()` + `get()` pattern: `contains(key).flatMap(exists -> exists ? get(key, Integer.class) : Mono.just(0))`.

2. **Client code used `DaprClientBuilder` instead of `ActorClient`** (critical, would not compile): The `ActorProxyBuilder` constructors accept `ActorClient`, not `DaprClientBuilder`. Fixed by replacing `new DaprClientBuilder()` with `new ActorClient()` and importing `io.dapr.actors.client.ActorClient`.

3. **`ActorProxyBuilder` used in try-with-resources but is not `AutoCloseable`** (critical, would not compile): `ActorProxyBuilder` does not implement `AutoCloseable`. The correct pattern is to wrap `ActorClient` (which is `AutoCloseable`) in the try-with-resources block. Fixed by restructuring the client code to `try (ActorClient actorClient = new ActorClient())`.

4. **`builder.build()` returns typed interface `T`, not `ActorProxy`** (incorrect cast): The post cast the result of `build()` to `ActorProxy` and then to `CounterActor`. In reality, `build()` already returns the typed interface directly. Fixed by assigning directly: `CounterActor actor = builder.build(...)`.

5. **Missing `ActorId` import in implementation class** (would not compile): The implementation class used `ActorId` in its constructor but did not import it. Added `import io.dapr.actors.ActorId;`.

6. **`registerActorTimer` returns `Mono<String>`, not `Mono<Void>`** (type mismatch): The `onActivate()` method returns `Mono<Void>` but `registerActorTimer` returns `Mono<String>`. Fixed by appending `.then()` to convert the result.

## Review Notes
- The `javax.annotation.PostConstruct` import in the registration section is correct for Spring Boot 2.x but should be `jakarta.annotation.PostConstruct` for Spring Boot 3.x. Since the post does not specify a Spring Boot version, this was left as-is but readers using Spring Boot 3.x should update the import.
- The `@ActorMethod` annotation's optional `returns` attribute (e.g., `@ActorMethod(name = "GetCount", returns = Integer.class)`) is not mentioned. While the code works without it for simple types, it can be important for complex generic return types.
- The timer callback method signature `public Mono<Void> reportCallback(byte[] state)` may need adjustment depending on the state type passed to `registerActorTimer`. When `null` state is used, the callback parameter handling is implementation-dependent.
