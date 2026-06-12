# Validation Summary: How to Optimize Entity Framework Core Queries

## Status
validated

## Post Type
Tutorial / performance guide

## Technologies Covered
- .NET
- C#
- Entity Framework Core
- LINQ
- SQL Server
- SQL
- ASP.NET Core dependency injection

## Sources Consulted
- Microsoft Learn: Efficient Querying in EF Core - https://learn.microsoft.com/en-us/ef/core/performance/efficient-querying
- Microsoft Learn: Advanced Performance Topics in EF Core - https://learn.microsoft.com/en-us/ef/core/performance/advanced-performance-topics
- Microsoft Learn: Loading Related Data in EF Core - https://learn.microsoft.com/en-us/ef/core/querying/related-data/
- Microsoft Learn: Tracking vs. No-Tracking Queries - https://learn.microsoft.com/en-us/ef/core/querying/tracking
- Microsoft Learn: Pagination in EF Core - https://learn.microsoft.com/en-us/ef/core/querying/pagination
- Microsoft Learn: ExecuteUpdate and ExecuteDelete - https://learn.microsoft.com/en-us/ef/core/saving/execute-insert-update-delete
- Microsoft Learn: SQL Queries in EF Core - https://learn.microsoft.com/en-us/ef/core/querying/sql-queries
- Microsoft Learn: Indexes in EF Core - https://learn.microsoft.com/en-us/ef/core/modeling/indexes
- Microsoft Learn: Interceptors in EF Core - https://learn.microsoft.com/en-us/ef/core/logging-events-diagnostics/interceptors
- Microsoft Learn: Global Query Filters - https://learn.microsoft.com/en-us/ef/core/querying/filters

## Issues Found
- The N+1 query example stated that accessing `order.Customer.Name` always triggers separate database queries. In EF Core, this only happens automatically when lazy loading is enabled; lazy loading is not implicit for every EF Core model. Updated the surrounding text and code comment to make the lazy-loading assumption explicit.
- The keyset pagination explanation said it avoids "counting rows to skip." EF Core's pagination guidance describes the offset problem as the database still needing to process skipped rows. Updated the sentence to describe the database processing skipped rows before returning the next page.

## Review Notes
- The post's examples use current EF Core APIs, including `AsNoTracking`, compiled queries, `ExecuteUpdateAsync`, `ExecuteDeleteAsync`, split queries, `FromSqlInterpolated`, `Database.SqlQuery`, index configuration, command interceptors, and global query filters.
- `ExecuteUpdateAsync` and `ExecuteDeleteAsync` are correctly marked as EF Core 7+ APIs.
- `Database.SqlQuery<T>` for unmapped result types requires modern EF Core support; the example is appropriate for current EF Core versions.
