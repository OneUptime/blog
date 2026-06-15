# Validation Summary: How to Build a Query Builder with Expression Trees in .NET

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- .NET
- C#
- Expression Trees
- LINQ
- Entity Framework Core
- ASP.NET Core Web API

## Sources Consulted
- Microsoft Learn: Expression Trees in C# - https://learn.microsoft.com/en-us/dotnet/csharp/advanced-topics/expression-trees/
- Microsoft Learn: Building Expression Trees - https://learn.microsoft.com/en-us/dotnet/csharp/advanced-topics/expression-trees/expression-trees-building
- Microsoft Learn: Executing Expression Trees - https://learn.microsoft.com/en-us/dotnet/csharp/advanced-topics/expression-trees/expression-trees-execution
- Microsoft Learn: Expression.Constant Method - https://learn.microsoft.com/en-us/dotnet/api/system.linq.expressions.expression.constant
- Microsoft Learn: Expression.Call Method - https://learn.microsoft.com/en-us/dotnet/api/system.linq.expressions.expression.call
- Microsoft Learn: Queryable.Where Method - https://learn.microsoft.com/en-us/dotnet/api/system.linq.queryable.where
- Microsoft Learn: Queryable.OrderBy Method - https://learn.microsoft.com/en-us/dotnet/api/system.linq.queryable.orderby
- Microsoft Learn: Convert.ChangeType Method - https://learn.microsoft.com/en-us/dotnet/api/system.convert.changetype
- Microsoft Learn: EF Core Client vs. Server Evaluation - https://learn.microsoft.com/en-us/ef/core/querying/client-eval
- Microsoft Learn: EF Core Advanced Performance Topics - https://learn.microsoft.com/en-us/ef/core/performance/advanced-performance-topics
- Microsoft Learn: EF.CompileQuery Method - https://learn.microsoft.com/en-us/dotnet/api/microsoft.entityframeworkcore.ef.compilequery

## Issues Found
- The query flow diagram said to compile the expression before executing via EF Core. EF Core translates expression trees passed to `IQueryable` APIs, so the diagram now says to create a lambda expression instead of compiling it.
- The basic expression builder created constants directly with the property type after `Convert.ChangeType`. This is fragile for nullable value types and null comparisons. The code now builds constants using the nullable underlying type when needed, converts back to the nullable property type, and rejects null comparisons against non-nullable value types.
- String methods such as `Contains`, `StartsWith`, and `EndsWith` were callable against any property type and would fail at expression construction time for non-string properties. The code now throws a clear `NotSupportedException` when these operators are used with non-string properties.
- The nested property example used `Convert.ChangeType` directly with the final property type and built null checks for every intermediate segment. The code now handles nullable targets consistently and only builds null checks for reference or nullable value types.
- The caching section recommended caching compiled `Func<T, bool>` delegates for EF Core scenarios. Compiled delegates are not the right input for SQL translation through `IQueryable.Where`. The section now recommends caching built expression trees for dynamic filter shapes and points to EF Core compiled queries for high-volume fixed queries.

## Review Notes
The snippets are still tutorial examples and do not include production hardening such as property allow-lists, validation of user-supplied sort and filter paths, page size limits, culture-specific conversion rules, or database-specific string comparison behavior. The local environment did not have the `dotnet` CLI installed, so code was reviewed against official API documentation rather than compiled locally.
