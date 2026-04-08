# Validation Summary: How to Use Connection Pooling with the MongoDB .NET Driver

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- MongoDB
- MongoDB .NET/C# Driver (v2.x / v3.x)
- ASP.NET Core (dependency injection)
- Connection Monitoring and Pooling (CMAP) specification

## Sources Consulted
- MongoDB C# Driver source - MongoDefaults.cs: https://github.com/mongodb/mongo-csharp-driver/blob/main/src/MongoDB.Driver/MongoDefaults.cs
- MongoDB C# Driver source - MongoClientSettings.cs: https://github.com/mongodb/mongo-csharp-driver/blob/main/src/MongoDB.Driver/MongoClientSettings.cs
- MongoDB C# Driver source - Events directory: https://github.com/mongodb/mongo-csharp-driver/tree/main/src/MongoDB.Driver/Core/Events
- MongoDB Connection String Options: https://www.mongodb.com/docs/manual/reference/connection-string-options/
- MongoDB CMAP Specification: https://github.com/mongodb/specifications/blob/master/source/connection-monitoring-and-pooling/connection-monitoring-and-pooling.md

## Issues Found

1. **Incorrect default WaitQueueTimeout value (line 22)**: The post claimed the default wait queue timeout is 30 seconds. The actual default is **2 minutes** (`TimeSpan.FromMinutes(2)`) as defined in `MongoDefaults.cs`. Fixed to "2 minutes".

2. **Misleading SocketTimeout comment (line 43)**: The inline comment described `SocketTimeout` as "idle socket timeout". `SocketTimeout` controls the timeout for socket **read/write operations**, not idle connections. Idle connection lifetime is controlled by `MaxConnectionIdleTime`. Fixed comment to "socket read/write timeout".

3. **Incorrect event class names (lines 92, 95, 98, 122)**: Three event class names were wrong and would cause compilation errors:
   - `ConnectionCheckedOutEvent` → `ConnectionPoolCheckedOutConnectionEvent`
   - `ConnectionCheckedInEvent` → `ConnectionPoolCheckedInConnectionEvent`
   - `ConnectionPoolCheckedOutConnectionFailedEvent` → `ConnectionPoolCheckingOutConnectionFailedEvent` (note: "Checking" not "Checked")

## Review Notes
- `WaitQueueTimeout` is deprecated at the MongoDB specification level (CSOT spec) in favor of the newer `timeoutMS` / `Timeout` property. The C# driver v3 supports the new `Timeout` property. The post does not mention this, but since it still works in current versions, this is not an error — just something to be aware of for future updates.
- The pool sizing formula (`peak concurrent requests * avg DB calls per request`) is a rough upper bound that assumes all DB calls per request happen in parallel. For sequential DB calls within a request, fewer connections are needed. The "always load-test" caveat mitigates this.
