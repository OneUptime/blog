# Validation Summary: How to Use Redis Sentinel with Lettuce in Java

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Redis Sentinel
- Java
- Lettuce (Redis client library, version 6.3.2.RELEASE)
- Maven
- Project Reactor (implicit dependency via Lettuce event bus)

## Sources Consulted
- [Lettuce RedisURI.Builder API (6.3.2.RELEASE)](https://lettuce.io/core/release/api/io/lettuce/core/RedisURI.Builder.html)
- [Lettuce MasterReplica API](https://lettuce.io/core/release/api/io/lettuce/core/masterreplica/MasterReplica.html)
- [Lettuce StatefulRedisMasterReplicaConnection API](https://lettuce.io/core/release/api/io/lettuce/core/masterreplica/StatefulRedisMasterReplicaConnection.html)
- [Lettuce RedisServerCommands API](https://lettuce.io/core/release/api/io/lettuce/core/api/sync/RedisServerCommands.html)
- [Lettuce ConnectedEvent source (GitHub)](https://github.com/redis/lettuce/blob/main/src/main/java/io/lettuce/core/event/connection/ConnectedEvent.java)
- [Lettuce Connection Events Wiki](https://github.com/lettuce-io/lettuce-core/wiki/Connection-Events)
- [Lettuce ReadFrom Settings Wiki](https://github.com/lettuce-io/lettuce-core/wiki/ReadFrom-Settings)
- [Lettuce Master-Replica Wiki](https://github.com/redis/lettuce/wiki/Master-Replica)
- [Lettuce MasterReplica.java source (GitHub)](https://github.com/redis/lettuce/blob/main/src/main/java/io/lettuce/core/masterreplica/MasterReplica.java)

## Issues Found

### 1. Missing `StringCodec` import in "Read from Replicas" section
- **What was wrong:** The code used `StringCodec.UTF8` but did not include `import io.lettuce.core.codec.StringCodec;`. This import was not present in any prior code block either.
- **What was changed:** Added the missing import to the imports list in that code block.
- **Why:** Without this import, the code example would not compile.

### 2. Incorrect `role()` return type and misleading comment
- **What was wrong:** The code declared `String role = commands.role().toString()` and commented `// Should be primary`. In reality, `RedisCommands.role()` returns `List<Object>` (e.g., `[master, 0, []]`), not a simple string. The comment "Should be primary" was also incorrect — the Redis ROLE command returns "master", not "primary".
- **What was changed:** Changed the variable type to `List<Object>`, extracted the first element with `role.get(0)`, and updated the comment to show the correct output format and value (`master`).
- **Why:** The original code was misleading about the return type and output, which could confuse readers trying to programmatically check the role of a connected Redis node.

### 3. Unused `ReconnectFailedEvent` import
- **What was wrong:** `import io.lettuce.core.event.connection.ReconnectFailedEvent;` was included but the class was never used in the code example.
- **What was changed:** Removed the unused import.
- **Why:** Unused imports are misleading — they suggest the class is needed for the example when it is not.

## Review Notes
- The Maven version `6.3.2.RELEASE` is a valid release but not the latest. Readers should check Maven Central for newer versions.
- The async example uses `thenCompose`/`thenAccept` from `CompletionStage`, which is correct since Lettuce's `RedisFuture` extends `CompletionStage`.
- The sentinel password feature (`withSentinel(host, port, password)`) requires Lettuce 6.1+ and Redis Sentinel 6.2+ with ACL support. The blog correctly notes this version requirement.
- The event bus API (`eventBus().get()`) returns a Project Reactor `Flux<Event>`, so readers need Project Reactor on the classpath — this is already a transitive dependency of Lettuce.
