# Validation Summary: How to Implement Custom Retry Policies with Polly

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- .NET
- C#
- Polly retry policies
- Polly.Contrib.WaitAndRetry
- IHttpClientFactory and Microsoft.Extensions.Http.Polly
- HttpClient and HTTP retry semantics
- SQL Server and Microsoft.Data.SqlClient
- Entity Framework Core
- System.Diagnostics.Metrics / OpenTelemetry-compatible metrics
- xUnit

## Sources Consulted
- Polly retry strategy documentation: https://www.pollydocs.org/strategies/retry.html
- Polly timeout strategy documentation: https://www.pollydocs.org/strategies/timeout.html
- Polly v7 to v8 migration guide: https://www.pollydocs.org/migration-v8.html
- Polly.Contrib.WaitAndRetry documentation: https://github.com/Polly-Contrib/Polly.Contrib.WaitAndRetry
- NuGet package metadata for Microsoft.Extensions.Http.Polly: https://www.nuget.org/packages/Microsoft.Extensions.Http.Polly/
- Microsoft Learn: Build resilient HTTP apps with Microsoft.Extensions.Http.Resilience: https://learn.microsoft.com/en-us/dotnet/core/resilience/http-resilience
- Microsoft Learn: Implement HTTP call retries with exponential backoff with Polly: https://learn.microsoft.com/en-us/dotnet/architecture/microservices/implement-resilient-applications/implement-http-call-retries-exponential-backoff-polly
- Microsoft Learn: dotnet package add command: https://learn.microsoft.com/en-us/dotnet/core/tools/dotnet-package-add
- Microsoft Learn: SqlException.Number property: https://learn.microsoft.com/en-us/dotnet/api/microsoft.data.sqlclient.sqlexception.number
- Microsoft Learn: Azure SQL transient connectivity issues: https://learn.microsoft.com/en-us/azure/azure-sql/database/troubleshoot-common-connectivity-issues
- Microsoft Learn: Creating metrics with System.Diagnostics.Metrics: https://learn.microsoft.com/en-us/dotnet/core/diagnostics/metrics-instrumentation

## Issues Found
- The setup omitted `Polly.Contrib.WaitAndRetry` even though the corrected jitter example should use that helper package. Added the package installation command.
- The setup recommended `Microsoft.Extensions.Http.Polly` without noting that the package is deprecated for new applications. Added a caveat that it is used for the `AddPolicyHandler` examples and that new `HttpClient` resilience code should prefer `Microsoft.Extensions.Http.Resilience`.
- The jitter section claimed to use Polly's built-in decorrelated jitter calculation but implemented a custom calculator. Replaced that example with `Backoff.DecorrelatedJitterBackoffV2` from Polly.Contrib.WaitAndRetry and corrected the preceding wording.
- The simple jitter example and retry policy factory used `new Random()` / a shared `Random` instance in retry callbacks. Replaced those with `Random.Shared` to avoid concurrency problems in shared retry policies.
- The conditional retry section said it inspected the response body, but the example only checks status codes and headers. Changed the wording to "response metadata."
- The factory honored `Retry-After` delta values but ignored date-based `Retry-After` values. Added date handling consistent with the earlier HTTP retry example.
- The Entity Framework `DbUpdateException` predicate checked only `SqlException.Number`, which is the first SQL error. Updated it to inspect all `SqlError` entries, matching the other SQL retry examples.
- The metrics integration wrapped the retry policy in a no-op policy and called `AsAsyncPolicy()`, which was unnecessary and not appropriate for the declared `AsyncRetryPolicy` return type. Simplified it to return the retry policy directly.

## Review Notes
The post uses the classic Polly v7-style policy API (`Policy.Handle`, `WaitAndRetryAsync`, `Policy.WrapAsync`). That API remains common in existing applications, but Polly v8 and `Microsoft.Extensions.Http.Resilience` are the preferred direction for new .NET HTTP resilience work. The local environment does not have the `dotnet` CLI installed, so I could not compile the snippets; verification was performed against official documentation and package metadata.
