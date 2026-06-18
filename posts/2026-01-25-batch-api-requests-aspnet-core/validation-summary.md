# Validation Summary: How to Batch API Requests in ASP.NET Core

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- C#
- .NET
- ASP.NET Core Web API
- IHttpClientFactory and HttpClient
- ASP.NET Core routing and endpoint execution
- System.Text.Json
- Multipart/mixed requests
- OData-style batch requests
- SemaphoreSlim-based async coordination

## Sources Consulted
- Microsoft Learn: Make HTTP requests with IHttpClientFactory in ASP.NET Core - https://learn.microsoft.com/en-us/aspnet/core/fundamentals/http-requests
- Microsoft Learn: Use the IHttpClientFactory - https://learn.microsoft.com/en-us/dotnet/core/extensions/httpclient-factory
- Microsoft Learn: Routing in ASP.NET Core - https://learn.microsoft.com/en-us/aspnet/core/fundamentals/routing
- Microsoft Learn: Upload files in ASP.NET Core, including MultipartReader usage - https://learn.microsoft.com/en-us/aspnet/core/mvc/models/file-uploads
- Microsoft Learn: SemaphoreSlim.WaitAsync - https://learn.microsoft.com/en-us/dotnet/api/system.threading.semaphoreslim.waitasync
- Microsoft Learn: SemaphoreSlim.Release - https://learn.microsoft.com/en-us/dotnet/api/system.threading.semaphoreslim.release
- Microsoft Learn: OData Client batch operations - https://learn.microsoft.com/en-us/odata/client/batch-operations
- Microsoft Learn: ASP.NET Core OData 8 fundamentals and batching overview - https://learn.microsoft.com/en-us/odata/webapi-8/fundamentals/overview
- OData.org: Batch Processing format - https://www.odata.org/documentation/odata-version-2-0/batch-processing/

## Issues Found
- The client-side batching sample could deadlock when the batch reached `_maxBatchSize` because `GetAsync` called `FlushBatch` while still holding the same `SemaphoreSlim` that `FlushBatch` waits on. I changed it to set a `flushNow` flag, release the semaphore, and then call `FlushBatch`.
- The `TaskCompletionSource` instances in the auto-batching client could run continuations inline while completing batch responses. I changed them to use `TaskCreationOptions.RunContinuationsAsynchronously`, which is safer for async coordination.
- The in-process endpoint resolver was declared `async` without using `await`, and it used the original request path when query strings were present. I changed it to a synchronous method and pass the normalized subrequest path. I also made the simple route-pattern comparison case-insensitive.
- The dependent batch executor assumed response bodies were always valid JSON and used `ReadFromJsonAsync<JsonElement>()`, which can throw on empty or non-JSON responses. I changed it to read the response as text and parse JSON when possible, matching the earlier sample's behavior.
- Placeholder extraction cast `BatchResponse.Body` directly to `JsonElement`, which could fail for error bodies or non-JSON bodies. I changed it to use an existing `JsonElement` when available or serialize the body to a JSON element first.
- The multipart batch sample constructed `MultipartReader` even when the request content type did not include a boundary. I added a bad-request response for missing boundaries.
- The OData-style multipart response omitted `Content-Transfer-Encoding: binary`, which the OData batch format includes for `application/http` parts. I added that header to each response part.

## Review Notes
The post is technically sound after the fixes. The in-process execution and OData-style sections remain simplified examples, as the post already notes that production routing should use proper matching. A future revision could mention ASP.NET Core OData's built-in batch middleware and handler as the preferred path for full OData batch compatibility.
