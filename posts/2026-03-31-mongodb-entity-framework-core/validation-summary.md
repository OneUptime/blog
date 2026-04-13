# Validation Summary: How to Use MongoDB with Entity Framework Core (EF Core Provider)

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB
- Entity Framework Core (EF Core)
- MongoDB.EntityFrameworkCore NuGet package
- C# / .NET
- ASP.NET Core (dependency injection registration)
- LINQ

## Sources Consulted
- MongoDB EF Core Provider GitHub repository (https://github.com/mongodb/mongo-efcore-provider)
- MongoDB EF Core Provider NuGet page (MongoDB.EntityFrameworkCore)
- MongoDB EF Core Provider BREAKING-CHANGES.md (transaction support details in 8.1.0)
- MongoDB EF Core Provider source code: MongoDbContextOptionsExtensions.cs (UseMongoDB overloads), MongoEntityTypeBuilderExtensions.cs (ToCollection method)
- MongoDB EF Core Provider test suite: OwnedEntityTests.cs, SimpleKeyCrudTests.cs, AddEntityTests.cs, DeleteEntityTests.cs, UpdateEntityTests.cs

## Issues Found
- **Transaction support claim was incorrect**: The post stated that transactions are unsupported "as of initial releases." This is outdated and misleading. Transactions have been supported since version 8.1.0 of the MongoDB EF Core Provider, and auto-transactional `SaveChanges`/`SaveChangesAsync` is enabled by default. Updated the "Current Limitations" section to reflect this accurately and removed the incorrect guidance to use the native driver for transactions.

## Review Notes
- The `[Key]` attribute with `ObjectId` works correctly but is not the most idiomatic MongoDB approach. Official MongoDB examples typically use `_id` property naming by convention or the `[BsonId]` attribute from the MongoDB driver. The blog's approach is valid and familiar to EF Core developers, so no change was made.
- The `using System.ComponentModel.DataAnnotations.Schema;` import in the entity definition is unused (only `[Key]` from `System.ComponentModel.DataAnnotations` is used), but this is harmless and does not affect compilation.
- The `UseMongoDB()` method has multiple overloads including one that accepts an `IMongoClient` instance. The blog uses the connection-string overload which is correct and matches the official DI pattern.
- All LINQ operators used in the post (`Where`, `OrderBy`, `Skip`, `Take`, `CountAsync`, `AnyAsync`) are confirmed supported by the provider.
- The `OwnsOne` pattern for embedded documents is confirmed correct per the provider's test suite and documentation.
