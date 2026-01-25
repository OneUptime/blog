# How to Implement Feature Toggles in .NET

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: .NET, C#, Feature Toggles, Feature Flags, Configuration

Description: Learn how to implement feature toggles in .NET applications using Microsoft.FeatureManagement. This guide covers basic toggles, percentage rollouts, time-based windows, and custom filters for controlled feature releases.

---

Feature toggles (also called feature flags) let you turn features on or off without redeploying your application. They are essential for trunk-based development, A/B testing, canary releases, and gradual rollouts. In .NET, the Microsoft.FeatureManagement library provides a robust, configuration-driven approach to managing feature toggles.

## Why Use Feature Toggles?

| Use Case | Benefit |
|----------|---------|
| **Continuous Deployment** | Deploy incomplete features safely |
| **A/B Testing** | Test variations with user segments |
| **Kill Switches** | Disable problematic features instantly |
| **Gradual Rollout** | Release to 1%, then 10%, then 100% |
| **Environment-Specific** | Enable features only in staging |

## Setting Up Microsoft.FeatureManagement

First, install the NuGet package:

```bash
dotnet add package Microsoft.FeatureManagement.AspNetCore
```

Configure feature management in your `Program.cs`:

```csharp
using Microsoft.FeatureManagement;

var builder = WebApplication.CreateBuilder(args);

// Add feature management services
builder.Services.AddFeatureManagement();

builder.Services.AddControllers();

var app = builder.Build();

app.MapControllers();
app.Run();
```

## Basic Feature Toggle Configuration

Define your features in `appsettings.json`:

```json
{
  "FeatureManagement": {
    "NewDashboard": true,
    "BetaFeatures": false,
    "ExperimentalApi": true
  }
}
```

## Using Feature Toggles in Code

### Injecting IFeatureManager

The most flexible approach is injecting `IFeatureManager` into your services:

```csharp
public class OrderService
{
    private readonly IFeatureManager _featureManager;
    private readonly ILogger<OrderService> _logger;

    public OrderService(
        IFeatureManager featureManager,
        ILogger<OrderService> logger)
    {
        _featureManager = featureManager;
        _logger = logger;
    }

    public async Task<OrderResult> ProcessOrderAsync(Order order)
    {
        // Check if the new processing algorithm is enabled
        if (await _featureManager.IsEnabledAsync("NewOrderProcessing"))
        {
            _logger.LogInformation("Using new order processing for order {OrderId}", order.Id);
            return await ProcessWithNewAlgorithmAsync(order);
        }

        // Fall back to the existing implementation
        return await ProcessWithLegacyAlgorithmAsync(order);
    }

    private async Task<OrderResult> ProcessWithNewAlgorithmAsync(Order order)
    {
        // New implementation with improved performance
        await Task.Delay(10); // Simulate processing
        return new OrderResult { Success = true, ProcessingMethod = "NewAlgorithm" };
    }

    private async Task<OrderResult> ProcessWithLegacyAlgorithmAsync(Order order)
    {
        // Original implementation
        await Task.Delay(50); // Simulate slower processing
        return new OrderResult { Success = true, ProcessingMethod = "Legacy" };
    }
}
```

### Using Feature Filters in Controllers

Apply feature toggles at the controller or action level using the `FeatureGate` attribute:

```csharp
using Microsoft.AspNetCore.Mvc;
using Microsoft.FeatureManagement.Mvc;

[ApiController]
[Route("api/[controller]")]
public class ReportsController : ControllerBase
{
    // This entire controller is gated behind the BetaFeatures flag
    [FeatureGate("BetaFeatures")]
    [HttpGet("advanced")]
    public IActionResult GetAdvancedReports()
    {
        return Ok(new { Report = "Advanced analytics data" });
    }

    // Always available endpoint
    [HttpGet("basic")]
    public IActionResult GetBasicReports()
    {
        return Ok(new { Report = "Basic report data" });
    }
}
```

When the feature is disabled, the endpoint returns a 404 Not Found by default.

## Percentage-Based Rollouts

Roll out features gradually using the built-in `Percentage` filter:

```json
{
  "FeatureManagement": {
    "NewCheckoutFlow": {
      "EnabledFor": [
        {
          "Name": "Percentage",
          "Parameters": {
            "Value": 25
          }
        }
      ]
    }
  }
}
```

This enables the feature for approximately 25% of requests. The percentage is determined consistently using a hash, so the same user sees consistent behavior within a session.

## Time-Based Feature Windows

Enable features during specific time windows:

```json
{
  "FeatureManagement": {
    "HolidayPromotion": {
      "EnabledFor": [
        {
          "Name": "TimeWindow",
          "Parameters": {
            "Start": "2026-12-20T00:00:00Z",
            "End": "2026-12-31T23:59:59Z"
          }
        }
      ]
    }
  }
}
```

Register the time window filter:

```csharp
builder.Services.AddFeatureManagement()
    .AddFeatureFilter<TimeWindowFilter>();
```

## Building Custom Feature Filters

Create custom filters for complex targeting scenarios, such as enabling features for specific user groups:

```csharp
using Microsoft.FeatureManagement;

// Define the filter settings
public class UserGroupFilterSettings
{
    public string[] AllowedGroups { get; set; } = Array.Empty<string>();
}

// Implement the feature filter
[FilterAlias("UserGroup")]
public class UserGroupFilter : IFeatureFilter
{
    private readonly IHttpContextAccessor _httpContextAccessor;

    public UserGroupFilter(IHttpContextAccessor httpContextAccessor)
    {
        _httpContextAccessor = httpContextAccessor;
    }

    public Task<bool> EvaluateAsync(FeatureFilterEvaluationContext context)
    {
        // Bind configuration to settings object
        var settings = context.Parameters.Get<UserGroupFilterSettings>();

        if (settings?.AllowedGroups == null || settings.AllowedGroups.Length == 0)
        {
            return Task.FromResult(false);
        }

        // Get the current user's group from claims
        var httpContext = _httpContextAccessor.HttpContext;
        var userGroup = httpContext?.User?.FindFirst("group")?.Value;

        if (string.IsNullOrEmpty(userGroup))
        {
            return Task.FromResult(false);
        }

        // Check if user belongs to any allowed group
        var isEnabled = settings.AllowedGroups.Contains(userGroup, StringComparer.OrdinalIgnoreCase);
        return Task.FromResult(isEnabled);
    }
}
```

Register the custom filter:

```csharp
builder.Services.AddHttpContextAccessor();
builder.Services.AddFeatureManagement()
    .AddFeatureFilter<UserGroupFilter>();
```

Configure the filter in `appsettings.json`:

```json
{
  "FeatureManagement": {
    "PremiumFeatures": {
      "EnabledFor": [
        {
          "Name": "UserGroup",
          "Parameters": {
            "AllowedGroups": ["premium", "enterprise", "beta-testers"]
          }
        }
      ]
    }
  }
}
```

## Feature Toggle with Contextual Targeting

For more sophisticated targeting that considers user context:

```csharp
using Microsoft.FeatureManagement;
using Microsoft.FeatureManagement.FeatureFilters;

// Configure targeting in appsettings.json
// "NewFeature": {
//   "EnabledFor": [
//     {
//       "Name": "Targeting",
//       "Parameters": {
//         "Audience": {
//           "Users": ["user1@example.com", "user2@example.com"],
//           "Groups": [
//             { "Name": "BetaUsers", "RolloutPercentage": 100 },
//             { "Name": "AllUsers", "RolloutPercentage": 10 }
//           ],
//           "DefaultRolloutPercentage": 5
//         }
//       }
//     }
//   ]
// }

public class TargetingContextAccessor : ITargetingContextAccessor
{
    private readonly IHttpContextAccessor _httpContextAccessor;

    public TargetingContextAccessor(IHttpContextAccessor httpContextAccessor)
    {
        _httpContextAccessor = httpContextAccessor;
    }

    public ValueTask<TargetingContext> GetContextAsync()
    {
        var httpContext = _httpContextAccessor.HttpContext;

        // Extract user identity and groups from the current request
        var userId = httpContext?.User?.Identity?.Name ?? "anonymous";
        var groups = httpContext?.User?.Claims
            .Where(c => c.Type == "group")
            .Select(c => c.Value)
            .ToList() ?? new List<string>();

        var context = new TargetingContext
        {
            UserId = userId,
            Groups = groups
        };

        return new ValueTask<TargetingContext>(context);
    }
}
```

Register targeting:

```csharp
builder.Services.AddHttpContextAccessor();
builder.Services.AddFeatureManagement()
    .WithTargeting<TargetingContextAccessor>();
```

## Feature Toggle in Razor Views

Enable or disable UI elements based on features:

```csharp
// In _ViewImports.cshtml
@addTagHelper *, Microsoft.FeatureManagement.AspNetCore
```

```html
<!-- In your Razor view -->
<feature name="NewDashboard">
    <div class="new-dashboard">
        <h2>Welcome to the New Dashboard</h2>
        <!-- New dashboard content -->
    </div>
</feature>

<feature name="NewDashboard" negate="true">
    <div class="classic-dashboard">
        <h2>Dashboard</h2>
        <!-- Original dashboard content -->
    </div>
</feature>
```

## Combining Multiple Filters

Apply multiple conditions that must all be satisfied:

```json
{
  "FeatureManagement": {
    "ExclusiveBetaFeature": {
      "RequirementType": "All",
      "EnabledFor": [
        {
          "Name": "UserGroup",
          "Parameters": {
            "AllowedGroups": ["beta-testers"]
          }
        },
        {
          "Name": "TimeWindow",
          "Parameters": {
            "Start": "2026-01-01T00:00:00Z",
            "End": "2026-06-30T23:59:59Z"
          }
        }
      ]
    }
  }
}
```

Or use "Any" to enable if at least one condition matches:

```json
{
  "FeatureManagement": {
    "SpecialAccess": {
      "RequirementType": "Any",
      "EnabledFor": [
        {
          "Name": "UserGroup",
          "Parameters": {
            "AllowedGroups": ["admins"]
          }
        },
        {
          "Name": "UserGroup",
          "Parameters": {
            "AllowedGroups": ["premium"]
          }
        }
      ]
    }
  }
}
```

## Dynamic Configuration with Azure App Configuration

For production environments, store feature flags in Azure App Configuration for dynamic updates:

```bash
dotnet add package Microsoft.Azure.AppConfiguration.AspNetCore
dotnet add package Microsoft.FeatureManagement.AspNetCore
```

```csharp
var builder = WebApplication.CreateBuilder(args);

// Connect to Azure App Configuration
builder.Configuration.AddAzureAppConfiguration(options =>
{
    options.Connect(builder.Configuration["ConnectionStrings:AppConfig"])
           .UseFeatureFlags(featureOptions =>
           {
               // Refresh feature flags every 30 seconds
               featureOptions.CacheExpirationInterval = TimeSpan.FromSeconds(30);
           });
});

builder.Services.AddAzureAppConfiguration();
builder.Services.AddFeatureManagement();

var app = builder.Build();

// Enable dynamic configuration refresh
app.UseAzureAppConfiguration();

app.MapControllers();
app.Run();
```

## Best Practices

1. **Name features clearly**: Use descriptive names like `NewCheckoutFlow` instead of `Feature1`
2. **Clean up old toggles**: Remove toggles once features are fully rolled out
3. **Document toggle ownership**: Track who owns each toggle and when it should be removed
4. **Test both states**: Ensure your application works with the feature on and off
5. **Use short-lived toggles**: Aim to remove toggles within weeks, not months

## Summary

| Feature | Use Case |
|---------|----------|
| **Basic Toggle** | Simple on/off switches |
| **Percentage Filter** | Gradual rollouts |
| **Time Window** | Scheduled features |
| **User Group Filter** | Segment-based targeting |
| **Targeting** | Complex audience rules |

Feature toggles give you control over your releases without code changes. With Microsoft.FeatureManagement, you get a clean, testable approach that integrates naturally with ASP.NET Core configuration. Start with simple toggles and add complexity only when your deployment strategy demands it.
