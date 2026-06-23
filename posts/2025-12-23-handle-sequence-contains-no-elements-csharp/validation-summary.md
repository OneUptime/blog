# Validation Summary: How to Handle 'Sequence contains no elements' Errors in C#

## Status
validated

## Post Type
Guide / Tutorial (problem-and-solution reference for a common C# exception)

## Technologies Covered
- C# (language versions 9–11 features referenced)
- .NET / LINQ (`System.Linq`)
- Entity Framework Core (`SingleAsync`, `SingleOrDefaultAsync`, `FindAsync`, `FirstOrDefaultAsync`)
- C# pattern matching (list patterns, property patterns)

## Sources Consulted
- LINQ `Enumerable.First`/`FirstOrDefault` — https://learn.microsoft.com/en-us/dotnet/api/system.linq.enumerable.first
- LINQ `Enumerable.Single`/`SingleOrDefault` — https://learn.microsoft.com/en-us/dotnet/api/system.linq.enumerable.single
- LINQ `Enumerable.Max`/`Min` (nullable-selector behavior) — https://learn.microsoft.com/en-us/dotnet/api/system.linq.enumerable.max
- LINQ `Enumerable.MaxBy`/`MinBy` (.NET 6+) — https://learn.microsoft.com/en-us/dotnet/api/system.linq.enumerable.maxby
- LINQ `Enumerable.Average` (nullable overloads) — https://learn.microsoft.com/en-us/dotnet/api/system.linq.enumerable.average
- LINQ `Enumerable.DefaultIfEmpty` — https://learn.microsoft.com/en-us/dotnet/api/system.linq.enumerable.defaultifempty
- EF Core `DbSet.FindAsync` / async LINQ operators — https://learn.microsoft.com/en-us/dotnet/api/microsoft.entityframeworkcore.dbset-1.findasync
- C# list patterns (C# 11) — https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/operators/patterns#list-patterns

## Issues Found
No technical issues found.

All code examples are syntactically correct and behave as described:
- `First()`/`Last()`/`Single()`/`Max()`/`Min()`/`Average()` correctly throw `InvalidOperationException` on an empty `List<int>` (non-nullable value sequence).
- `*OrDefault()` variants return the type default; `SingleOrDefault()` correctly still throws when more than one element matches.
- `prices.DefaultIfEmpty(0).Max()` returns 0 for an empty sequence — correct.
- `orders.Max(o => (decimal?)o.Price)` returns `null` for an empty sequence — correct (nullable-selector `Max` short-circuits empties).
- `scores.Cast<int?>().Average()` returns a nullable `double?` of `null` on empty — correct.
- `MaxBy` on an empty reference-type list returns `null` (.NET 6+) — correct.
- List patterns `[]`, `[var single]`, `[.., var last]` are valid C# 11 syntax.
- EF Core `SingleOrDefaultAsync`, `FindAsync`, and the `FirstOrThrowAsync` extension over `IQueryable<T>` are accurate.
- The `Best Practices` table mappings (including `ElementAt()`/`ElementAtOrDefault()`) are correct.

## Review Notes
- The inline comment `// SOLUTION 3: FirstOrDefault with custom default (C# 9+)` is slightly imprecise: the example uses the null-coalescing operator (`?? new Order { ... }`), which predates C# 9. The code is correct as written on any modern version; the version annotation is just loosely worded. .NET 6 also added a first-class `FirstOrDefault(defaultValue)` overload that would be a more literal "custom default" — worth mentioning in a future revision, but not an error.
- The comment `// SOLUTION 5: MaxBy with check (C# 10+)` conflates the language version with the API version. `MaxBy`/`MinBy` are .NET 6 BCL methods (which shipped alongside C# 10), so the annotation is effectively accurate; no change required.
- The extension methods (`FirstOrNull`, `SafeMax`, `SafeSingle`, `FirstOrThrowAsync`) require the usual `using` directives (`System.Linq`, `System.Linq.Expressions`, `Microsoft.EntityFrameworkCore`); these are omitted for brevity, which is conventional for snippet-style posts.
- Overall the post is accurate and follows current best practices for handling empty-sequence LINQ exceptions.
