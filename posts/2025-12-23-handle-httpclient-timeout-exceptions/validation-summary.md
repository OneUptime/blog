# Validation Summary: How to Handle Timeout Exceptions in HttpClient

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- .NET
- C#
- System.Net.Http.HttpClient
- IHttpClientFactory
- CancellationToken and CancellationTokenSource
- System.Net.Http.Json
- Polly
- Microsoft.Extensions.Http.Polly
- Microsoft.Extensions.Http.Resilience

## Sources Consulted
- Microsoft Learn: Make HTTP requests with HttpClient - https://learn.microsoft.com/en-us/dotnet/fundamentals/networking/http/httpclient
- Microsoft Learn: HttpClient.GetAsync Method - https://learn.microsoft.com/en-us/dotnet/api/system.net.http.httpclient.getasync
- Microsoft Learn: HttpClient.Timeout Property - https://learn.microsoft.com/en-us/dotnet/api/system.net.http.httpclient.timeout
- Microsoft Learn: HttpCompletionOption Enum - https://learn.microsoft.com/en-us/dotnet/api/system.net.http.httpcompletionoption
- Microsoft Learn: Build resilient HTTP apps - https://learn.microsoft.com/en-us/dotnet/core/resilience/http-resilience
- NuGet Gallery: Microsoft.Extensions.Http.Polly - https://www.nuget.org/packages/Microsoft.Extensions.Http.Polly/
- Polly documentation: Timeout resilience strategy - https://www.pollydocs.org/strategies/timeout.html

## Issues Found
- The post stated that HttpClient timeouts throw `TaskCanceledException` and implied .NET 5+ may wrap timeouts without `TimeoutException`. Updated the wording and examples to use the documented `OperationCanceledException` behavior, with `TimeoutException` as the inner exception on .NET 5 and later and a fallback note for older .NET Core versions.
- The timeout/cancellation diagram showed cancellation as an inner `OperationCanceledException`. Updated it to distinguish timeout by inner exception and user cancellation by token state.
- Several per-request timeout examples created a timeout `CancellationTokenSource` but did not pass the timeout token to content-reading or operation delegates. Updated those calls so timeout enforcement covers the relevant async work.
- The combined timeout/user-cancellation example could classify a user cancellation as a timeout if both tokens were canceled. Updated the timeout catch filter to ensure the user token was not the cause.
- The first Polly retry example used an undefined `context.GetLogger()` helper. Replaced it with a self-contained `Console.WriteLine` example so the snippet is valid without an omitted custom extension.

## Review Notes
The post still uses Polly v7-style examples, but it correctly warns that `Microsoft.Extensions.Http.Polly` is deprecated and points new projects to `Microsoft.Extensions.Http.Resilience`.
