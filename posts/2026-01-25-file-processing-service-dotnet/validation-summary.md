# Validation Summary: How to Build a File Processing Service in .NET

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- .NET
- C#
- ASP.NET Core Web API
- ASP.NET Core hosted services and BackgroundService
- Azure Blob Storage client library for .NET
- System.Threading.Channels
- System.Text.Json
- System.Xml
- .NET CLI

## Sources Consulted
- Microsoft Learn: Upload files in ASP.NET Core - https://learn.microsoft.com/en-us/aspnet/core/mvc/models/file-uploads
- Microsoft Learn: Request size limit metadata and MVC request size limit attributes - https://learn.microsoft.com/en-us/dotnet/api/microsoft.aspnetcore.http.metadata.irequestsizelimitmetadata
- Microsoft Learn: DisableRequestSizeLimitAttribute - https://learn.microsoft.com/en-us/dotnet/api/microsoft.aspnetcore.mvc.disablerequestsizelimitattribute
- Microsoft Learn: dotnet package add command - https://learn.microsoft.com/en-us/dotnet/core/tools/dotnet-package-add
- Microsoft Learn: dotnet new command - https://learn.microsoft.com/en-us/dotnet/core/tools/dotnet-new
- Microsoft Learn: Upload a blob with .NET - https://learn.microsoft.com/en-us/azure/storage/blobs/storage-blob-upload
- Microsoft Learn: Performance tuning for uploads and downloads with .NET - https://learn.microsoft.com/en-us/azure/storage/blobs/storage-blobs-tune-upload-download
- Microsoft Learn: BlobClient.UploadAsync - https://learn.microsoft.com/en-us/dotnet/api/azure.storage.blobs.blobclient.uploadasync
- Microsoft Learn: JsonDocument.ParseAsync - https://learn.microsoft.com/en-us/dotnet/api/system.text.json.jsondocument.parseasync
- Microsoft Learn: JsonSerializer.DeserializeAsyncEnumerable - https://learn.microsoft.com/en-us/dotnet/api/system.text.json.jsonserializer.deserializeasyncenumerable
- Microsoft Learn: Channels in .NET - https://learn.microsoft.com/en-us/dotnet/core/extensions/channels
- Microsoft Learn: Background tasks with hosted services in ASP.NET Core - https://learn.microsoft.com/en-us/aspnet/core/fundamentals/host/hosted-services
- Microsoft Learn: XmlReaderSettings.Async - https://learn.microsoft.com/en-us/dotnet/api/system.xml.xmlreadersettings.async

## Issues Found
- The setup commands used the older verb-first `dotnet add package` form. Updated them to the current .NET 10 noun-first `dotnet package add` form documented by Microsoft.
- The upload endpoint declared `[RequestSizeLimit(500_000_000)]` and `[DisableRequestSizeLimit]` together. Because the disable attribute removes the request body size limit, it contradicted the stated 500 MB limit. Removed `[DisableRequestSizeLimit]`.
- The Azure Blob Storage sample assumed the container already existed. Added `CreateIfNotExistsAsync()` before upload so the sample can work in a fresh container configuration.
- The Blob upload comment said the sample tracked progress, but no progress handler was configured. Updated the comment to describe transfer options instead.
- The worker section said horizontal scaling was possible without qualifying the queue requirement. Clarified that multiple instances scale horizontally when backed by a shared persistent queue.
- The JSON processing sample described streaming but used `JsonDocument.ParseAsync`, which reads the stream to completion and builds a DOM. Replaced it with `JsonSerializer.DeserializeAsyncEnumerable<JsonElement>` for streaming root-level JSON arrays.
- Added missing namespace imports for `System.Text.Json`, `System.Xml`, and `System.Collections.Concurrent` in snippets where those APIs are used.

## Review Notes
The CSV example still uses `line.Split(',')`, which is acceptable as a simplified placeholder but is not a production CSV parser for quoted fields, escaped quotes, or embedded commas. A production implementation should use a dedicated CSV parser and add upload validation, malware scanning, and persistent queue semantics.
