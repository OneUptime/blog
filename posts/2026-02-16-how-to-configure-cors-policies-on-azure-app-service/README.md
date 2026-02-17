# How to Configure CORS Policies on Azure App Service

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure, App Service, CORS, Web Security, API, Cloud Computing, DevOps

Description: A practical guide to configuring Cross-Origin Resource Sharing policies on Azure App Service for secure API access from frontend applications.

---

Cross-Origin Resource Sharing (CORS) is one of those things that every web developer runs into eventually. You build an API, deploy it to Azure App Service, and then your frontend application running on a different domain gets blocked by the browser. The fix is to configure CORS properly, but getting it right can be tricky.

This post covers how to set up CORS on Azure App Service, the different approaches available, and some common pitfalls to avoid.

## Why CORS Exists

Browsers enforce the Same-Origin Policy, which means JavaScript running on `https://myapp.com` cannot make requests to `https://api.myapp.com` unless the API explicitly allows it. This is a security feature that prevents malicious websites from making requests to your API on behalf of your users.

CORS is the mechanism that lets servers opt in to cross-origin requests. The server sends back specific HTTP headers that tell the browser which origins are allowed to access the resource.

The key headers are:

- `Access-Control-Allow-Origin` - Which origins can access the resource
- `Access-Control-Allow-Methods` - Which HTTP methods are allowed (GET, POST, PUT, etc.)
- `Access-Control-Allow-Headers` - Which request headers are allowed
- `Access-Control-Allow-Credentials` - Whether cookies and auth headers are allowed
- `Access-Control-Max-Age` - How long the browser should cache the preflight response

## Configuring CORS in the Azure Portal

The simplest way to set up CORS on Azure App Service is through the portal.

1. Go to your App Service in the Azure Portal
2. In the left menu, find the "CORS" blade under the API section
3. Add the allowed origins

You can add specific origins like `https://myapp.com` or use the wildcard `*` to allow all origins. Each origin goes on its own line.

A couple things to know about the portal approach:

- It only configures `Access-Control-Allow-Origin`. The platform handles the other headers automatically based on the preflight request.
- If you add any origins, Azure automatically responds to OPTIONS preflight requests with a 200 status.
- The wildcard `*` allows all origins but does not support credentials (cookies, auth headers). This is a browser restriction, not an Azure one.

## Configuring CORS via Azure CLI

For repeatable deployments, use the Azure CLI to configure CORS:

```bash
# Add a single allowed origin to your App Service
az webapp cors add \
    --resource-group my-resource-group \
    --name my-api-service \
    --allowed-origins "https://myapp.com"

# Add multiple origins at once
az webapp cors add \
    --resource-group my-resource-group \
    --name my-api-service \
    --allowed-origins "https://myapp.com" "https://staging.myapp.com" "http://localhost:3000"

# Show current CORS settings
az webapp cors show \
    --resource-group my-resource-group \
    --name my-api-service

# Remove a specific origin
az webapp cors remove \
    --resource-group my-resource-group \
    --name my-api-service \
    --allowed-origins "http://localhost:3000"
```

## Configuring CORS with ARM Templates

If you manage infrastructure as code with ARM templates, you can set CORS in the site configuration:

```json
{
    "type": "Microsoft.Web/sites",
    "apiVersion": "2022-03-01",
    "name": "[parameters('siteName')]",
    "location": "[resourceGroup().location]",
    "properties": {
        "siteConfig": {
            "cors": {
                "allowedOrigins": [
                    "https://myapp.com",
                    "https://staging.myapp.com"
                ],
                "supportCredentials": true
            }
        }
    }
}
```

The `supportCredentials` property maps to the `Access-Control-Allow-Credentials` header. Set it to `true` if your frontend sends cookies or authorization headers with cross-origin requests.

## Configuring CORS with Terraform

If you use Terraform to manage your Azure resources, here is how to configure CORS:

```hcl
# Define CORS settings in the App Service resource
resource "azurerm_linux_web_app" "api" {
  name                = "my-api-service"
  resource_group_name = azurerm_resource_group.main.name
  location            = azurerm_resource_group.main.location
  service_plan_id     = azurerm_service_plan.main.id

  site_config {
    # CORS configuration block
    cors {
      allowed_origins     = [
        "https://myapp.com",
        "https://staging.myapp.com"
      ]
      support_credentials = true
    }
  }
}
```

## Application-Level CORS vs Platform-Level CORS

There is an important distinction between configuring CORS at the Azure platform level and configuring it in your application code.

**Platform-level CORS** (what we have been discussing so far) is handled by the Azure App Service infrastructure before your application code runs. It intercepts preflight OPTIONS requests and adds the appropriate headers.

**Application-level CORS** is handled by middleware in your application framework. For example, in ASP.NET Core:

```csharp
// Program.cs or Startup.cs - Configure CORS in your application
var builder = WebApplication.CreateBuilder(args);

// Define a named CORS policy
builder.Services.AddCors(options =>
{
    options.AddPolicy("MyPolicy", policy =>
    {
        policy.WithOrigins("https://myapp.com", "https://staging.myapp.com")
              .AllowAnyMethod()
              .AllowAnyHeader()
              .AllowCredentials()
              .SetPreflightMaxAge(TimeSpan.FromMinutes(10));
    });
});

var app = builder.Build();

// Apply the CORS policy globally
app.UseCors("MyPolicy");
```

The general recommendation is to pick one approach and stick with it. If you configure CORS at both levels, you can end up with duplicate headers, which browsers will reject. Azure's documentation recommends removing all CORS rules from your app code if you want to use the platform-level feature, or removing all platform-level CORS origins if you handle it in code.

## Handling Preflight Requests

When a browser sends a cross-origin request that is not "simple" (meaning it uses methods other than GET/POST, or custom headers), it first sends a preflight OPTIONS request. This is the browser asking the server, "is this request allowed?"

If your CORS is configured at the Azure platform level, App Service handles preflight requests automatically. You do not need to add OPTIONS handlers to your API routes.

But if you configure CORS at the application level, make sure your middleware handles OPTIONS requests. Most frameworks do this automatically when you enable CORS, but it is worth verifying.

## Common Pitfalls

### Wildcard with Credentials

If you set the allowed origin to `*` and also set `supportCredentials` to `true`, requests will fail. The CORS specification does not allow this combination. If you need credentials, you must list specific origins.

### Missing the Protocol

Origins must include the protocol. `myapp.com` will not match - you need `https://myapp.com`. Also watch out for `www` vs non-`www` - `https://myapp.com` and `https://www.myapp.com` are different origins.

### Port Numbers Matter

`https://myapp.com` and `https://myapp.com:443` are technically the same (443 is the default HTTPS port), but `http://localhost:3000` and `http://localhost:5000` are different origins. During development, make sure you include the right port.

### Slot-Specific CORS Settings

If you use deployment slots, remember that CORS settings are slot-specific. Your staging slot might need different allowed origins than your production slot, especially if your staging frontend is on a different domain.

## Debugging CORS Issues

When CORS is not working, the browser console will show an error like "Access to fetch from origin X has been blocked by CORS policy." Here is how to debug it.

First, check the actual response headers using curl:

```bash
# Send a preflight request manually to see what headers come back
curl -I -X OPTIONS \
    -H "Origin: https://myapp.com" \
    -H "Access-Control-Request-Method: POST" \
    -H "Access-Control-Request-Headers: Content-Type,Authorization" \
    https://my-api-service.azurewebsites.net/api/data
```

Look at the response headers. You should see `Access-Control-Allow-Origin` matching your origin. If it is missing or wrong, your CORS configuration is not being applied correctly.

If you see duplicate `Access-Control-Allow-Origin` headers, that means CORS is configured at both the platform level and the application level. Remove one of them.

## Summary

CORS on Azure App Service is straightforward once you understand the moving parts. Use the platform-level configuration for simple cases where you just need to allow specific origins. Use application-level middleware when you need fine-grained control over headers, methods, and caching. And whatever you do, pick one approach - do not mix both.

For production deployments, always list specific origins rather than using the wildcard. It is a small effort that goes a long way toward keeping your API secure.
