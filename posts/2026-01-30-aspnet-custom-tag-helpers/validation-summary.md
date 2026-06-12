# Validation Summary: How to Create Custom Tag Helpers in Razor

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- C#
- ASP.NET Core
- Razor views
- Tag Helpers
- Tag Helper Components
- xUnit

## Sources Consulted
- Microsoft Learn: Tag Helpers in ASP.NET Core - https://learn.microsoft.com/en-us/aspnet/core/mvc/views/tag-helpers/intro
- Microsoft Learn: Author Tag Helpers in ASP.NET Core - https://learn.microsoft.com/en-us/aspnet/core/mvc/views/tag-helpers/authoring
- Microsoft Learn: Tag Helper Components in ASP.NET Core - https://learn.microsoft.com/en-us/aspnet/core/mvc/views/tag-helpers/th-components
- Microsoft Learn API reference: TagHelperContent - https://learn.microsoft.com/en-us/dotnet/api/microsoft.aspnetcore.razor.taghelpers.taghelpercontent
- Microsoft Learn API reference: TagHelper - https://learn.microsoft.com/en-us/dotnet/api/microsoft.aspnetcore.razor.taghelpers.taghelper

## Issues Found
- Several examples used `SetHtmlContent` with interpolated dynamic values such as titles, labels, model values, GitHub API data, analytics IDs, and tab titles. Because `SetHtmlContent(string)` treats the string as already HTML encoded, those dynamic values could render unsafe HTML. Updated the examples to encode dynamic values before inserting them into raw HTML strings.
- The analytics tag helper component used an unencoded tracking ID in both a URL and JavaScript string. Updated the example to encode the ID with `UrlEncoder` for the script URL and `JavaScriptEncoder` for the JavaScript string literal.
- The parent-child tab helper example stored shared child state inside `ProcessAsync`. Updated it to initialize `context.Items` in `Init`, which matches the `TagHelper` lifecycle guidance for data that child tag helpers need.
- The tab helper example used a static counter to generate DOM IDs. Replaced it with `context.UniqueId` to avoid shared mutable static state across requests.
- The unit test example referenced an `AlertType` property and expected an `alert-warning` class, but the earlier `AlertTagHelper` example only sets `alert-box`. Updated the test to instantiate the shown helper and assert the class it actually emits.
- Some snippets needed additional imports after the correctness fixes, including `System.Text.Encodings.Web`, `System`, `Microsoft.Extensions.Configuration`, and `Microsoft.AspNetCore.Razor.TagHelpers` where appropriate. Added those imports and removed an unused `Microsoft.AspNetCore.Mvc.Rendering` import.

## Review Notes
The post is technically sound after the corrections. Some examples still intentionally use `SetHtmlContent` for trusted HTML output, such as markdown conversion and cached HTML content; production applications should sanitize or constrain those sources before rendering raw HTML.
