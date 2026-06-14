# Validation Summary: How to Build Custom Formatters in ASP.NET Core

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- ASP.NET Core MVC
- C#
- Custom input and output formatters
- Content negotiation
- CSV
- YAML and YamlDotNet
- Protocol Buffers and Google.Protobuf

## Sources Consulted
- Microsoft Learn: Custom formatters in ASP.NET Core Web API: https://learn.microsoft.com/en-us/aspnet/core/web-api/advanced/custom-formatters
- Microsoft Learn: Format response data in ASP.NET Core Web API: https://learn.microsoft.com/en-us/aspnet/core/web-api/advanced/formatting
- Microsoft Learn: TextInputFormatter API reference: https://learn.microsoft.com/en-us/dotnet/api/microsoft.aspnetcore.mvc.formatters.textinputformatter
- Microsoft Learn: InputFormatter API reference: https://learn.microsoft.com/en-us/dotnet/api/microsoft.aspnetcore.mvc.formatters.inputformatter
- Microsoft Learn: TextOutputFormatter API reference: https://learn.microsoft.com/en-us/dotnet/api/microsoft.aspnetcore.mvc.formatters.textoutputformatter
- Microsoft Learn: OutputFormatter API reference: https://learn.microsoft.com/en-us/dotnet/api/microsoft.aspnetcore.mvc.formatters.outputformatter
- Protocol Buffers C# API reference: MessageParser: https://protobuf.dev/reference/csharp/api-docs/class/google/protobuf/message-parser.html
- Protocol Buffers C# tutorial: https://protobuf.dev/getting-started/csharptutorial/
- YamlDotNet project documentation: https://github.com/aaubry/YamlDotNet

## Issues Found
- The CSV input formatter snippet used non-generic `IList` without importing `System.Collections`. Added the missing namespace so the snippet is self-contained.
- The CSV output formatter treated `string` as an `IEnumerable`, which could make the formatter claim string responses and then write an empty response. Updated `CanWriteType` to reject strings before checking collection types, and to only accept enumerable types with a detectable element type.
- The URL-extension example used `export.{format}` and `FormatterMappings`, but did not enable ASP.NET Core's format filter. Added `[FormatFilter]` to the controller so route values such as `.csv` are mapped to the configured formatter as described by Microsoft documentation.
- The Protocol Buffers formatter snippet used `BindingFlags` without importing `System.Reflection`. Added the missing namespace.

## Review Notes
- The CSV parser is intentionally simple and suitable for a tutorial, but production CSV support should use a mature CSV library for edge cases such as embedded newlines, culture-aware conversions, and detailed parse diagnostics.
- Local compilation was not performed because the `dotnet` SDK is not installed in this workspace.
