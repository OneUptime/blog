# How to Authenticate Azure Functions with Azure Active Directory

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure Functions, Azure Active Directory, Authentication, OAuth, Security, Azure, Identity

Description: Secure your Azure Functions HTTP endpoints with Azure Active Directory authentication using built-in App Service authentication and custom token validation.

---

Exposing an Azure Function as an HTTP endpoint without authentication means anyone with the URL can call it. Function keys provide a basic level of protection, but they are shared secrets that are hard to manage and do not provide identity information about the caller. Azure Active Directory (Azure AD) authentication gives you proper OAuth 2.0/OpenID Connect-based security with user identities, role-based access control, and token-based authentication that integrates with the rest of the Microsoft identity platform.

In this post, I will walk through two approaches to securing Azure Functions with Azure AD: the built-in App Service authentication (also called "Easy Auth") and custom token validation in code.

## Approach 1: Built-In App Service Authentication (Easy Auth)

This is the simplest approach. Azure's built-in authentication layer sits in front of your function app and validates tokens before your code even runs. You do not need to write any authentication code.

### Setting Up the App Registration

First, create an app registration in Azure AD. This represents your function app as a protected resource.

```bash
# Create an app registration for your function app
az ad app create \
  --display-name "my-function-app-auth" \
  --sign-in-audience AzureADMyOrg \
  --web-redirect-uris "https://my-function-app.azurewebsites.net/.auth/login/aad/callback"

# Note the appId from the output - you will need it
# Create a service principal for the app registration
az ad sp create --id <APP_ID>

# Add an API scope so clients can request access
az ad app update \
  --id <APP_ID> \
  --identifier-uris "api://<APP_ID>"
```

### Enabling Authentication on the Function App

```bash
# Enable Azure AD authentication on the function app
az webapp auth microsoft update \
  --name my-function-app \
  --resource-group my-resource-group \
  --client-id <APP_ID> \
  --issuer "https://login.microsoftonline.com/<TENANT_ID>/v2.0" \
  --allowed-audiences "api://<APP_ID>" \
  --yes

# Set the authentication to require login (reject unauthenticated requests)
az webapp auth update \
  --name my-function-app \
  --resource-group my-resource-group \
  --unauthenticated-client-action RedirectToLoginPage
```

With this configuration, any request without a valid Azure AD token will be rejected with a 401 response (or redirected to the login page if you chose that option).

### Accessing User Information in Your Function

When Easy Auth validates a token, it passes the user information to your function through HTTP headers.

```csharp
[Function("GetProfile")]
public async Task<HttpResponseData> GetProfile(
    [HttpTrigger(AuthorizationLevel.Anonymous, "get")] HttpRequestData req)
{
    // Easy Auth injects the user's identity through the ClaimsPrincipal
    // The x-ms-client-principal header contains the encoded claims
    var principalHeader = req.Headers.GetValues("x-ms-client-principal").FirstOrDefault();

    if (principalHeader == null)
    {
        var unauthorized = req.CreateResponse(System.Net.HttpStatusCode.Unauthorized);
        return unauthorized;
    }

    // Decode the client principal
    var decoded = Convert.FromBase64String(principalHeader);
    var json = System.Text.Encoding.UTF8.GetString(decoded);
    var principal = JsonSerializer.Deserialize<ClientPrincipal>(json);

    _logger.LogInformation("Authenticated user: {User}", principal.UserDetails);

    var response = req.CreateResponse(System.Net.HttpStatusCode.OK);
    await response.WriteAsJsonAsync(new
    {
        userId = principal.UserId,
        email = principal.UserDetails,
        roles = principal.Claims
            .Where(c => c.Type == "roles")
            .Select(c => c.Value)
    });
    return response;
}

// Model for the client principal that Easy Auth provides
public class ClientPrincipal
{
    public string IdentityProvider { get; set; }
    public string UserId { get; set; }
    public string UserDetails { get; set; }
    public IEnumerable<ClientPrincipalClaim> Claims { get; set; }
}

public class ClientPrincipalClaim
{
    public string Type { get; set; }
    public string Value { get; set; }
}
```

## Approach 2: Custom Token Validation in Code

For more control over the authentication process, you can validate JWT tokens yourself. This is useful when you need custom logic, want to support multiple identity providers, or prefer to keep authentication as part of your application code.

### Configuring JWT Validation

First, set up the JWT validation in your `Program.cs`.

```csharp
using Microsoft.Azure.Functions.Worker;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Identity.Web;

var host = new HostBuilder()
    .ConfigureFunctionsWebApplication(builder =>
    {
        // Add the authentication middleware
        builder.UseMiddleware<AuthenticationMiddleware>();
    })
    .ConfigureServices((context, services) =>
    {
        // Configure Microsoft Identity (Azure AD) authentication
        services.AddMicrosoftIdentityWebApiAuthentication(context.Configuration);
    })
    .Build();

host.Run();
```

Add the required configuration to `local.settings.json` (and to your Azure app settings in production).

```json
{
  "IsEncrypted": false,
  "Values": {
    "AzureWebJobsStorage": "UseDevelopmentStorage=true",
    "FUNCTIONS_WORKER_RUNTIME": "dotnet-isolated",
    "AzureAd__Instance": "https://login.microsoftonline.com/",
    "AzureAd__TenantId": "your-tenant-id",
    "AzureAd__ClientId": "your-app-registration-client-id",
    "AzureAd__Audience": "api://your-app-registration-client-id"
  }
}
```

### Building Authentication Middleware

Create middleware that validates the JWT token on every request.

```csharp
using Microsoft.Azure.Functions.Worker;
using Microsoft.Azure.Functions.Worker.Middleware;
using Microsoft.IdentityModel.Tokens;
using System.IdentityModel.Tokens.Jwt;
using Microsoft.IdentityModel.Protocols;
using Microsoft.IdentityModel.Protocols.OpenIdConnect;

public class AuthenticationMiddleware : IFunctionsWorkerMiddleware
{
    private readonly ILogger<AuthenticationMiddleware> _logger;
    private readonly string _tenantId;
    private readonly string _clientId;
    private readonly string _audience;

    // Cache the configuration manager to avoid fetching signing keys on every request
    private static ConfigurationManager<OpenIdConnectConfiguration> _configManager;

    public AuthenticationMiddleware(
        ILogger<AuthenticationMiddleware> logger,
        IConfiguration configuration)
    {
        _logger = logger;
        _tenantId = configuration["AzureAd:TenantId"];
        _clientId = configuration["AzureAd:ClientId"];
        _audience = configuration["AzureAd:Audience"];

        // Initialize the OpenID Connect configuration manager
        _configManager ??= new ConfigurationManager<OpenIdConnectConfiguration>(
            $"https://login.microsoftonline.com/{_tenantId}/v2.0/.well-known/openid-configuration",
            new OpenIdConnectConfigurationRetriever());
    }

    public async Task Invoke(FunctionContext context, FunctionExecutionDelegate next)
    {
        // Skip authentication for non-HTTP triggers
        var httpReqData = await context.GetHttpRequestDataAsync();
        if (httpReqData == null)
        {
            await next(context);
            return;
        }

        // Extract the Bearer token from the Authorization header
        var authHeader = httpReqData.Headers.GetValues("Authorization")?.FirstOrDefault();
        if (string.IsNullOrEmpty(authHeader) || !authHeader.StartsWith("Bearer "))
        {
            _logger.LogWarning("Missing or invalid Authorization header");
            var response = httpReqData.CreateResponse(System.Net.HttpStatusCode.Unauthorized);
            context.GetInvocationResult().Value = response;
            return;
        }

        var token = authHeader["Bearer ".Length..];

        try
        {
            // Validate the JWT token
            var config = await _configManager.GetConfigurationAsync();
            var validationParameters = new TokenValidationParameters
            {
                ValidateIssuer = true,
                ValidIssuer = $"https://login.microsoftonline.com/{_tenantId}/v2.0",
                ValidateAudience = true,
                ValidAudience = _audience,
                ValidateLifetime = true,
                IssuerSigningKeys = config.SigningKeys,
                ClockSkew = TimeSpan.FromMinutes(2)
            };

            var handler = new JwtSecurityTokenHandler();
            var principal = handler.ValidateToken(token, validationParameters, out _);

            // Store the validated claims in the function context for later use
            context.Items["User"] = principal;

            _logger.LogInformation("Authenticated user: {User}",
                principal.Identity?.Name ?? "unknown");
        }
        catch (SecurityTokenException ex)
        {
            _logger.LogWarning("Token validation failed: {Error}", ex.Message);
            var response = httpReqData.CreateResponse(System.Net.HttpStatusCode.Unauthorized);
            context.GetInvocationResult().Value = response;
            return;
        }

        await next(context);
    }
}
```

### Using the Authenticated Identity in Functions

```csharp
[Function("SecureEndpoint")]
public async Task<HttpResponseData> Run(
    [HttpTrigger(AuthorizationLevel.Anonymous, "get")] HttpRequestData req,
    FunctionContext context)
{
    // Get the authenticated user from the middleware
    var user = context.Items["User"] as System.Security.Claims.ClaimsPrincipal;

    if (user == null)
    {
        return req.CreateResponse(System.Net.HttpStatusCode.Unauthorized);
    }

    // Extract claims from the token
    var userId = user.FindFirst("oid")?.Value;  // Object ID
    var email = user.FindFirst("preferred_username")?.Value;
    var roles = user.FindAll("roles").Select(c => c.Value).ToList();

    // Check for specific roles
    if (!roles.Contains("Admin"))
    {
        _logger.LogWarning("User {Email} does not have Admin role", email);
        return req.CreateResponse(System.Net.HttpStatusCode.Forbidden);
    }

    var response = req.CreateResponse(System.Net.HttpStatusCode.OK);
    await response.WriteAsJsonAsync(new
    {
        message = "You have access to this secure endpoint",
        user = email,
        objectId = userId,
        roles = roles
    });
    return response;
}
```

## Calling the Authenticated Function

Clients need to obtain a token from Azure AD before calling your function. Here is an example using the Microsoft Authentication Library (MSAL).

```csharp
// Client-side code to call the authenticated function
using Azure.Identity;

// For daemon/service-to-service calls, use client credentials
var credential = new ClientSecretCredential(
    tenantId: "your-tenant-id",
    clientId: "client-app-client-id",
    clientSecret: "client-app-secret");

// Request a token for your function app's API
var token = await credential.GetTokenAsync(
    new Azure.Core.TokenRequestContext(
        new[] { "api://your-function-app-client-id/.default" }));

// Call the function with the token
var client = new HttpClient();
client.DefaultRequestHeaders.Authorization =
    new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", token.Token);

var response = await client.GetAsync(
    "https://my-function-app.azurewebsites.net/api/SecureEndpoint");
```

## Which Approach Should You Choose?

Use **Easy Auth** when you want minimal code changes, need browser-based login flows, or are building a simple API that just needs to know who the caller is.

Use **custom token validation** when you need fine-grained control over validation, want to support multiple token issuers, need custom claim extraction logic, or want to unit test your authentication code.

Both approaches can be combined - use Easy Auth as a first line of defense and add custom validation for specific endpoints that need additional checks.

## Summary

Azure AD authentication for Azure Functions eliminates the need for shared API keys and gives you identity-based access control. Easy Auth is the quickest path to securing your functions, while custom middleware gives you full control over the authentication pipeline. Whichever approach you choose, you get standards-based OAuth 2.0 security, integration with Azure RBAC, and a clear audit trail of who called your functions and when.
