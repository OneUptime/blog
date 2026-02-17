# How to Query Microsoft Graph API from Azure Functions to Manage User Profiles

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Microsoft Graph API, Azure Functions, User Profiles, Azure AD, Serverless, Microsoft 365, REST API

Description: Build Azure Functions that query Microsoft Graph API to read and manage user profiles, group memberships, and directory data programmatically.

---

Microsoft Graph API is the unified endpoint for accessing Microsoft 365 data - users, groups, mail, calendar, files, and more. When you need to automate user profile management tasks like bulk updates, profile enrichment, or synchronization with external systems, Azure Functions provide a serverless compute layer that scales automatically and costs nothing when idle.

This guide covers authenticating Azure Functions with Microsoft Graph, querying user profiles, updating user data, and handling the common patterns you will encounter in production.

## Authentication: App-Only vs Delegated

Before writing any code, you need to understand the two authentication models:

**App-only (client credentials)**: The function authenticates as itself (the application), not as a specific user. Use this when the function runs on a schedule or reacts to events without a logged-in user.

**Delegated (on-behalf-of)**: The function acts on behalf of a specific user. Use this when the function is called by a user through an API and should only access data that user is allowed to see.

For user profile management, app-only is the most common choice since you typically need to read and update profiles for all users.

## Step 1: Register an Azure AD Application

1. Go to Azure portal > Azure Active Directory > App registrations > New registration.
2. Name it "Graph User Management Function".
3. Set Supported account types to "Accounts in this organizational directory only".
4. No redirect URI needed for app-only auth.
5. Click Register.

### Add API Permissions

1. Go to API permissions > Add a permission > Microsoft Graph.
2. Select Application permissions (not Delegated).
3. Add these permissions:
   - `User.Read.All` - Read all users' full profiles
   - `User.ReadWrite.All` - Read and update all users' profiles
   - `Group.Read.All` - Read group memberships
   - `Directory.Read.All` - Read directory data
4. Click Grant admin consent.

### Create a Client Secret

1. Go to Certificates & secrets > New client secret.
2. Set an expiration and click Add.
3. Copy the secret value.

Note the Application (client) ID, Directory (tenant) ID, and client secret. You will need all three.

## Step 2: Create the Azure Function

Create a new Azure Functions project with the Graph SDK:

```bash
func init GraphUserFunctions --dotnet
cd GraphUserFunctions
dotnet add package Microsoft.Graph
dotnet add package Azure.Identity
```

### Configure Authentication

Store the credentials in local.settings.json for development and in App Settings for production:

```json
{
    "IsEncrypted": false,
    "Values": {
        "AzureWebJobsStorage": "UseDevelopmentStorage=true",
        "FUNCTIONS_WORKER_RUNTIME": "dotnet",
        "TenantId": "your-tenant-id",
        "ClientId": "your-client-id",
        "ClientSecret": "your-client-secret"
    }
}
```

### Create a Graph Client Helper

```csharp
// Helper class that creates an authenticated Microsoft Graph client
// Uses client credentials flow for app-only access
using Azure.Identity;
using Microsoft.Graph;
using System;

public static class GraphClientFactory
{
    private static GraphServiceClient _client;

    public static GraphServiceClient GetClient()
    {
        if (_client == null)
        {
            // Create credentials using environment variables
            var credential = new ClientSecretCredential(
                Environment.GetEnvironmentVariable("TenantId"),
                Environment.GetEnvironmentVariable("ClientId"),
                Environment.GetEnvironmentVariable("ClientSecret")
            );

            // Initialize the Graph client with the credential
            _client = new GraphServiceClient(credential);
        }
        return _client;
    }
}
```

## Step 3: Query User Profiles

### Get a Single User

```csharp
// HTTP-triggered function that retrieves a user profile by email or ID
// Returns the user's profile data as JSON
using Microsoft.AspNetCore.Mvc;
using Microsoft.Azure.WebJobs;
using Microsoft.Azure.WebJobs.Extensions.Http;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Logging;
using System.Threading.Tasks;

public static class GetUserProfile
{
    [FunctionName("GetUserProfile")]
    public static async Task<IActionResult> Run(
        [HttpTrigger(AuthorizationLevel.Function, "get")] HttpRequest req,
        ILogger log)
    {
        string userId = req.Query["userId"];
        if (string.IsNullOrEmpty(userId))
        {
            return new BadRequestObjectResult("userId parameter is required");
        }

        var graphClient = GraphClientFactory.GetClient();

        try
        {
            // Fetch the user with specific properties
            // Select only the fields you need to reduce response size
            var user = await graphClient.Users[userId]
                .GetAsync(config => {
                    config.QueryParameters.Select = new[] {
                        "id", "displayName", "mail", "jobTitle",
                        "department", "officeLocation", "mobilePhone",
                        "city", "country", "employeeId"
                    };
                });

            log.LogInformation($"Retrieved profile for {user.DisplayName}");

            return new OkObjectResult(new
            {
                user.Id,
                user.DisplayName,
                user.Mail,
                user.JobTitle,
                user.Department,
                user.OfficeLocation,
                user.MobilePhone,
                user.City,
                user.Country,
                user.EmployeeId
            });
        }
        catch (Microsoft.Graph.Models.ODataErrors.ODataError ex)
        {
            log.LogError($"Graph API error: {ex.Error.Message}");
            return new NotFoundObjectResult($"User not found: {userId}");
        }
    }
}
```

### List All Users with Pagination

```csharp
// Timer-triggered function that syncs all user profiles to a database
// Handles pagination since Graph API returns results in pages
[FunctionName("SyncAllUsers")]
public static async Task Run(
    [TimerTrigger("0 0 2 * * *")] TimerInfo timer,  // Runs at 2 AM daily
    ILogger log)
{
    var graphClient = GraphClientFactory.GetClient();
    var allUsers = new List<UserProfile>();

    // Request the first page of users
    var usersPage = await graphClient.Users
        .GetAsync(config => {
            config.QueryParameters.Select = new[] {
                "id", "displayName", "mail", "jobTitle",
                "department", "employeeId", "accountEnabled"
            };
            // Filter to only enabled accounts
            config.QueryParameters.Filter = "accountEnabled eq true";
            // Set page size (max 999)
            config.QueryParameters.Top = 999;
        });

    // Process the first page
    foreach (var user in usersPage.Value)
    {
        allUsers.Add(MapToProfile(user));
    }

    // Handle pagination - keep requesting until there are no more pages
    var pageIterator = PageIterator<User, UserCollectionResponse>
        .CreatePageIterator(
            graphClient,
            usersPage,
            (user) => {
                allUsers.Add(MapToProfile(user));
                return true; // Continue iterating
            }
        );

    await pageIterator.IterateAsync();

    log.LogInformation($"Synced {allUsers.Count} user profiles");

    // Save to your database here
    await SaveToDatabase(allUsers);
}
```

### Search Users

```csharp
// Function that searches for users by name, email, or department
// Uses Graph API's $search parameter for fuzzy matching
[FunctionName("SearchUsers")]
public static async Task<IActionResult> Run(
    [HttpTrigger(AuthorizationLevel.Function, "get")] HttpRequest req,
    ILogger log)
{
    string searchTerm = req.Query["q"];

    var graphClient = GraphClientFactory.GetClient();

    // Graph API search requires the ConsistencyLevel header
    var users = await graphClient.Users
        .GetAsync(config => {
            config.Headers.Add("ConsistencyLevel", "eventual");
            config.QueryParameters.Search =
                $"\"displayName:{searchTerm}\" OR \"mail:{searchTerm}\"";
            config.QueryParameters.Select = new[] {
                "id", "displayName", "mail", "jobTitle", "department"
            };
            config.QueryParameters.Top = 25;
        });

    return new OkObjectResult(users.Value.Select(u => new
    {
        u.Id, u.DisplayName, u.Mail, u.JobTitle, u.Department
    }));
}
```

## Step 4: Update User Profiles

### Update a Single User

```csharp
// Function that updates a user's profile properties
// Accepts a JSON body with the fields to update
[FunctionName("UpdateUserProfile")]
public static async Task<IActionResult> Run(
    [HttpTrigger(AuthorizationLevel.Function, "patch")] HttpRequest req,
    ILogger log)
{
    string userId = req.Query["userId"];
    string body = await new StreamReader(req.Body).ReadToEndAsync();
    var updateRequest = JsonSerializer.Deserialize<UserUpdateRequest>(body);

    var graphClient = GraphClientFactory.GetClient();

    // Build the update payload
    // Only include fields that were provided in the request
    var userUpdate = new User();

    if (!string.IsNullOrEmpty(updateRequest.JobTitle))
        userUpdate.JobTitle = updateRequest.JobTitle;

    if (!string.IsNullOrEmpty(updateRequest.Department))
        userUpdate.Department = updateRequest.Department;

    if (!string.IsNullOrEmpty(updateRequest.OfficeLocation))
        userUpdate.OfficeLocation = updateRequest.OfficeLocation;

    if (!string.IsNullOrEmpty(updateRequest.MobilePhone))
        userUpdate.MobilePhone = updateRequest.MobilePhone;

    try
    {
        await graphClient.Users[userId].PatchAsync(userUpdate);
        log.LogInformation($"Updated profile for user {userId}");
        return new OkObjectResult(new { Status = "Updated", UserId = userId });
    }
    catch (Microsoft.Graph.Models.ODataErrors.ODataError ex)
    {
        log.LogError($"Failed to update user {userId}: {ex.Error.Message}");
        return new StatusCodeResult(500);
    }
}
```

### Bulk Update Users

```csharp
// Function that performs bulk profile updates using Graph batch requests
// Batching reduces the number of HTTP calls to Graph API
[FunctionName("BulkUpdateUsers")]
public static async Task<IActionResult> Run(
    [HttpTrigger(AuthorizationLevel.Function, "post")] HttpRequest req,
    ILogger log)
{
    string body = await new StreamReader(req.Body).ReadToEndAsync();
    var updates = JsonSerializer.Deserialize<List<BulkUpdateItem>>(body);

    var graphClient = GraphClientFactory.GetClient();
    int successCount = 0;
    int failCount = 0;

    // Process in batches of 20 (Graph API batch limit)
    foreach (var batch in updates.Chunk(20))
    {
        var batchRequest = new BatchRequestContentCollection(graphClient);

        foreach (var update in batch)
        {
            var userUpdate = new User
            {
                Department = update.Department,
                JobTitle = update.JobTitle
            };

            var request = graphClient.Users[update.UserId].ToPatchRequestInformation(userUpdate);
            await batchRequest.AddBatchRequestStepAsync(request);
        }

        var batchResponse = await graphClient.Batch.PostAsync(batchRequest);

        // Check results for each request in the batch
        foreach (var step in batch)
        {
            try
            {
                // Process individual response
                successCount++;
            }
            catch
            {
                failCount++;
            }
        }
    }

    log.LogInformation($"Bulk update complete: {successCount} success, {failCount} failed");
    return new OkObjectResult(new { SuccessCount = successCount, FailCount = failCount });
}
```

## Step 5: Get Group Memberships

```csharp
// Function that retrieves a user's group memberships
// Useful for authorization decisions in other systems
[FunctionName("GetUserGroups")]
public static async Task<IActionResult> Run(
    [HttpTrigger(AuthorizationLevel.Function, "get")] HttpRequest req,
    ILogger log)
{
    string userId = req.Query["userId"];
    var graphClient = GraphClientFactory.GetClient();

    // Get transitive group memberships (includes nested groups)
    var groups = await graphClient.Users[userId]
        .TransitiveMemberOf
        .GetAsync(config => {
            config.QueryParameters.Top = 999;
        });

    var groupList = groups.Value
        .OfType<Group>()
        .Select(g => new
        {
            g.Id,
            g.DisplayName,
            g.Description,
            g.GroupTypes
        });

    return new OkObjectResult(groupList);
}
```

## Step 6: Handle Throttling

Microsoft Graph API throttles requests that exceed rate limits. Your functions must handle this gracefully.

The Graph SDK has built-in retry handling, but you should also implement your own backoff logic for batch operations:

```csharp
// Retry helper for Graph API calls
// Handles 429 (Too Many Requests) responses with exponential backoff
public static async Task<T> ExecuteWithRetry<T>(
    Func<Task<T>> operation,
    int maxRetries = 3,
    ILogger log = null)
{
    for (int attempt = 0; attempt <= maxRetries; attempt++)
    {
        try
        {
            return await operation();
        }
        catch (ServiceException ex) when (ex.ResponseStatusCode == 429)
        {
            if (attempt == maxRetries) throw;

            // Use the Retry-After header if provided
            var retryAfter = ex.ResponseHeaders
                ?.FirstOrDefault(h => h.Key == "Retry-After")
                .Value?.FirstOrDefault();

            int delaySeconds = int.TryParse(retryAfter, out int parsed)
                ? parsed
                : (int)Math.Pow(2, attempt) * 10;

            log?.LogWarning($"Throttled. Retrying in {delaySeconds} seconds...");
            await Task.Delay(TimeSpan.FromSeconds(delaySeconds));
        }
    }

    throw new Exception("Should not reach here");
}
```

## Security Best Practices

- Store client secrets in Azure Key Vault, not in app settings.
- Use managed identity when possible to avoid managing secrets entirely.
- Request the minimum permissions needed. If you only read profiles, use `User.Read.All` instead of `User.ReadWrite.All`.
- Monitor Graph API usage in Azure AD sign-in logs to detect anomalies.
- Set client secret expiration reminders and rotate regularly.

## Wrapping Up

Azure Functions paired with Microsoft Graph API provide a powerful platform for automating user profile management. The key patterns are app-only authentication for background processing, pagination for handling large directories, batch requests for bulk operations, and proper throttling handling. Start with read-only queries to understand the data shape, then add write operations as needed. Always request the minimum API permissions and monitor your usage.
