# Validation Summary: How to Handle 'Task was canceled' Exceptions in C#

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- C# (async/await)
- .NET Task Parallel Library (`Task`, `Task.WhenAll`, `Task.WhenAny`, `Task.Delay`)
- `CancellationToken`, `CancellationTokenSource`, `CreateLinkedTokenSource`, `CancelAfter`
- `TaskCanceledException` / `OperationCanceledException`
- ASP.NET Core (controllers, `HttpContext.RequestAborted`, `BackgroundService`)
- `HttpClient`

## Sources Consulted
- CancellationToken Struct — https://learn.microsoft.com/en-us/dotnet/api/system.threading.cancellationtoken
- CancellationTokenSource Class (incl. `CancelAfter`, `CreateLinkedTokenSource`) — https://learn.microsoft.com/en-us/dotnet/api/system.threading.cancellationtokensource
- TaskCanceledException Class (derives from OperationCanceledException) — https://learn.microsoft.com/en-us/dotnet/api/system.threading.tasks.taskcanceledexception
- OperationCanceledException Class — https://learn.microsoft.com/en-us/dotnet/api/system.operationcanceledexception
- Cancellation in Managed Threads — https://learn.microsoft.com/en-us/dotnet/standard/threading/cancellation-in-managed-threads
- BackgroundService Class — https://learn.microsoft.com/en-us/dotnet/api/microsoft.extensions.hosting.backgroundservice
- HttpClient.GetStringAsync (CancellationToken overload, .NET 6+) — https://learn.microsoft.com/en-us/dotnet/api/system.net.http.httpclient.getstringasync
- ControllerBase.StatusCode — https://learn.microsoft.com/en-us/dotnet/api/microsoft.aspnetcore.mvc.controllerbase.statuscode

## Issues Found
No technical issues found.

All code examples are syntactically valid and use current, non-deprecated APIs:
- The exception hierarchy is correct (`TaskCanceledException` derives from `OperationCanceledException`), and the "Exception Handling Summary" example orders the catch blocks correctly (most-derived first).
- `CancellationTokenSource.CreateLinkedTokenSource`, `CancelAfter`, and the timeout-vs-cancellation disambiguation using `IsCancellationRequested` / `ex.CancellationToken` are all used correctly.
- The `HttpClient.GetStringAsync(url, token)` overload used exists in .NET 6+, consistent with modern .NET.
- The `BackgroundService.ExecuteAsync(stoppingToken)` graceful-shutdown pattern matches the documented guidance.
- HTTP 499 is correctly identified as a non-standard ("Client Closed Request") code used illustratively, and the `StatusCode(int)` / `StatusCode(int, object)` overloads are valid.

## Review Notes
- The `WithTimeout<T>` example using `Task.WhenAny(task, Task.Delay(Timeout.Infinite, cts.Token))` works as written, but when the real task wins, the `Task.Delay` is not explicitly canceled before the method returns — disposing the `CancellationTokenSource` does not cancel its token. A future improvement would be to call `cts.Cancel()` after the winning task to promptly release the delay timer. This is a minor efficiency nuance, not a correctness error, and the pattern is commonly shown this way in tutorials.
- In the parallel `Task.WhenAll` example, the `OperationCanceledException` catch block reports faulted-task counts; note that if a task faults (rather than cancels), `Task.WhenAll` may surface that fault exception instead of `OperationCanceledException`. The example is still correct for its illustrative purpose (inspecting individual task states after cancellation).
- Example 2's filter `when (ex.CancellationToken == cts.Token)` is a reasonable way to attribute the cancellation to the timeout token; behavior is consistent with modern .NET where the thrown exception carries the triggering token.
