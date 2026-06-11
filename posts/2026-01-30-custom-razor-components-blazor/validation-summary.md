# Validation Summary: How to Create Custom Razor Components in Blazor

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Blazor
- Razor components
- C#
- .NET / ASP.NET Core
- Razor class libraries
- SignalR client connections
- bUnit component testing
- FluentAssertions

## Sources Consulted
- Microsoft Learn: ASP.NET Core Razor components - https://learn.microsoft.com/en-us/aspnet/core/blazor/components/
- Microsoft Learn: ASP.NET Core Blazor cascading values and parameters - https://learn.microsoft.com/en-us/aspnet/core/blazor/components/cascading-values-and-parameters
- Microsoft Learn: ASP.NET Core Blazor templated components - https://learn.microsoft.com/en-us/aspnet/core/blazor/components/templated-components
- Microsoft Learn: ASP.NET Core Razor component virtualization - https://learn.microsoft.com/en-us/aspnet/core/blazor/components/virtualization
- Microsoft Learn: ASP.NET Core Blazor rendering performance best practices - https://learn.microsoft.com/en-us/aspnet/core/blazor/performance/rendering
- Microsoft Learn: Consume ASP.NET Core Razor components from a Razor class library - https://learn.microsoft.com/en-us/aspnet/core/blazor/components/class-libraries
- Microsoft Learn: Reusable Razor UI in class libraries with ASP.NET Core - https://learn.microsoft.com/en-us/aspnet/core/razor-pages/ui-class
- Microsoft Learn: ASP.NET Core Razor component disposal - https://learn.microsoft.com/en-us/aspnet/core/blazor/components/component-disposal
- Microsoft Learn: dotnet new command - https://learn.microsoft.com/en-us/dotnet/core/tools/dotnet-new
- bUnit documentation: Writing tests for Blazor components - https://bunit.dev/docs/getting-started/writing-tests.html
- bUnit documentation: Passing parameters to components - https://bunit.dev/docs/providing-input/passing-parameters-to-components.html

## Issues Found
- The `App.razor` cascading value example called `LocalStorage.GetItem<ThemeInfo>("theme")` without injecting or defining a local storage service, and the call was synchronous. Removed the undefined storage call so the example compiles as a minimal cascading value provider.
- The `ThemeInfo` type was defined in `MyApp.Services`, but several component snippets referenced it without importing that namespace. Added `@using MyApp.Services` where needed.
- `GridColumn.cs` used `RenderFragment<TItem>` without importing `Microsoft.AspNetCore.Components`. Added the missing using directive.
- `NotificationContainer.razor` subscribed `StateHasChanged` directly to a service event that can be raised by a `Task.Delay(...).ContinueWith(...)` callback. Changed the component to dispatch renders through `InvokeAsync(StateHasChanged)`, matching Blazor's renderer synchronization requirements.
- The `ShouldRender` example used `Data.GetHashCode()` for an array parameter, which only reflects the array object's identity and doesn't detect content changes. Replaced it with a small content hash helper so the example matches the stated behavior.
- The bUnit test snippets used FluentAssertions' `Should()` extension methods without importing the namespace. Added `using FluentAssertions;` to both test files.

## Review Notes
The examples are conceptually aligned with current Blazor guidance for parameters, `RenderFragment`, `EventCallback`, cascading values, virtualization, Razor class libraries, component disposal, and bUnit tests. Local compilation could not be performed because `dotnet` is not installed in the review environment, so validation was performed by static review against official documentation.
