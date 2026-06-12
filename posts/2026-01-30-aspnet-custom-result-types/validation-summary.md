# Validation Summary: How to Implement Custom Result Types in ASP.NET

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- C#
- ASP.NET Core MVC
- ASP.NET Core Web API
- Minimal APIs
- IActionResult and IResult
- ObjectResult and content negotiation
- ProblemDetails
- Custom output formatters
- HTTP caching headers
- xUnit

## Sources Consulted
- Microsoft Learn: Controller action return types in ASP.NET Core web API - https://learn.microsoft.com/en-us/aspnet/core/web-api/action-return-types
- Microsoft Learn: Custom formatters in ASP.NET Core Web API - https://learn.microsoft.com/en-us/aspnet/core/web-api/advanced/custom-formatters
- Microsoft Learn: Create responses in Minimal API applications - https://learn.microsoft.com/en-us/aspnet/core/fundamentals/minimal-apis/responses
- Microsoft Learn: ProblemDetails class - https://learn.microsoft.com/en-us/dotnet/api/microsoft.aspnetcore.mvc.problemdetails
- Microsoft Learn: ProblemDetails.Extensions property - https://learn.microsoft.com/en-us/dotnet/api/microsoft.aspnetcore.mvc.problemdetails.extensions
- Microsoft Learn: CreatedResult class - https://learn.microsoft.com/en-us/dotnet/api/microsoft.aspnetcore.mvc.createdresult
- RFC 9457: Problem Details for HTTP APIs - https://www.rfc-editor.org/info/rfc9457/
- RFC 9110: HTTP Semantics - https://www.rfc-editor.org/info/rfc9110/

## Issues Found
- The post referred to RFC 7807 as the current Problem Details standard. Updated the section to RFC 9457 and noted that RFC 9457 obsoletes RFC 7807.
- The ProblemDetails comparison table described built-in custom extensions as limited. Updated it to state that ASP.NET Core supports extensions through the `Extensions` dictionary.
- The custom `ApiProblemDetails` type placed extension data inside a nested `extensions` property instead of serializing extension members in the same namespace as the standard ProblemDetails members. Changed it to inherit from ASP.NET Core's `ProblemDetails`, which uses the framework's extension handling, and added missing namespaces for `Activity` and `JsonIgnoreCondition`.
- The problem type URI helper linked to obsolete RFC 7231/RFC 7235 sections. Updated the links to the corresponding RFC 9110 sections.
- The CSV formatter only recognized a few exact generic collection types and then cast the object to `IEnumerable<object>`, which could miss valid enumerable result types. Updated it to detect non-string `System.Collections.IEnumerable` values and enumerate them consistently.
- The `ApiResultFactory.Created` method accepted a `location` argument but ignored it. Updated the example to return `CreatedResult`, which emits a 201 response with a Location header.

## Review Notes
The content negotiation example intentionally demonstrates manual Accept-header handling, but production APIs should usually prefer MVC's built-in formatter-based negotiation through `ObjectResult` or typed results with explicit metadata. The file download example is usable for simple cases, though ASP.NET Core's built-in file result types handle additional edge cases such as range processing and safer header formatting.
