# How to Build a Multi-Region Azure Cosmos DB Application with Session Consistency in .NET

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure Cosmos DB, Multi-Region, .NET, Session Consistency, Global Distribution, C#, Cloud

Description: Build a globally distributed application with Azure Cosmos DB multi-region writes and session consistency in .NET for low-latency worldwide access.

---

One of the strongest selling points of Azure Cosmos DB is turnkey global distribution. You can replicate your data across multiple Azure regions with a few clicks, and your application gets single-digit millisecond reads from the nearest region. But multi-region comes with trade-offs, particularly around consistency. How do you ensure that a user who just wrote data can immediately read it back, even if the write went to a different region than the read?

Session consistency is the answer for most applications. It guarantees that within a single session, reads never lag behind writes. A user updating their profile in US East will see the updated profile immediately, even if the read is served from a replica. In this post, we will build a .NET application that uses Azure Cosmos DB with multi-region writes and session consistency, handling all the nuances that come with it.

## Understanding Consistency Levels

Cosmos DB offers five consistency levels, from strongest to weakest:

1. **Strong**: Linearizable reads. All regions see the same data at all times. Only available with single-region writes.
2. **Bounded Staleness**: Reads lag behind writes by at most K versions or T time.
3. **Session**: Within a session, reads reflect writes. This is the default and the most popular choice.
4. **Consistent Prefix**: Reads never see out-of-order writes, but may lag.
5. **Eventual**: No ordering guarantees. Cheapest in terms of RUs.

Session consistency costs the same as eventual consistency in terms of RUs but gives much stronger guarantees for user-facing applications.

## Step 1: Set Up Multi-Region Cosmos DB

```bash
# Create a Cosmos DB account with multiple write regions
az cosmosdb create \
  --name global-app-db \
  --resource-group global-rg \
  --kind GlobalDocumentDB \
  --default-consistency-level Session \
  --enable-multiple-write-locations true \
  --locations regionName=eastus failoverPriority=0 isZoneRedundant=true \
  --locations regionName=westeurope failoverPriority=1 isZoneRedundant=true \
  --locations regionName=southeastasia failoverPriority=2 isZoneRedundant=true

# Create the database and container
az cosmosdb sql database create \
  --account-name global-app-db \
  --resource-group global-rg \
  --name AppDB

az cosmosdb sql container create \
  --account-name global-app-db \
  --resource-group global-rg \
  --database-name AppDB \
  --name UserProfiles \
  --partition-key-path /region \
  --throughput 1000
```

## Step 2: Configure the .NET Client

The key to multi-region is configuring the Cosmos DB client with the right preferred regions and connection mode.

```csharp
// CosmosDbConfig.cs
// Configures the Cosmos DB client for multi-region access
using Microsoft.Azure.Cosmos;

public class CosmosDbConfig
{
    public static CosmosClient CreateClient(string connectionString, string applicationRegion)
    {
        // Configure the client with region-aware settings
        var options = new CosmosClientOptions
        {
            // Set the application region - this tells the SDK which region
            // to prefer for reads and writes
            ApplicationRegion = applicationRegion,

            // Use Direct mode for lowest latency
            ConnectionMode = ConnectionMode.Direct,

            // The SDK will retry on rate-limited or transient errors
            MaxRetryAttemptsOnRateLimitedRequests = 9,
            MaxRetryWaitTimeOnRateLimitedRequests = TimeSpan.FromSeconds(30),

            // Session consistency is the default, but set it explicitly for clarity
            ConsistencyLevel = ConsistencyLevel.Session,

            // Enable content response on write to get the session token
            EnableContentResponseOnWrite = true,
        };

        return new CosmosClient(connectionString, options);
    }

    // Alternative: specify multiple preferred regions in priority order
    public static CosmosClient CreateClientWithPreferredRegions(
        string connectionString,
        List<string> preferredRegions)
    {
        var options = new CosmosClientOptions
        {
            ConnectionMode = ConnectionMode.Direct,
            ConsistencyLevel = ConsistencyLevel.Session,
            // The SDK will try regions in this order
            ApplicationPreferredRegions = preferredRegions,
        };

        return new CosmosClient(connectionString, options);
    }
}
```

## Step 3: Implement Session Token Management

The session token is the key to session consistency in a multi-region setup. After each write, the SDK returns a session token. Subsequent reads that include this token are guaranteed to see the write.

```csharp
// SessionTokenManager.cs
// Manages session tokens for consistent reads across regions
using Microsoft.Azure.Cosmos;

public class SessionTokenManager
{
    // Store session tokens per user. In production, use a distributed cache.
    private readonly Dictionary<string, string> _sessionTokens = new();

    // Save the session token after a write operation
    public void SaveToken(string userId, ItemResponse<dynamic> response)
    {
        var sessionToken = response.Headers.Session;
        if (!string.IsNullOrEmpty(sessionToken))
        {
            _sessionTokens[userId] = sessionToken;
        }
    }

    // Get the session token for read operations
    public string? GetToken(string userId)
    {
        return _sessionTokens.TryGetValue(userId, out var token) ? token : null;
    }

    // Build request options with the session token
    public ItemRequestOptions GetReadOptions(string userId)
    {
        var options = new ItemRequestOptions();
        var token = GetToken(userId);
        if (token != null)
        {
            options.SessionToken = token;
        }
        return options;
    }

    public QueryRequestOptions GetQueryOptions(string userId)
    {
        var options = new QueryRequestOptions();
        var token = GetToken(userId);
        if (token != null)
        {
            options.SessionToken = token;
        }
        return options;
    }
}
```

## Step 4: Build the Repository

The repository uses session tokens to ensure consistent reads after writes.

```csharp
// UserProfileRepository.cs
// Repository that handles multi-region CRUD with session consistency
using Microsoft.Azure.Cosmos;
using System.Net;

public class UserProfile
{
    public string Id { get; set; } = string.Empty;
    public string UserId { get; set; } = string.Empty;
    public string Region { get; set; } = string.Empty;
    public string DisplayName { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string Bio { get; set; } = string.Empty;
    public DateTime UpdatedAt { get; set; }
}

public class UserProfileRepository
{
    private readonly Container _container;
    private readonly SessionTokenManager _sessionManager;

    public UserProfileRepository(CosmosClient client, SessionTokenManager sessionManager)
    {
        _container = client.GetContainer("AppDB", "UserProfiles");
        _sessionManager = sessionManager;
    }

    // Create or update a user profile
    public async Task<UserProfile> UpsertProfile(UserProfile profile)
    {
        profile.UpdatedAt = DateTime.UtcNow;

        var response = await _container.UpsertItemAsync(
            profile,
            new PartitionKey(profile.Region)
        );

        // Save the session token so subsequent reads see this write
        _sessionManager.SaveToken(profile.UserId, response);

        Console.WriteLine($"Upserted profile for {profile.UserId}. " +
            $"Region: {response.Diagnostics.GetContactedRegions().FirstOrDefault().regionName}. " +
            $"RU charge: {response.RequestCharge}");

        return response.Resource;
    }

    // Read a profile with session consistency
    public async Task<UserProfile?> GetProfile(string userId, string region)
    {
        try {
            // Include the session token in the read request
            var options = _sessionManager.GetReadOptions(userId);

            var response = await _container.ReadItemAsync<UserProfile>(
                userId,
                new PartitionKey(region),
                options
            );

            // Update the session token from the read response
            _sessionManager.SaveToken(userId, response);

            Console.WriteLine($"Read profile for {userId}. " +
                $"Region: {response.Diagnostics.GetContactedRegions().FirstOrDefault().regionName}. " +
                $"RU charge: {response.RequestCharge}");

            return response.Resource;
        }
        catch (CosmosException ex) when (ex.StatusCode == HttpStatusCode.NotFound)
        {
            return null;
        }
    }

    // Query profiles with session consistency
    public async Task<List<UserProfile>> GetProfilesByRegion(string region, string userId)
    {
        var queryOptions = _sessionManager.GetQueryOptions(userId);
        queryOptions.PartitionKey = new PartitionKey(region);

        var query = _container.GetItemQueryIterator<UserProfile>(
            new QueryDefinition("SELECT * FROM c WHERE c.region = @region")
                .WithParameter("@region", region),
            requestOptions: queryOptions
        );

        var profiles = new List<UserProfile>();
        while (query.HasMoreResults)
        {
            var response = await query.ReadNextAsync();
            profiles.AddRange(response.Resource);
        }

        return profiles;
    }
}
```

## Step 5: Build the API

```csharp
// Program.cs
// ASP.NET Core API with multi-region Cosmos DB
using Microsoft.Azure.Cosmos;

var builder = WebApplication.CreateBuilder(args);

// Determine which Azure region this instance is running in
var applicationRegion = Environment.GetEnvironmentVariable("AZURE_REGION") ?? Regions.EastUS;

// Register the Cosmos DB client as a singleton
builder.Services.AddSingleton<CosmosClient>(sp =>
{
    var connectionString = builder.Configuration["CosmosDB:ConnectionString"]!;
    return CosmosDbConfig.CreateClient(connectionString, applicationRegion);
});

builder.Services.AddSingleton<SessionTokenManager>();
builder.Services.AddScoped<UserProfileRepository>();
builder.Services.AddControllers();

var app = builder.Build();
app.MapControllers();
app.Run();
```

```csharp
// Controllers/ProfileController.cs
// API controller for user profiles
using Microsoft.AspNetCore.Mvc;

[ApiController]
[Route("api/profiles")]
public class ProfileController : ControllerBase
{
    private readonly UserProfileRepository _repository;

    public ProfileController(UserProfileRepository repository)
    {
        _repository = repository;
    }

    [HttpGet("{userId}")]
    public async Task<IActionResult> Get(string userId, [FromQuery] string region)
    {
        var profile = await _repository.GetProfile(userId, region);
        if (profile == null) return NotFound();
        return Ok(profile);
    }

    [HttpPut]
    public async Task<IActionResult> Upsert([FromBody] UserProfile profile)
    {
        var result = await _repository.UpsertProfile(profile);
        return Ok(result);
    }

    [HttpGet("region/{region}")]
    public async Task<IActionResult> GetByRegion(
        string region,
        [FromHeader(Name = "X-User-Id")] string userId)
    {
        var profiles = await _repository.GetProfilesByRegion(region, userId);
        return Ok(profiles);
    }
}
```

## Conflict Resolution

With multi-region writes, conflicts can occur when the same document is updated in two regions simultaneously. Cosmos DB uses Last Writer Wins (LWW) by default, based on the `_ts` timestamp. You can also implement custom conflict resolution.

```csharp
// Custom conflict resolution using a stored procedure
// Configure this when creating the container
var containerProperties = new ContainerProperties("UserProfiles", "/region")
{
    ConflictResolutionPolicy = new ConflictResolutionPolicy
    {
        Mode = ConflictResolutionMode.LastWriterWins,
        // Use a custom path for conflict resolution instead of _ts
        ResolutionPath = "/updatedAt",
    }
};
```

For more complex scenarios, you can use a custom stored procedure for conflict resolution.

## Deployment Strategy

Deploy your application to multiple regions using Azure Front Door for traffic routing.

```bash
# Deploy the API to multiple regions
az containerapp create \
  --name profile-api-eastus \
  --resource-group global-rg \
  --environment env-eastus \
  --image myregistry.azurecr.io/profile-api:v1 \
  --env-vars AZURE_REGION=East_US \
    CosmosDB__ConnectionString=secretref:cosmos-connection

az containerapp create \
  --name profile-api-westeurope \
  --resource-group global-rg \
  --environment env-westeurope \
  --image myregistry.azurecr.io/profile-api:v1 \
  --env-vars AZURE_REGION=West_Europe \
    CosmosDB__ConnectionString=secretref:cosmos-connection
```

## Session Tokens in Web Applications

In web applications, the session token needs to be passed between requests. You can store it in a cookie, a custom header, or the user's server-side session.

```csharp
// Middleware that extracts and injects session tokens from cookies
public class SessionTokenMiddleware
{
    private readonly RequestDelegate _next;

    public SessionTokenMiddleware(RequestDelegate next) => _next = next;

    public async Task InvokeAsync(HttpContext context, SessionTokenManager sessionManager)
    {
        // Extract session token from cookie if present
        var cookieToken = context.Request.Cookies["cosmos-session"];
        if (cookieToken != null)
        {
            var userId = context.Request.Headers["X-User-Id"].FirstOrDefault();
            if (userId != null)
            {
                // Restore the session token for this request
                sessionManager.SaveTokenDirect(userId, cookieToken);
            }
        }

        await _next(context);

        // After the request, save any updated session token to a cookie
        var responseToken = context.Items["cosmos-session-token"] as string;
        if (responseToken != null)
        {
            context.Response.Cookies.Append("cosmos-session", responseToken, new CookieOptions
            {
                HttpOnly = true,
                Secure = true,
                SameSite = SameSiteMode.Strict,
                MaxAge = TimeSpan.FromHours(1),
            });
        }
    }
}
```

## Summary

Multi-region Azure Cosmos DB with session consistency gives you the best of both worlds - global distribution with low latency and strong enough consistency for user-facing applications. The key is managing session tokens correctly so that reads reflect writes within the same user session. The .NET SDK handles most of the complexity, but you need to be intentional about passing session tokens between requests, especially in stateless web applications. With multi-region writes enabled, every region can accept writes, which eliminates the latency penalty of routing writes to a single primary region. The trade-off is that conflicts can occur, but Last Writer Wins handles this automatically for most use cases.
