# Validation Summary: How to Use redis-om-dotnet for Object Mapping

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Redis
- Redis Stack (RedisJSON + RediSearch)
- redis-om-dotnet (Redis.OM NuGet package)
- .NET / C#
- ASP.NET Core (dependency injection section)
- LINQ

## Sources Consulted
- redis-om-dotnet GitHub repository (https://github.com/redis/redis-om-dotnet) — verified attributes (`DocumentAttribute`, `RedisIdFieldAttribute`, `IndexedAttribute`), `RedisConnectionProvider` constructors, `IRedisCollection<T>` methods, and `RediSearchCommands` extension methods against source code
- NuGet registry for Redis.OM package (https://www.nuget.org/packages/Redis.OM/) — confirmed package name and current version (1.1.0)
- Redis.OM source: `StorageType.cs`, `DocumentAttribute.cs`, `RedisIdFieldAttribute.cs`, `SearchFieldAttribute.cs`, `RedisConnectionProvider.cs`, `IRedisCollection.cs`, `SearchExtensions.cs`, `RediSearchCommands.cs`

## Issues Found

1. **Incorrect comment: "Full-text search"** — The query `c => c.LastName == "Smith"` was labeled as "// Full-text search" but the `LastName` field uses the `[Indexed]` attribute, which creates a TAG field in RediSearch. TAG fields perform exact matching, not full-text search. Full-text search requires the `[Searchable]` attribute (which creates a TEXT field with tokenization and stemming). Changed the comment to "// Exact match on last name".

2. **Unnecessary cast in DI section** — The controller field was typed as `RedisCollection<Customer>` (concrete class) and used an explicit cast `(RedisCollection<Customer>)provider.RedisCollection<Customer>()`. The `RedisCollection<T>()` method returns `IRedisCollection<T>`, so the field should use the interface type. Removed the cast and changed the field type to `IRedisCollection<Customer>`.

## Review Notes
- The `[Indexed]` attribute on string properties creates TAG fields (exact match). If future versions of this post want to demonstrate full-text search, the `[Searchable]` attribute should be used instead, which creates TEXT fields supporting tokenization, stemming, and fuzzy matching.
- The default storage type is `StorageType.Hash`, not JSON. The post correctly specifies `StorageType.Json` explicitly where JSON storage is intended.
- The default ID generation strategy is ULID. The post uses `string? Id` which works correctly with the default strategy.
- `CreateIndexAsync` and `CreateIndex` are extension methods on `IRedisConnection` (defined in `RediSearchCommands.cs`), not interface members. This matters if someone tries to mock the connection for unit testing.
