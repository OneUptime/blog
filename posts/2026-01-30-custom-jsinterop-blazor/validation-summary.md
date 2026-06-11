# Validation Summary: How to Implement Custom JSInterop in Blazor

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Blazor WebAssembly
- Blazor Server
- ASP.NET Core Razor components
- JavaScript interop with `IJSRuntime`
- JavaScript ES modules
- `DotNetObjectReference` and `[JSInvokable]`
- Browser Clipboard API
- Web Notifications API
- Browser storage APIs
- Chart.js

## Sources Consulted
- Microsoft Learn: ASP.NET Core Blazor JavaScript interoperability (JS interop): https://learn.microsoft.com/en-us/aspnet/core/blazor/javascript-interoperability/?view=aspnetcore-10.0
- Microsoft Learn: Call JavaScript functions from .NET methods in ASP.NET Core Blazor: https://learn.microsoft.com/en-us/aspnet/core/blazor/javascript-interoperability/call-javascript-from-dotnet?view=aspnetcore-10.0
- Microsoft Learn: Call .NET methods from JavaScript functions in ASP.NET Core Blazor: https://learn.microsoft.com/en-us/aspnet/core/blazor/javascript-interoperability/call-dotnet-from-javascript?view=aspnetcore-10.0
- Microsoft Learn: ASP.NET Core Blazor JS interop performance best practices: https://learn.microsoft.com/en-us/aspnet/core/blazor/performance/javascript-interoperability?view=aspnetcore-10.0
- Microsoft Learn: ASP.NET Core Blazor dependency injection: https://learn.microsoft.com/en-us/aspnet/core/blazor/fundamentals/dependency-injection?view=aspnetcore-10.0
- MDN Web Docs: Clipboard API and `writeText()`: https://developer.mozilla.org/en-US/docs/Web/API/Clipboard and https://developer.mozilla.org/en-US/docs/Web/API/Clipboard/writeText
- MDN Web Docs: Notification `requestPermission()`: https://developer.mozilla.org/en-US/docs/Web/API/Notification/requestPermission_static
- Chart.js documentation: Updating charts and API reference: https://www.chartjs.org/docs/latest/developers/updates.html and https://www.chartjs.org/docs/latest/developers/api.html

## Issues Found
- The scoped-service registration comment said scoped services have one instance per user session in Blazor. This is only a good shorthand for Blazor Server circuits and is inaccurate for Blazor WebAssembly, where scoped services behave like singletons. Updated the comment to distinguish Server and WebAssembly behavior.
- The scroll-tracker JavaScript module added an anonymous `scroll` listener but did not remove it during disposal, so the cleanup example did not fully clean up its JavaScript resource. Changed the listener to a stored handler and removed it in `dispose()`.
- The `ResourceManagedComponent.razor` example used `JS.InvokeAsync` without injecting `IJSRuntime`. Added `@inject IJSRuntime JS` so the Razor component compiles as shown.

## Review Notes
The remaining examples use current Blazor JS interop APIs and align with the official module import, `IJSObjectReference`, `DotNetObjectReference`, and disposal patterns. The post still uses `eval` in small demonstration snippets; those snippets work, and the article immediately recommends dedicated JavaScript functions instead, but replacing `eval` with module/global helper functions would be a reasonable future hardening improvement.
