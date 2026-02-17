# How to Upload and Download Blobs Using Azure.Storage.Blobs SDK in C#

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure, Blob Storage, C#, .NET, Cloud Storage, File Upload, Azure.Storage.Blobs

Description: A practical guide to uploading and downloading files with Azure Blob Storage using the Azure.Storage.Blobs SDK in C# .NET applications.

---

Azure Blob Storage is the backbone of file storage on Azure. Whether your application handles user uploads, generates reports, stores backups, or serves static content, Blob Storage is where those files live. The Azure.Storage.Blobs SDK for .NET provides a clean, strongly-typed API for all blob operations. In this post, I will cover the essential operations with real C# code.

## Setting Up

Add the NuGet packages to your project.

```bash
dotnet add package Azure.Storage.Blobs
dotnet add package Azure.Identity
```

## Connecting to Blob Storage

There are two ways to connect: connection string or DefaultAzureCredential. For production, always prefer credential-based authentication.

```csharp
using Azure.Identity;
using Azure.Storage.Blobs;
using Azure.Storage.Blobs.Models;

// Option 1: DefaultAzureCredential (recommended)
var blobService = new BlobServiceClient(
    new Uri("https://mystorageacct.blob.core.windows.net"),
    new DefaultAzureCredential()
);

// Option 2: Connection string (for quick testing)
// var blobService = new BlobServiceClient("DefaultEndpointsProtocol=https;...");
```

## Creating Containers

```csharp
// Create a container (or get a reference if it exists)
BlobContainerClient container = blobService.GetBlobContainerClient("documents");
await container.CreateIfNotExistsAsync(PublicAccessType.None);

Console.WriteLine($"Container '{container.Name}' is ready");
```

The `PublicAccessType.None` means the container is private. Other options are `Blob` (anonymous read for blobs) and `BlobContainer` (anonymous read for the entire container).

## Uploading Files

The simplest upload reads from a file path.

```csharp
// Upload a file from disk
BlobClient blob = container.GetBlobClient("reports/quarterly-report.pdf");

await blob.UploadAsync(
    "/path/to/quarterly-report.pdf",
    overwrite: true  // Replace if blob already exists
);

Console.WriteLine($"Uploaded: {blob.Uri}");
```

## Uploading Strings and Streams

You can upload from any stream or directly from a string.

```csharp
using System.Text;
using System.Text.Json;

// Upload JSON data from memory
var data = new { Users = 1500, Active = 1200, Date = "2026-02-16" };
string json = JsonSerializer.Serialize(data);

BlobClient jsonBlob = container.GetBlobClient("metrics/daily-stats.json");
using var stream = new MemoryStream(Encoding.UTF8.GetBytes(json));
await jsonBlob.UploadAsync(stream, overwrite: true);

// Upload with specific content type and metadata
BlobClient htmlBlob = container.GetBlobClient("pages/index.html");
var htmlContent = "<html><body><h1>Hello</h1></body></html>";

await htmlBlob.UploadAsync(
    new BinaryData(htmlContent),
    new BlobUploadOptions
    {
        HttpHeaders = new BlobHttpHeaders
        {
            ContentType = "text/html",
            CacheControl = "max-age=3600"
        },
        Metadata = new Dictionary<string, string>
        {
            { "author", "engineering-team" },
            { "version", "1.0" }
        }
    }
);
```

## Downloading Files

Download to a file, a stream, or directly to memory.

```csharp
// Download to a local file
BlobClient blob = container.GetBlobClient("reports/quarterly-report.pdf");
await blob.DownloadToAsync("/tmp/downloaded-report.pdf");

// Download to memory
BlobDownloadResult result = await blob.DownloadContentAsync();
string content = result.Content.ToString();
Console.WriteLine($"Content: {content}");

// Download to a stream (good for large files)
using var fileStream = File.OpenWrite("/tmp/large-file.dat");
await blob.DownloadToAsync(fileStream);
```

## Streaming Large Files

For very large files, you want to stream rather than load everything into memory.

```csharp
// Stream a large blob without loading it all into memory
BlobClient largeBlob = container.GetBlobClient("backups/database-dump.sql");
BlobDownloadStreamingResult streamResult = await largeBlob.DownloadStreamingAsync();

using var outputFile = File.OpenWrite("/tmp/database-dump.sql");

// Copy in chunks
await streamResult.Content.CopyToAsync(outputFile);
Console.WriteLine("Large file downloaded via streaming");
```

For uploads, the SDK automatically chunks large files. You can control the behavior.

```csharp
// Upload a large file with custom transfer options
var transferOptions = new StorageTransferOptions
{
    MaximumConcurrency = 4,         // Parallel upload threads
    MaximumTransferSize = 8 * 1024 * 1024,  // 8 MB per block
    InitialTransferSize = 8 * 1024 * 1024   // First block size
};

BlobClient largeUpload = container.GetBlobClient("backups/large-backup.tar.gz");
await largeUpload.UploadAsync(
    "/path/to/large-backup.tar.gz",
    new BlobUploadOptions { TransferOptions = transferOptions }
);
```

## Listing Blobs

```csharp
// List all blobs in a container
await foreach (BlobItem blob in container.GetBlobsAsync())
{
    Console.WriteLine($"  {blob.Name} - {blob.Properties.ContentLength} bytes");
    Console.WriteLine($"    Last modified: {blob.Properties.LastModified}");
    Console.WriteLine($"    Content type: {blob.Properties.ContentType}");
}

// List blobs with a prefix (virtual directory)
await foreach (BlobItem blob in container.GetBlobsAsync(prefix: "reports/2026/"))
{
    Console.WriteLine($"  {blob.Name}");
}

// List by hierarchy (like directories)
await foreach (BlobHierarchyItem item in container.GetBlobsByHierarchyAsync(delimiter: "/", prefix: "reports/"))
{
    if (item.IsPrefix)
    {
        Console.WriteLine($"  [Directory] {item.Prefix}");
    }
    else
    {
        Console.WriteLine($"  [File] {item.Blob.Name}");
    }
}
```

## Copying and Moving Blobs

```csharp
// Copy a blob within the same account
BlobClient source = container.GetBlobClient("reports/q1-2026.pdf");
BlobClient destination = blobService
    .GetBlobContainerClient("archive")
    .GetBlobClient("2026/q1-report.pdf");

// Start the copy operation
await destination.StartCopyFromUriAsync(source.Uri);
Console.WriteLine("Copy started");

// Move = copy + delete
await destination.StartCopyFromUriAsync(source.Uri);
await source.DeleteIfExistsAsync();
Console.WriteLine("Blob moved");
```

## Deleting Blobs

```csharp
// Delete a single blob
BlobClient blob = container.GetBlobClient("old-file.txt");
await blob.DeleteIfExistsAsync();

// Delete with snapshots
await blob.DeleteIfExistsAsync(DeleteSnapshotsOption.IncludeSnapshots);

// Bulk delete blobs matching a prefix
await foreach (BlobItem item in container.GetBlobsAsync(prefix: "temp/"))
{
    await container.DeleteBlobAsync(item.Name);
    Console.WriteLine($"Deleted: {item.Name}");
}
```

## Generating SAS Tokens

SAS tokens give temporary, scoped access to blobs without sharing account keys.

```csharp
using Azure.Storage.Sas;

// Generate a SAS URL for a specific blob (read-only, valid 1 hour)
BlobClient blob = container.GetBlobClient("reports/q1-2026.pdf");

// The blob client needs to be created with a storage key for SAS generation
// Or use user delegation SAS with DefaultAzureCredential
BlobSasBuilder sasBuilder = new()
{
    BlobContainerName = "documents",
    BlobName = "reports/q1-2026.pdf",
    Resource = "b",  // "b" for blob
    ExpiresOn = DateTimeOffset.UtcNow.AddHours(1)
};
sasBuilder.SetPermissions(BlobSasPermissions.Read);

// Generate SAS with user delegation key (best for Azure AD auth)
var userDelegationKey = await blobService.GetUserDelegationKeyAsync(
    DateTimeOffset.UtcNow,
    DateTimeOffset.UtcNow.AddHours(1)
);

string sasToken = sasBuilder.ToSasQueryParameters(
    userDelegationKey,
    blobService.AccountName
).ToString();

string sasUrl = $"{blob.Uri}?{sasToken}";
Console.WriteLine($"SAS URL (valid 1 hour): {sasUrl}");
```

## Using in ASP.NET Core

Here is how to integrate Blob Storage into an ASP.NET Core API for file uploads.

```csharp
// Program.cs
var builder = WebApplication.CreateBuilder(args);

builder.Services.AddSingleton(new BlobServiceClient(
    new Uri("https://mystorageacct.blob.core.windows.net"),
    new DefaultAzureCredential()
));

var app = builder.Build();

// File upload endpoint
app.MapPost("/api/upload", async (
    IFormFile file,
    BlobServiceClient blobService) =>
{
    // Validate the file
    if (file.Length == 0)
        return Results.BadRequest("Empty file");

    if (file.Length > 10 * 1024 * 1024) // 10 MB limit
        return Results.BadRequest("File too large");

    // Generate a unique blob name
    var blobName = $"uploads/{Guid.NewGuid()}/{file.FileName}";
    var container = blobService.GetBlobContainerClient("user-uploads");
    await container.CreateIfNotExistsAsync();

    var blob = container.GetBlobClient(blobName);

    // Upload with content type
    using var stream = file.OpenReadStream();
    await blob.UploadAsync(stream, new BlobUploadOptions
    {
        HttpHeaders = new BlobHttpHeaders
        {
            ContentType = file.ContentType
        }
    });

    return Results.Ok(new { blobName, url = blob.Uri.ToString() });
});

// File download endpoint
app.MapGet("/api/download/{*blobName}", async (
    string blobName,
    BlobServiceClient blobService) =>
{
    var container = blobService.GetBlobContainerClient("user-uploads");
    var blob = container.GetBlobClient(blobName);

    if (!await blob.ExistsAsync())
        return Results.NotFound();

    BlobDownloadStreamingResult download = await blob.DownloadStreamingAsync();

    return Results.Stream(
        download.Content,
        contentType: download.Details.ContentType,
        fileDownloadName: Path.GetFileName(blobName)
    );
});

app.Run();
```

## Best Practices

1. **Use DefaultAzureCredential** instead of connection strings in production.
2. **Set content types** on upload so browsers handle downloads correctly.
3. **Use streaming** for large files to avoid memory pressure.
4. **Enable soft delete** on the storage account for accidental deletion recovery.
5. **Use lifecycle management policies** to automatically tier or delete old blobs.
6. **Generate user delegation SAS tokens** instead of account key SAS tokens for better security.

## Wrapping Up

The Azure.Storage.Blobs SDK gives you a modern, async-first API for all blob operations in .NET. Whether you are building a file upload endpoint in ASP.NET Core or a background service that processes data files, the patterns are consistent and well-designed. Start with DefaultAzureCredential for auth, use streaming for large files, and generate SAS tokens when you need to share temporary access.
