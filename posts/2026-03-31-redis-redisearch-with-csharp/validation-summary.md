# Validation Summary: How to Use RediSearch with C#

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Redis (redis-stack-server Docker image)
- RediSearch (full-text search module)
- RedisJSON (JSON document storage)
- NRedisStack (.NET client library for Redis Stack)
- StackExchange.Redis (underlying .NET Redis connection library)
- C# / .NET

## Sources Consulted
- NRedisStack GitHub repository source code: https://github.com/redis/NRedisStack
  - `src/NRedisStack/Search/Query.cs` — verified `SetSortBy(string field, bool? ascending = null)` and `Limit(int offset, int count)` signatures
  - `src/NRedisStack/Search/SearchResult.cs` — verified `TotalResults` (long) and `Documents` (List<Document>) properties
  - `src/NRedisStack/Search/AggregationResult.cs` — confirmed `GetResults()` is deprecated, `GetRow(int index)` is the replacement
  - `src/NRedisStack/Search/SortedField.cs` — confirmed `SortedField(string, SortOrder)` constructor and `SortOrder.DESC` enum in `NRedisStack.Search.Aggregation` namespace
  - `src/NRedisStack/Search/AggregationRequest.cs` — confirmed `GroupBy(string field, params Reducer[] reducers)` and `SortBy(params SortedField[] fields)` in `NRedisStack.Search` namespace
  - `src/NRedisStack/Search/Reducers.cs` — confirmed static `Count()` method in `NRedisStack.Search.Aggregation` namespace
  - `src/NRedisStack/Search/Reducer.cs` — confirmed `As(string alias)` method returning `Reducer`
  - `src/NRedisStack/Search/Row.cs` — confirmed string indexer `this[string key]` returning `RedisValue` in `NRedisStack.Search.Aggregation` namespace
- Redis official documentation for NRedisStack: https://redis.io/docs/latest/develop/clients/dotnet/
- NuGet package page: https://www.nuget.org/packages/NRedisStack/

## Issues Found
1. **Missing `using` statement for aggregation namespace**: The code in the "Connecting" section was missing `using NRedisStack.Search.Aggregation;`. This namespace is required for `Reducers`, `SortedField`, and `SortedField.SortOrder` used in the Aggregation section. Without it, the aggregation code would fail to compile. **Fixed** by adding the missing using directive.

2. **Deprecated `GetResults()` method on `AggregationResult`**: The aggregation example used `aggResult.GetResults()` which is marked with `[Obsolete("This method is deprecated and will be removed in future versions. Please use 'GetRow' instead.")]`. This would produce compiler warnings and could break in future NRedisStack releases. **Fixed** by replacing the `foreach` loop with a `for` loop using `aggResult.GetRow(i)` and `aggResult.TotalResults`.

## Review Notes
- The post mixes synchronous API calls (`ft.Create`, `ft.Search`, `ft.Aggregate`) with an asynchronous call (`await json.SetAsync`). This is technically valid in C# but requires the enclosing method to be `async`. Since this is a tutorial with code snippets rather than a complete application, this is acceptable.
- Both sync and async variants exist for all NRedisStack methods (e.g., `ft.CreateAsync`, `ft.SearchAsync`). A production application would typically use one style consistently.
- `ft.DropIndex("books-idx")` drops only the index, not the underlying data. The optional `dd: true` parameter would delete documents as well. The post doesn't mention this distinction, which is fine for the scope of the tutorial.
