# How to Use the AWS SDK for .NET

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, .NET, C#, SDK

Description: A practical guide to using the AWS SDK for .NET, covering setup, S3 operations, DynamoDB, Lambda invocations, async patterns, error handling, and integration with ASP.NET Core.

---

The AWS SDK for .NET gives you full access to AWS services from C# and other .NET languages. It's well-designed, fully async, and integrates cleanly with ASP.NET Core's dependency injection. Whether you're building web APIs, background workers, or Lambda functions, the .NET SDK has you covered. Let's go through setup and the most common operations.

## Installation

Like the JavaScript v3 SDK, the .NET SDK uses separate NuGet packages for each service.

```bash
# Install via .NET CLI
dotnet add package AWSSDK.S3
dotnet add package AWSSDK.DynamoDBv2
dotnet add package AWSSDK.Lambda
dotnet add package AWSSDK.SQS
dotnet add package AWSSDK.Extensions.NETCore.Setup  # for DI integration
```

Or add them to your `.csproj` file.

```xml
<ItemGroup>
    <PackageReference Include="AWSSDK.S3" Version="3.7.*" />
    <PackageReference Include="AWSSDK.DynamoDBv2" Version="3.7.*" />
    <PackageReference Include="AWSSDK.Lambda" Version="3.7.*" />
    <PackageReference Include="AWSSDK.Extensions.NETCore.Setup" Version="3.7.*" />
</ItemGroup>
```

## Creating Clients

Each service has its own client class. Clients are thread-safe and should be reused.

```csharp
using Amazon.S3;
using Amazon.DynamoDBv2;
using Amazon.Lambda;
using Amazon;

// Create clients with a specific region
var s3Client = new AmazonS3Client(RegionEndpoint.USEast1);
var dynamoClient = new AmazonDynamoDBClient(RegionEndpoint.USEast1);
var lambdaClient = new AmazonLambdaClient(RegionEndpoint.USEast1);
```

## S3 Operations

Common S3 operations in C#.

```csharp
using Amazon.S3;
using Amazon.S3.Model;

var s3 = new AmazonS3Client(RegionEndpoint.USEast1);

// List buckets
var bucketsResponse = await s3.ListBucketsAsync();
foreach (var bucket in bucketsResponse.Buckets)
{
    Console.WriteLine($"{bucket.BucketName} (created: {bucket.CreationDate})");
}

// Upload a file
await s3.PutObjectAsync(new PutObjectRequest
{
    BucketName = "my-bucket",
    Key = "reports/report.pdf",
    FilePath = "/path/to/report.pdf",
    ContentType = "application/pdf",
    Metadata =
    {
        ["uploaded-by"] = "my-app",
        ["version"] = "1.0"
    }
});

// Upload from a string
await s3.PutObjectAsync(new PutObjectRequest
{
    BucketName = "my-bucket",
    Key = "data/config.json",
    ContentBody = "{\"version\": \"1.0\"}",
    ContentType = "application/json"
});

// Download an object
var getResponse = await s3.GetObjectAsync("my-bucket", "data/config.json");
using var reader = new StreamReader(getResponse.ResponseStream);
var content = await reader.ReadToEndAsync();
Console.WriteLine(content);
```

## DynamoDB Operations

The .NET SDK offers both a low-level client and a higher-level Document model.

Using the Document model for cleaner code.

```csharp
using Amazon.DynamoDBv2;
using Amazon.DynamoDBv2.DocumentModel;

var client = new AmazonDynamoDBClient(RegionEndpoint.USEast1);
var table = Table.LoadTable(client, "users");

// Put an item
var userDoc = new Document
{
    ["user_id"] = "user-123",
    ["name"] = "Alice Johnson",
    ["email"] = "alice@example.com",
    ["age"] = 30,
    ["active"] = true
};
await table.PutItemAsync(userDoc);

// Get an item
var retrieved = await table.GetItemAsync("user-123");
Console.WriteLine($"Name: {retrieved["name"]}");
Console.WriteLine($"Email: {retrieved["email"]}");

// Query items
var queryFilter = new QueryFilter("customer_id", QueryOperator.Equal, "cust-12345");
var search = table.Query(queryFilter);
var results = await search.GetRemainingAsync();
foreach (var item in results)
{
    Console.WriteLine($"  Order: {item["order_id"]}");
}
```

## DynamoDB with Object Persistence Model

For strongly-typed access, use the `DynamoDBContext` which maps C# objects to DynamoDB items.

```csharp
using Amazon.DynamoDBv2;
using Amazon.DynamoDBv2.DataModel;

// Define your model
[DynamoDBTable("users")]
public class User
{
    [DynamoDBHashKey("user_id")]
    public string UserId { get; set; }

    [DynamoDBProperty("name")]
    public string Name { get; set; }

    [DynamoDBProperty("email")]
    public string Email { get; set; }

    [DynamoDBProperty("age")]
    public int Age { get; set; }
}

// Use DynamoDBContext for CRUD
var client = new AmazonDynamoDBClient(RegionEndpoint.USEast1);
var context = new DynamoDBContext(client);

// Save
var user = new User
{
    UserId = "user-123",
    Name = "Alice Johnson",
    Email = "alice@example.com",
    Age = 30
};
await context.SaveAsync(user);

// Load
var loaded = await context.LoadAsync<User>("user-123");
Console.WriteLine($"Loaded: {loaded.Name}");

// Query
var orders = await context.QueryAsync<Order>("cust-12345").GetRemainingAsync();

// Delete
await context.DeleteAsync<User>("user-123");
```

## Invoking Lambda Functions

```csharp
using Amazon.Lambda;
using Amazon.Lambda.Model;
using System.Text.Json;

var lambda = new AmazonLambdaClient(RegionEndpoint.USEast1);

// Synchronous invocation
var invokeResponse = await lambda.InvokeAsync(new InvokeRequest
{
    FunctionName = "my-processor",
    InvocationType = InvocationType.RequestResponse,
    Payload = JsonSerializer.Serialize(new { user_id = "user-123", action = "process" })
});

var result = JsonSerializer.Deserialize<Dictionary<string, object>>(
    invokeResponse.Payload
);
Console.WriteLine($"Result: {result}");

// Async invocation (fire and forget)
await lambda.InvokeAsync(new InvokeRequest
{
    FunctionName = "email-sender",
    InvocationType = InvocationType.Event,
    Payload = JsonSerializer.Serialize(new
    {
        to = "user@example.com",
        subject = "Notification"
    })
});
```

## Error Handling

```csharp
using Amazon.S3;
using Amazon.S3.Model;
using Amazon.Runtime;

var s3 = new AmazonS3Client(RegionEndpoint.USEast1);

try
{
    var response = await s3.GetObjectAsync("my-bucket", "nonexistent.txt");
}
catch (AmazonS3Exception ex) when (ex.ErrorCode == "NoSuchKey")
{
    Console.WriteLine("Object not found");
}
catch (AmazonS3Exception ex) when (ex.ErrorCode == "NoSuchBucket")
{
    Console.WriteLine("Bucket not found");
}
catch (AmazonS3Exception ex) when (ex.StatusCode == System.Net.HttpStatusCode.Forbidden)
{
    Console.WriteLine($"Access denied: {ex.Message}");
}
catch (AmazonServiceException ex)
{
    Console.WriteLine($"AWS error: {ex.ErrorCode} - {ex.Message}");
    Console.WriteLine($"Request ID: {ex.RequestId}");
    Console.WriteLine($"Status: {ex.StatusCode}");
}
catch (AmazonClientException ex)
{
    Console.WriteLine($"Client error (network/credentials): {ex.Message}");
}
```

## ASP.NET Core Integration

The SDK integrates with ASP.NET Core's dependency injection system.

```csharp
// Program.cs or Startup.cs
using Amazon.S3;
using Amazon.DynamoDBv2;

var builder = WebApplication.CreateBuilder(args);

// Register AWS services
builder.Services.AddDefaultAWSOptions(
    builder.Configuration.GetAWSOptions()
);
builder.Services.AddAWSService<IAmazonS3>();
builder.Services.AddAWSService<IAmazonDynamoDB>();

var app = builder.Build();
```

Add AWS configuration to `appsettings.json`.

```json
{
  "AWS": {
    "Profile": "default",
    "Region": "us-east-1"
  }
}
```

Then inject clients into your controllers or services.

```csharp
public class FileController : ControllerBase
{
    private readonly IAmazonS3 _s3;

    public FileController(IAmazonS3 s3)
    {
        _s3 = s3;
    }

    [HttpPost("upload")]
    public async Task<IActionResult> Upload(IFormFile file)
    {
        using var stream = file.OpenReadStream();
        await _s3.PutObjectAsync(new PutObjectRequest
        {
            BucketName = "my-uploads",
            Key = $"uploads/{file.FileName}",
            InputStream = stream,
            ContentType = file.ContentType
        });

        return Ok(new { message = "File uploaded" });
    }
}
```

## Pagination

```csharp
using Amazon.S3;
using Amazon.S3.Model;

var s3 = new AmazonS3Client(RegionEndpoint.USEast1);

// The paginator handles continuation tokens automatically
var paginator = s3.Paginators.ListObjectsV2(new ListObjectsV2Request
{
    BucketName = "my-bucket",
    Prefix = "logs/"
});

int total = 0;
await foreach (var response in paginator.Responses)
{
    foreach (var obj in response.S3Objects)
    {
        Console.WriteLine($"{obj.Key} ({obj.Size} bytes)");
        total++;
    }
}
Console.WriteLine($"Total: {total} objects");
```

## Best Practices

- **Use dependency injection** in ASP.NET Core. Register clients as services and let the framework manage their lifecycle.
- **All SDK methods are async.** Always use `await` and never `.Result` or `.Wait()`, which can cause deadlocks.
- **Reuse client instances.** They're thread-safe and manage connection pooling internally.
- **Use the Object Persistence Model** for DynamoDB when you have well-defined data models.
- **Handle errors specifically.** Use pattern matching on error codes rather than catching generic exceptions.

For testing your .NET AWS code locally, check out the guide on [LocalStack](https://oneuptime.com/blog/post/2026-02-12-localstack-test-aws-services-locally/view). And for mocking AWS calls in unit tests, the [mocking guide](https://oneuptime.com/blog/post/2026-02-12-mock-aws-sdk-calls-unit-tests/view) covers patterns that work across SDKs.
