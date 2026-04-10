# How to Use RediSearch with C#

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, RediSearch, CSharp, .NET, Search

Description: Learn how to build full-text search and secondary indexes with RediSearch using the NRedisStack C# client library.

---

RediSearch is a Redis module that adds full-text search, secondary indexing, and aggregation capabilities. NRedisStack provides a typed .NET API for all RediSearch commands.

## Prerequisites

```bash
dotnet add package NRedisStack
docker run -d -p 6379:6379 redis/redis-stack-server:latest
```

## Connecting

```csharp
using NRedisStack;
using NRedisStack.RedisStackCommands;
using NRedisStack.Search;
using NRedisStack.Search.Aggregation;
using NRedisStack.Search.Literals.Enums;
using StackExchange.Redis;

var mux = ConnectionMultiplexer.Connect("localhost:6379");
var db = mux.GetDatabase();
var ft = db.FT();
var json = db.JSON();
```

## Storing Documents

Use RedisJSON for storing the data:

```csharp
var books = new[]
{
    new { id = 1, title = "Clean Code", author = "Robert Martin", year = 2008, rating = 4.8 },
    new { id = 2, title = "The Pragmatic Programmer", author = "David Thomas", year = 1999, rating = 4.7 },
    new { id = 3, title = "Design Patterns", author = "Gang of Four", year = 1994, rating = 4.5 }
};

foreach (var book in books)
    await json.SetAsync($"book:{book.id}", "$", book);
```

## Creating an Index

```csharp
ft.Create("books-idx",
    new FTCreateParams()
        .On(IndexDataType.JSON)
        .Prefix("book:"),
    new Schema()
        .AddTextField(new FieldName("$.title", "title"))
        .AddTextField(new FieldName("$.author", "author"))
        .AddNumericField(new FieldName("$.year", "year"))
        .AddNumericField(new FieldName("$.rating", "rating")));
```

## Basic Full-Text Search

```csharp
var results = ft.Search("books-idx", new Query("clean code"));
Console.WriteLine($"Found: {results.TotalResults}");
foreach (var doc in results.Documents)
    Console.WriteLine(doc.Id);
```

## Filtering by Numeric Range

```csharp
// Books from year 2000 onwards
var modern = ft.Search("books-idx",
    new Query("@year:[2000 +inf]"));

// Books with rating >= 4.7
var topRated = ft.Search("books-idx",
    new Query("@rating:[4.7 +inf]"));
```

## Combined Text and Numeric Filters

```csharp
var query = new Query("@author:Robert @year:[2000 +inf]");
var results = ft.Search("books-idx", query);
```

## Sorting Results

```csharp
var sorted = ft.Search("books-idx",
    new Query("*").SetSortBy("rating", ascending: false));

foreach (var doc in sorted.Documents)
    Console.WriteLine(doc.Id);
```

## Pagination

```csharp
var page1 = ft.Search("books-idx",
    new Query("*").Limit(0, 10));

var page2 = ft.Search("books-idx",
    new Query("*").Limit(10, 10));
```

## Aggregation

```csharp
var aggRequest = new AggregationRequest("*")
    .GroupBy("@author", Reducers.Count().As("book_count"))
    .SortBy(new SortedField("@book_count", SortedField.SortOrder.DESC));

var aggResult = ft.Aggregate("books-idx", aggRequest);
for (var i = 0; i < aggResult.TotalResults; i++)
{
    var row = aggResult.GetRow(i);
    Console.WriteLine($"{row["author"]}: {row["book_count"]} books");
}
```

## Dropping an Index

```csharp
ft.DropIndex("books-idx");
```

RediSearch indices are maintained automatically as you add or update JSON documents. Index creation is typically a one-time operation at application startup.

## Summary

NRedisStack makes it straightforward to build full-text search in .NET with RediSearch. By combining JSON document storage with FT indexes, you can support complex queries, filters, and aggregations on Redis data without a separate search engine.
