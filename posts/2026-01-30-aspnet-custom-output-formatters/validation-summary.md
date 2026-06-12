# Validation Summary: How to Create Custom Output Formatters in ASP.NET

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- C#
- ASP.NET Core MVC/Web API
- ASP.NET Core output formatters and content negotiation
- ASP.NET Core FormatFilter and formatter mappings
- IAsyncEnumerable
- ClosedXML
- QuestPDF
- XmlWriter
- Response compression middleware
- .NET CLI / NuGet package installation

## Sources Consulted
- Microsoft Learn: Custom formatters in ASP.NET Core Web API, https://learn.microsoft.com/en-us/aspnet/core/web-api/advanced/custom-formatters
- Microsoft Learn: Format response data in ASP.NET Core Web API, https://learn.microsoft.com/en-us/aspnet/core/web-api/advanced/formatting
- Microsoft Learn: FormatFilterAttribute, https://learn.microsoft.com/en-us/dotnet/api/microsoft.aspnetcore.mvc.formatfilterattribute
- Microsoft Learn: IAsyncEnumerable<T>.GetAsyncEnumerator, https://learn.microsoft.com/en-us/dotnet/api/system.collections.generic.iasyncenumerable-1.getasyncenumerator
- Microsoft Learn: XmlWriter async methods and XmlWriterSettings.Async, https://learn.microsoft.com/en-us/dotnet/api/system.xml.xmlwriter and https://learn.microsoft.com/en-us/dotnet/api/system.xml.xmlwritersettings.async
- Microsoft Learn: dotnet package add command, https://learn.microsoft.com/en-us/dotnet/core/tools/dotnet-package-add
- Microsoft Learn: Response compression in ASP.NET Core, https://learn.microsoft.com/en-us/aspnet/core/performance/response-compression
- ClosedXML documentation: workbook SaveAs and cell styles, https://docs.closedxml.io/en/latest/api/workbook.html and https://docs.closedxml.io/en/latest/features/cell-format.html
- QuestPDF documentation: ASP.NET integration and license configuration, https://www.questpdf.com/examples/aspnet-integration.html and https://www.questpdf.com/license/configuration.html

## Issues Found
- The article described RSS readers as expecting Atom feeds and titled the formatter "RSS/Atom" even though the implementation generates RSS 2.0. Changed the wording and heading to refer to RSS/syndication feeds accurately.
- The Excel media type example used `application/vnd.ms-excel`, which is the legacy Excel MIME type, while the formatter generates `.xlsx` files. Updated the diagram and formatter to use the OpenXML XLSX media type.
- The package installation commands used the older `dotnet add package` form. Updated them to the current .NET 10 `dotnet package add` form and added a note for .NET 9 SDK or earlier.
- The RSS formatter advertised `application/xml`, which could cause generic XML requests for collections to receive RSS 2.0. Removed that supported media type so RSS is selected via `application/rss+xml`.
- RSS item dates were formatted without normalizing to UTC. Updated published date handling to use UTC before RFC 1123 formatting.
- URL extension examples such as `/api/orders/export.csv` require `FormatFilter` with formatter mappings. Added `[FormatFilter]` to the controller example.
- The `IAsyncEnumerable` formatter update only changed `WriteResponseBodyAsync`; `CanWriteType` still would not select the formatter for async enumerables. Added updated type detection.
- The original `IAsyncEnumerable` runtime type check only matched concrete `IAsyncEnumerable<>` types and could miss compiler-generated iterator types that implement the interface. Replaced it with interface-based detection.
- The async enumerable example ignored request cancellation and did not dispose the async enumerator. Updated the sample to pass `RequestAborted` and dispose `IAsyncDisposable` enumerators.
- The custom negotiation section referenced `IContentTypeProvider`, which is not the MVC output formatter selection mechanism. Reworded it to recommend `FormatFilter` with formatter mappings or action filters.
- The response compression example configured services but did not show the required middleware call. Added `app.UseResponseCompression()`.
- The performance section said never to load entire datasets into memory, but XLSX and PDF generation commonly require buffering or pagination. Narrowed the advice to streamable formats and added a caveat.

## Review Notes
The snippets are illustrative and were reviewed statically because the local environment does not have the .NET SDK installed. The Excel and PDF examples still buffer generated files into memory, which is acceptable for a formatter tutorial but should be revisited for very large exports with pagination, background jobs, or pre-generated files.
