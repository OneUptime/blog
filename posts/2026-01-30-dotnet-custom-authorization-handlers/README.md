# How to Build Custom Authorization Handlers in .NET

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: CSharp, ASP.NET, Security, Authorization

Description: Implement custom authorization handlers in ASP.NET Core for resource-based authorization, policy requirements, and dynamic permission checking.

---

ASP.NET Core's authorization system goes far beyond simple role checks. When you need fine-grained control over who can access what, custom authorization handlers give you the flexibility to implement any authorization logic you can think of. This post walks through building custom handlers from scratch, covering everything from basic requirements to complex resource-based scenarios.

## Understanding the Authorization Pipeline

Before writing code, let's understand how ASP.NET Core processes authorization requests. The pipeline consists of three main components:

| Component | Purpose | Interface |
|-----------|---------|-----------|
| Requirement | Defines what conditions must be met | `IAuthorizationRequirement` |
| Handler | Contains logic to evaluate requirements | `AuthorizationHandler<TRequirement>` |
| Policy | Groups one or more requirements together | Built via `AuthorizationPolicyBuilder` |

When you call `[Authorize(Policy = "SomePolicy")]`, the framework finds all requirements for that policy, then invokes every registered handler that can process each requirement. A requirement succeeds when at least one handler calls `context.Succeed(requirement)`.

## Creating Your First Custom Requirement

Requirements are simple marker classes that implement `IAuthorizationRequirement`. They hold any data needed to evaluate the authorization check.

Let's build a requirement that enforces a minimum account age:

```csharp
using Microsoft.AspNetCore.Authorization;

// Requirements are data containers - they define WHAT to check, not HOW
public class MinimumAccountAgeRequirement : IAuthorizationRequirement
{
    public int MinimumDays { get; }

    public MinimumAccountAgeRequirement(int minimumDays)
    {
        MinimumDays = minimumDays;
    }
}
```

Now the handler that evaluates this requirement:

```csharp
using Microsoft.AspNetCore.Authorization;
using System.Security.Claims;

public class MinimumAccountAgeHandler : AuthorizationHandler<MinimumAccountAgeRequirement>
{
    protected override Task HandleRequirementAsync(
        AuthorizationHandlerContext context,
        MinimumAccountAgeRequirement requirement)
    {
        // Find the account creation date claim
        var accountCreatedClaim = context.User.FindFirst("account_created");

        if (accountCreatedClaim == null)
        {
            // No claim means we can't verify - don't call Succeed or Fail
            // Another handler might be able to satisfy this requirement
            return Task.CompletedTask;
        }

        if (DateTime.TryParse(accountCreatedClaim.Value, out var createdDate))
        {
            var accountAge = DateTime.UtcNow - createdDate;

            if (accountAge.TotalDays >= requirement.MinimumDays)
            {
                // Requirement satisfied
                context.Succeed(requirement);
            }
        }

        return Task.CompletedTask;
    }
}
```

Register the handler and create a policy in `Program.cs`:

```csharp
builder.Services.AddSingleton<IAuthorizationHandler, MinimumAccountAgeHandler>();

builder.Services.AddAuthorization(options =>
{
    options.AddPolicy("EstablishedAccount", policy =>
        policy.Requirements.Add(new MinimumAccountAgeRequirement(30)));

    options.AddPolicy("VeteranAccount", policy =>
        policy.Requirements.Add(new MinimumAccountAgeRequirement(365)));
});
```

Apply it to a controller or action:

```csharp
[ApiController]
[Route("api/[controller]")]
public class PremiumFeaturesController : ControllerBase
{
    [HttpPost("create-community")]
    [Authorize(Policy = "EstablishedAccount")]
    public IActionResult CreateCommunity([FromBody] CommunityRequest request)
    {
        // Only accounts older than 30 days can create communities
        return Ok(new { message = "Community created" });
    }
}
```

## Resource-Based Authorization

Sometimes authorization depends on the specific resource being accessed. You might allow users to edit their own posts but not others'. This requires passing the resource to the authorization check.

First, define an operation-based requirement:

```csharp
// A requirement that carries operation information
public class DocumentOperationRequirement : IAuthorizationRequirement
{
    public string OperationName { get; }

    public DocumentOperationRequirement(string operationName)
    {
        OperationName = operationName;
    }
}

// Predefined operations for type safety
public static class DocumentOperations
{
    public static readonly DocumentOperationRequirement Read =
        new DocumentOperationRequirement("Read");
    public static readonly DocumentOperationRequirement Edit =
        new DocumentOperationRequirement("Edit");
    public static readonly DocumentOperationRequirement Delete =
        new DocumentOperationRequirement("Delete");
    public static readonly DocumentOperationRequirement Share =
        new DocumentOperationRequirement("Share");
}
```

The resource model:

```csharp
public class Document
{
    public int Id { get; set; }
    public string Title { get; set; } = string.Empty;
    public string OwnerId { get; set; } = string.Empty;
    public List<string> EditorIds { get; set; } = new();
    public List<string> ViewerIds { get; set; } = new();
    public bool IsPublic { get; set; }
    public DateTime CreatedAt { get; set; }
}
```

Now build a handler that checks permissions against the actual document:

```csharp
public class DocumentAuthorizationHandler :
    AuthorizationHandler<DocumentOperationRequirement, Document>
{
    protected override Task HandleRequirementAsync(
        AuthorizationHandlerContext context,
        DocumentOperationRequirement requirement,
        Document document)
    {
        var userId = context.User.FindFirst(ClaimTypes.NameIdentifier)?.Value;

        if (string.IsNullOrEmpty(userId))
        {
            return Task.CompletedTask;
        }

        // Check based on operation type
        var isAuthorized = requirement.OperationName switch
        {
            "Read" => CanRead(userId, document),
            "Edit" => CanEdit(userId, document),
            "Delete" => CanDelete(userId, document),
            "Share" => CanShare(userId, document),
            _ => false
        };

        if (isAuthorized)
        {
            context.Succeed(requirement);
        }

        return Task.CompletedTask;
    }

    private bool CanRead(string userId, Document doc)
    {
        // Public documents are readable by anyone
        if (doc.IsPublic) return true;

        // Owner, editors, and viewers can read
        return doc.OwnerId == userId ||
               doc.EditorIds.Contains(userId) ||
               doc.ViewerIds.Contains(userId);
    }

    private bool CanEdit(string userId, Document doc)
    {
        // Only owner and editors can edit
        return doc.OwnerId == userId || doc.EditorIds.Contains(userId);
    }

    private bool CanDelete(string userId, Document doc)
    {
        // Only owner can delete
        return doc.OwnerId == userId;
    }

    private bool CanShare(string userId, Document doc)
    {
        // Only owner can share
        return doc.OwnerId == userId;
    }
}
```

Use `IAuthorizationService` to perform resource-based checks in your controller:

```csharp
[ApiController]
[Route("api/[controller]")]
public class DocumentsController : ControllerBase
{
    private readonly IAuthorizationService _authorizationService;
    private readonly IDocumentRepository _documentRepository;

    public DocumentsController(
        IAuthorizationService authorizationService,
        IDocumentRepository documentRepository)
    {
        _authorizationService = authorizationService;
        _documentRepository = documentRepository;
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetDocument(int id)
    {
        var document = await _documentRepository.GetByIdAsync(id);

        if (document == null)
        {
            return NotFound();
        }

        // Pass the document as the resource to authorize against
        var authResult = await _authorizationService.AuthorizeAsync(
            User, document, DocumentOperations.Read);

        if (!authResult.Succeeded)
        {
            return Forbid();
        }

        return Ok(document);
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> UpdateDocument(
        int id,
        [FromBody] UpdateDocumentRequest request)
    {
        var document = await _documentRepository.GetByIdAsync(id);

        if (document == null)
        {
            return NotFound();
        }

        var authResult = await _authorizationService.AuthorizeAsync(
            User, document, DocumentOperations.Edit);

        if (!authResult.Succeeded)
        {
            return Forbid();
        }

        document.Title = request.Title;
        await _documentRepository.UpdateAsync(document);

        return Ok(document);
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteDocument(int id)
    {
        var document = await _documentRepository.GetByIdAsync(id);

        if (document == null)
        {
            return NotFound();
        }

        var authResult = await _authorizationService.AuthorizeAsync(
            User, document, DocumentOperations.Delete);

        if (!authResult.Succeeded)
        {
            return Forbid();
        }

        await _documentRepository.DeleteAsync(id);

        return NoContent();
    }
}
```

## Combining Multiple Requirements in a Policy

Policies can enforce multiple requirements. All requirements must succeed for the policy to pass (AND logic).

```csharp
// Requirement: User must have a verified email
public class VerifiedEmailRequirement : IAuthorizationRequirement { }

public class VerifiedEmailHandler : AuthorizationHandler<VerifiedEmailRequirement>
{
    protected override Task HandleRequirementAsync(
        AuthorizationHandlerContext context,
        VerifiedEmailRequirement requirement)
    {
        var emailVerifiedClaim = context.User.FindFirst("email_verified");

        if (emailVerifiedClaim != null &&
            bool.TryParse(emailVerifiedClaim.Value, out var isVerified) &&
            isVerified)
        {
            context.Succeed(requirement);
        }

        return Task.CompletedTask;
    }
}

// Requirement: User must have completed profile setup
public class CompleteProfileRequirement : IAuthorizationRequirement { }

public class CompleteProfileHandler : AuthorizationHandler<CompleteProfileRequirement>
{
    private readonly IUserProfileService _profileService;

    public CompleteProfileHandler(IUserProfileService profileService)
    {
        _profileService = profileService;
    }

    protected override async Task HandleRequirementAsync(
        AuthorizationHandlerContext context,
        CompleteProfileRequirement requirement)
    {
        var userId = context.User.FindFirst(ClaimTypes.NameIdentifier)?.Value;

        if (string.IsNullOrEmpty(userId))
        {
            return;
        }

        var profile = await _profileService.GetProfileAsync(userId);

        if (profile != null && profile.IsComplete)
        {
            context.Succeed(requirement);
        }
    }
}

// Requirement: User must have accepted terms of service
public class AcceptedTermsRequirement : IAuthorizationRequirement
{
    public int MinimumTermsVersion { get; }

    public AcceptedTermsRequirement(int minimumTermsVersion)
    {
        MinimumTermsVersion = minimumTermsVersion;
    }
}

public class AcceptedTermsHandler : AuthorizationHandler<AcceptedTermsRequirement>
{
    protected override Task HandleRequirementAsync(
        AuthorizationHandlerContext context,
        AcceptedTermsRequirement requirement)
    {
        var termsVersionClaim = context.User.FindFirst("terms_version_accepted");

        if (termsVersionClaim != null &&
            int.TryParse(termsVersionClaim.Value, out var version) &&
            version >= requirement.MinimumTermsVersion)
        {
            context.Succeed(requirement);
        }

        return Task.CompletedTask;
    }
}
```

Create a policy that combines all three requirements:

```csharp
builder.Services.AddAuthorization(options =>
{
    // User must meet ALL of these to access premium features
    options.AddPolicy("FullyOnboarded", policy =>
    {
        policy.RequireAuthenticatedUser();
        policy.Requirements.Add(new VerifiedEmailRequirement());
        policy.Requirements.Add(new CompleteProfileRequirement());
        policy.Requirements.Add(new AcceptedTermsRequirement(minimumTermsVersion: 2));
    });
});

// Register all handlers
builder.Services.AddScoped<IAuthorizationHandler, VerifiedEmailHandler>();
builder.Services.AddScoped<IAuthorizationHandler, CompleteProfileHandler>();
builder.Services.AddScoped<IAuthorizationHandler, AcceptedTermsHandler>();
```

## Multiple Handlers for One Requirement

You can register multiple handlers for the same requirement. This is useful when different conditions can satisfy the same requirement (OR logic).

```csharp
// Requirement: User needs premium access
public class PremiumAccessRequirement : IAuthorizationRequirement { }

// Handler 1: User has an active subscription
public class SubscriptionHandler : AuthorizationHandler<PremiumAccessRequirement>
{
    private readonly ISubscriptionService _subscriptionService;

    public SubscriptionHandler(ISubscriptionService subscriptionService)
    {
        _subscriptionService = subscriptionService;
    }

    protected override async Task HandleRequirementAsync(
        AuthorizationHandlerContext context,
        PremiumAccessRequirement requirement)
    {
        var userId = context.User.FindFirst(ClaimTypes.NameIdentifier)?.Value;

        if (string.IsNullOrEmpty(userId))
        {
            return;
        }

        var hasActiveSubscription = await _subscriptionService
            .HasActiveSubscriptionAsync(userId);

        if (hasActiveSubscription)
        {
            context.Succeed(requirement);
        }
    }
}

// Handler 2: User is an employee (gets free premium)
public class EmployeeHandler : AuthorizationHandler<PremiumAccessRequirement>
{
    protected override Task HandleRequirementAsync(
        AuthorizationHandlerContext context,
        PremiumAccessRequirement requirement)
    {
        var emailClaim = context.User.FindFirst(ClaimTypes.Email)?.Value;

        if (!string.IsNullOrEmpty(emailClaim) &&
            emailClaim.EndsWith("@ourcompany.com"))
        {
            context.Succeed(requirement);
        }

        return Task.CompletedTask;
    }
}

// Handler 3: User has been granted a trial
public class TrialHandler : AuthorizationHandler<PremiumAccessRequirement>
{
    protected override Task HandleRequirementAsync(
        AuthorizationHandlerContext context,
        PremiumAccessRequirement requirement)
    {
        var trialExpiresClaim = context.User.FindFirst("trial_expires");

        if (trialExpiresClaim != null &&
            DateTime.TryParse(trialExpiresClaim.Value, out var expiresAt) &&
            expiresAt > DateTime.UtcNow)
        {
            context.Succeed(requirement);
        }

        return Task.CompletedTask;
    }
}
```

Register all three handlers:

```csharp
// Any ONE of these handlers succeeding grants premium access
builder.Services.AddScoped<IAuthorizationHandler, SubscriptionHandler>();
builder.Services.AddScoped<IAuthorizationHandler, EmployeeHandler>();
builder.Services.AddScoped<IAuthorizationHandler, TrialHandler>();

builder.Services.AddAuthorization(options =>
{
    options.AddPolicy("PremiumAccess", policy =>
        policy.Requirements.Add(new PremiumAccessRequirement()));
});
```

## Handler Ordering and Execution Behavior

Understanding how handlers execute is important for performance and correctness.

| Behavior | Description |
|----------|-------------|
| All handlers run | By default, every registered handler runs even if one has already succeeded |
| First success wins | A requirement passes as soon as any handler calls `Succeed` |
| Explicit failure | Calling `Fail()` immediately fails the entire authorization, regardless of other handlers |
| No action = pending | Not calling `Succeed` or `Fail` leaves the requirement unsatisfied by that handler |

Here's how to implement short-circuit behavior with explicit failure:

```csharp
public class BlockedUserHandler : AuthorizationHandler<PremiumAccessRequirement>
{
    private readonly IUserService _userService;

    public BlockedUserHandler(IUserService userService)
    {
        _userService = userService;
    }

    protected override async Task HandleRequirementAsync(
        AuthorizationHandlerContext context,
        PremiumAccessRequirement requirement)
    {
        var userId = context.User.FindFirst(ClaimTypes.NameIdentifier)?.Value;

        if (string.IsNullOrEmpty(userId))
        {
            return;
        }

        var user = await _userService.GetUserAsync(userId);

        // If user is blocked, fail immediately - no other handler can override this
        if (user != null && user.IsBlocked)
        {
            context.Fail(new AuthorizationFailureReason(this, "User is blocked"));
        }
    }
}
```

To control handler ordering, you can use a custom handler that wraps execution:

```csharp
// Priority-based handler wrapper
public class PriorityAuthorizationHandler<TRequirement> : AuthorizationHandler<TRequirement>
    where TRequirement : IAuthorizationRequirement
{
    private readonly IEnumerable<IPriorityHandler<TRequirement>> _handlers;

    public PriorityAuthorizationHandler(
        IEnumerable<IPriorityHandler<TRequirement>> handlers)
    {
        // Order by priority - lower numbers run first
        _handlers = handlers.OrderBy(h => h.Priority);
    }

    protected override async Task HandleRequirementAsync(
        AuthorizationHandlerContext context,
        TRequirement requirement)
    {
        foreach (var handler in _handlers)
        {
            await handler.HandleAsync(context, requirement);

            // Stop if requirement is already satisfied or explicitly failed
            if (context.HasSucceeded || context.HasFailed)
            {
                break;
            }
        }
    }
}

public interface IPriorityHandler<TRequirement>
    where TRequirement : IAuthorizationRequirement
{
    int Priority { get; }
    Task HandleAsync(AuthorizationHandlerContext context, TRequirement requirement);
}
```

## Dynamic Permission Checking with Custom Handlers

For applications with dynamic permissions stored in a database, you can build a flexible permission system:

```csharp
// Generic permission requirement
public class PermissionRequirement : IAuthorizationRequirement
{
    public string Permission { get; }

    public PermissionRequirement(string permission)
    {
        Permission = permission;
    }
}

// Permission handler that checks against a database
public class DatabasePermissionHandler : AuthorizationHandler<PermissionRequirement>
{
    private readonly IPermissionService _permissionService;
    private readonly ILogger<DatabasePermissionHandler> _logger;

    public DatabasePermissionHandler(
        IPermissionService permissionService,
        ILogger<DatabasePermissionHandler> logger)
    {
        _permissionService = permissionService;
        _logger = logger;
    }

    protected override async Task HandleRequirementAsync(
        AuthorizationHandlerContext context,
        PermissionRequirement requirement)
    {
        var userId = context.User.FindFirst(ClaimTypes.NameIdentifier)?.Value;

        if (string.IsNullOrEmpty(userId))
        {
            _logger.LogDebug("No user ID found in claims");
            return;
        }

        try
        {
            var hasPermission = await _permissionService
                .UserHasPermissionAsync(userId, requirement.Permission);

            if (hasPermission)
            {
                _logger.LogDebug(
                    "User {UserId} granted permission {Permission}",
                    userId,
                    requirement.Permission);
                context.Succeed(requirement);
            }
            else
            {
                _logger.LogDebug(
                    "User {UserId} denied permission {Permission}",
                    userId,
                    requirement.Permission);
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(
                ex,
                "Error checking permission {Permission} for user {UserId}",
                requirement.Permission,
                userId);
            // Don't call Fail() on transient errors - let the request fail gracefully
        }
    }
}

// Permission service interface
public interface IPermissionService
{
    Task<bool> UserHasPermissionAsync(string userId, string permission);
    Task<IEnumerable<string>> GetUserPermissionsAsync(string userId);
}

// Sample implementation with caching
public class CachedPermissionService : IPermissionService
{
    private readonly IPermissionRepository _repository;
    private readonly IMemoryCache _cache;
    private readonly TimeSpan _cacheDuration = TimeSpan.FromMinutes(5);

    public CachedPermissionService(
        IPermissionRepository repository,
        IMemoryCache cache)
    {
        _repository = repository;
        _cache = cache;
    }

    public async Task<bool> UserHasPermissionAsync(string userId, string permission)
    {
        var permissions = await GetUserPermissionsAsync(userId);
        return permissions.Contains(permission);
    }

    public async Task<IEnumerable<string>> GetUserPermissionsAsync(string userId)
    {
        var cacheKey = $"permissions:{userId}";

        if (_cache.TryGetValue(cacheKey, out IEnumerable<string>? permissions) &&
            permissions != null)
        {
            return permissions;
        }

        permissions = await _repository.GetPermissionsForUserAsync(userId);

        _cache.Set(cacheKey, permissions, _cacheDuration);

        return permissions;
    }
}
```

Create policies dynamically for each permission:

```csharp
// Extension method to add permission policies
public static class AuthorizationOptionsExtensions
{
    public static AuthorizationOptions AddPermissionPolicies(
        this AuthorizationOptions options,
        params string[] permissions)
    {
        foreach (var permission in permissions)
        {
            options.AddPolicy(
                $"Permission:{permission}",
                policy => policy.Requirements.Add(new PermissionRequirement(permission)));
        }

        return options;
    }
}

// Usage in Program.cs
builder.Services.AddAuthorization(options =>
{
    options.AddPermissionPolicies(
        "users.read",
        "users.write",
        "users.delete",
        "reports.generate",
        "settings.modify",
        "billing.manage"
    );
});
```

Apply permission-based authorization:

```csharp
[ApiController]
[Route("api/[controller]")]
public class UsersController : ControllerBase
{
    [HttpGet]
    [Authorize(Policy = "Permission:users.read")]
    public async Task<IActionResult> GetUsers()
    {
        // Only users with users.read permission
        return Ok();
    }

    [HttpPost]
    [Authorize(Policy = "Permission:users.write")]
    public async Task<IActionResult> CreateUser([FromBody] CreateUserRequest request)
    {
        // Only users with users.write permission
        return Ok();
    }

    [HttpDelete("{id}")]
    [Authorize(Policy = "Permission:users.delete")]
    public async Task<IActionResult> DeleteUser(int id)
    {
        // Only users with users.delete permission
        return Ok();
    }
}
```

## Testing Authorization Handlers

Unit testing handlers is straightforward. Create a mock context and verify the outcome:

```csharp
using Microsoft.AspNetCore.Authorization;
using System.Security.Claims;
using Xunit;

public class MinimumAccountAgeHandlerTests
{
    [Fact]
    public async Task HandleAsync_AccountOldEnough_Succeeds()
    {
        // Arrange
        var handler = new MinimumAccountAgeHandler();
        var requirement = new MinimumAccountAgeRequirement(30);

        var claims = new[]
        {
            new Claim(ClaimTypes.NameIdentifier, "user123"),
            new Claim("account_created", DateTime.UtcNow.AddDays(-60).ToString("O"))
        };

        var identity = new ClaimsIdentity(claims, "TestAuth");
        var principal = new ClaimsPrincipal(identity);
        var context = new AuthorizationHandlerContext(
            new[] { requirement },
            principal,
            resource: null);

        // Act
        await handler.HandleAsync(context);

        // Assert
        Assert.True(context.HasSucceeded);
    }

    [Fact]
    public async Task HandleAsync_AccountTooNew_DoesNotSucceed()
    {
        // Arrange
        var handler = new MinimumAccountAgeHandler();
        var requirement = new MinimumAccountAgeRequirement(30);

        var claims = new[]
        {
            new Claim(ClaimTypes.NameIdentifier, "user123"),
            new Claim("account_created", DateTime.UtcNow.AddDays(-10).ToString("O"))
        };

        var identity = new ClaimsIdentity(claims, "TestAuth");
        var principal = new ClaimsPrincipal(identity);
        var context = new AuthorizationHandlerContext(
            new[] { requirement },
            principal,
            resource: null);

        // Act
        await handler.HandleAsync(context);

        // Assert
        Assert.False(context.HasSucceeded);
    }

    [Fact]
    public async Task HandleAsync_NoAccountCreatedClaim_DoesNotSucceed()
    {
        // Arrange
        var handler = new MinimumAccountAgeHandler();
        var requirement = new MinimumAccountAgeRequirement(30);

        var claims = new[]
        {
            new Claim(ClaimTypes.NameIdentifier, "user123")
        };

        var identity = new ClaimsIdentity(claims, "TestAuth");
        var principal = new ClaimsPrincipal(identity);
        var context = new AuthorizationHandlerContext(
            new[] { requirement },
            principal,
            resource: null);

        // Act
        await handler.HandleAsync(context);

        // Assert
        Assert.False(context.HasSucceeded);
        Assert.False(context.HasFailed); // Important: didn't explicitly fail
    }
}
```

For resource-based handlers:

```csharp
public class DocumentAuthorizationHandlerTests
{
    [Fact]
    public async Task HandleAsync_OwnerCanDelete_Succeeds()
    {
        // Arrange
        var handler = new DocumentAuthorizationHandler();
        var requirement = DocumentOperations.Delete;

        var userId = "user123";
        var document = new Document
        {
            Id = 1,
            Title = "Test Doc",
            OwnerId = userId
        };

        var claims = new[]
        {
            new Claim(ClaimTypes.NameIdentifier, userId)
        };

        var identity = new ClaimsIdentity(claims, "TestAuth");
        var principal = new ClaimsPrincipal(identity);
        var context = new AuthorizationHandlerContext(
            new[] { requirement },
            principal,
            document); // Pass the resource

        // Act
        await handler.HandleAsync(context);

        // Assert
        Assert.True(context.HasSucceeded);
    }

    [Fact]
    public async Task HandleAsync_NonOwnerCannotDelete_Fails()
    {
        // Arrange
        var handler = new DocumentAuthorizationHandler();
        var requirement = DocumentOperations.Delete;

        var document = new Document
        {
            Id = 1,
            Title = "Test Doc",
            OwnerId = "owner123"
        };

        var claims = new[]
        {
            new Claim(ClaimTypes.NameIdentifier, "differentUser")
        };

        var identity = new ClaimsIdentity(claims, "TestAuth");
        var principal = new ClaimsPrincipal(identity);
        var context = new AuthorizationHandlerContext(
            new[] { requirement },
            principal,
            document);

        // Act
        await handler.HandleAsync(context);

        // Assert
        Assert.False(context.HasSucceeded);
    }
}
```

## Summary

Custom authorization handlers provide a clean separation between authorization logic and your controllers. The key takeaways:

- **Requirements define what to check** - keep them as simple data containers
- **Handlers define how to check** - put all your authorization logic here
- **Policies group requirements** - all requirements must pass (AND logic)
- **Multiple handlers per requirement** - any handler can satisfy it (OR logic)
- **Resource-based authorization** - pass the resource to `IAuthorizationService.AuthorizeAsync`
- **Explicit failure stops everything** - use `context.Fail()` only when you need to block all other handlers

This approach scales well from simple role checks to complex, database-driven permission systems. Start with basic requirements and handlers, then add complexity only when needed.
