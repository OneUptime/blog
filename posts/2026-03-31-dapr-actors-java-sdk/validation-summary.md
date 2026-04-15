# Validation Summary: How to Build Dapr Actors with Java SDK

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr (Distributed Application Runtime)
- Dapr Java SDK (actors and Spring Boot modules)
- Java / Spring Boot
- Project Reactor (Mono reactive types)
- Maven

## Sources Consulted
- Dapr Java SDK GitHub repository: https://github.com/dapr/java-sdk
- Dapr Java SDK actor source code (`AbstractActor`, `ActorStateManager`, `ActorRuntimeContext`, `ActorRuntime`, `ActorProxyBuilder`, `ActorClient`)
- Dapr Java SDK examples: https://github.com/dapr/java-sdk/tree/master/examples/src/main/java/io/dapr/examples/actors
- Maven Central for `io.dapr:dapr-sdk-actors` and `io.dapr:dapr-sdk-springboot` version verification
- Dapr SDK documentation: https://docs.dapr.io/developing-applications/sdks/java/

## Issues Found

1. **Incorrect claim that actor interfaces must extend `Actor`**: The post stated "Actor interfaces must extend `Actor`". There is no `Actor` base interface in the Dapr Java SDK. Actor interfaces are plain Java interfaces, optionally annotated with `@ActorType`. Fixed the text to accurately describe this.

2. **`@ActorMethod` described as required**: The post implied `@ActorMethod` annotations are mandatory. They are optional -- only needed to customize the method name used for invocation or to specify return types for `Mono<T>`. Updated the description to clarify this.

3. **`getOrDefault()` method does not exist on `ActorStateManager`**: The code used `this.getActorStateManager().getOrDefault(key, class, defaultValue)` which is not a real method. The `ActorStateManager` API provides `contains()`, `get()`, `set()`, `add()`, and `remove()`. Replaced with the correct pattern: `contains()` followed by conditional `get()` or default value.

4. **Unnecessary explicit `.save()` calls**: The code called `this.getActorStateManager().save()` after setting state. The Dapr actor framework automatically saves state after each actor method invocation, making explicit `save()` redundant. Removed these calls to match the official examples.

5. **Invalid import `io.dapr.springboot.DaprApplication`**: This class does not exist in the `dapr-sdk-springboot` artifact. A `DaprApplication` class only exists in the examples module (`io.dapr.examples.DaprApplication`). Removed the unused import.

6. **Missing `ActorId` import in actor implementation**: The constructor uses `ActorId` as a parameter but the import was missing. Added `import io.dapr.actors.ActorId`.

## Review Notes
- The Maven dependency version 1.12.0 exists but is outdated. The latest stable version is 1.17.2. This is not incorrect but readers should be aware newer versions are available.
- The `dapr run` CLI command is correct but omits `--resources-path` which may be needed if using custom component configuration files.
- The actor registration pattern using `ActorRuntime.getInstance()` in `main()` is correct for the SDK version shown but readers should check for newer initialization patterns in later SDK versions.
