# Validation Summary: How to Configure CORS in ASP.NET Core

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- C# / .NET (ASP.NET Core)
- ASP.NET Core CORS middleware
- Minimal APIs and MVC Controllers
- CORS (Cross-Origin Resource Sharing) browser security model
- JavaScript Fetch API (credentials)
- curl (for inspecting CORS headers)

## Sources Consulted
- Microsoft Learn — "Enable Cross-Origin Requests (CORS) in ASP.NET Core" (https://learn.microsoft.com/en-us/aspnet/core/security/cors)
- Microsoft Learn — `CorsPolicyBuilder` API reference (`WithOrigins`, `AllowAnyHeader`, `AllowAnyMethod`, `AllowAnyOrigin`, `AllowCredentials`, `WithHeaders`, `WithMethods`, `WithExposedHeaders`, `SetIsOriginAllowed`, `SetPreflightMaxAge`)
- Microsoft Learn — `CorsServiceCollectionExtensions.AddCors`, `AddDefaultPolicy` / `AddPolicy` (`CorsOptions`)
- Microsoft Learn — Middleware ordering / `UseCors`, endpoint `RequireCors`, attributes `[EnableCors]` / `[DisableCors]`
- Microsoft Learn — Minimal APIs route groups (`MapGroup`) and CORS
- MDN Web Docs — Cross-Origin Resource Sharing (CORS), preflight requests, and credentialed requests

## Issues Found
- **Misleading code comment (line 99).** The "Using Named Policies" snippet labeled `app.UseCors("TrustedOrigins");` with the comment `// Apply default policy globally`. Passing a policy name to `UseCors` applies that *named* policy, not the default policy (the default policy is applied by the parameterless `app.UseCors()`). Changed the comment to `// Apply a named policy globally` for accuracy. No code change was required.

## Review Notes
- Middleware ordering guidance is correct: `UseCors` must come before `UseAuthorization` (and after `UseRouting` when explicit routing middleware is used). The Top-Level/minimal-hosting examples implicitly handle routing, so the shown order is valid.
- The credentials guidance is accurate: `AllowCredentials()` is incompatible with `AllowAnyOrigin()`, and the browser must send `credentials: 'include'`. This matches the CORS spec and ASP.NET Core's runtime behavior (the framework throws an `InvalidOperationException` if both are combined).
- `SetPreflightMaxAge(TimeSpan)`, `WithExposedHeaders(...)`, `SetIsOriginAllowed(...)`, `RequireCors(...)`, `[EnableCors]`/`[DisableCors]`, and `Configuration.GetSection(...).Get<string[]>()` are all current, non-deprecated APIs.
- The `SetIsOriginAllowed` subdomain example using `uri.Host.EndsWith(".example.com")` is functionally correct but, as a general security note, suffix checks on host strings deserve care to avoid look-alike domains; the example itself is safe because it operates on the parsed `Uri.Host`.
- The curl example correctly demonstrates a preflight request with `Origin` and `Access-Control-Request-Method` headers and the expected response headers.
- Both Mermaid diagrams accurately depict the preflight/simple-request flows.
