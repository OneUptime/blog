# Validation Summary: How to Set Up JWT Authentication in ASP.NET Core

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- C#
- ASP.NET Core Web API
- ASP.NET Core authentication and authorization
- JWT bearer authentication
- Refresh tokens
- .NET CLI / NuGet package installation
- Azure Key Vault and User Secrets

## Sources Consulted
- Microsoft Learn: Configure JWT bearer authentication in ASP.NET Core - https://learn.microsoft.com/en-us/aspnet/core/security/authentication/configure-jwt-bearer-authentication
- Microsoft Learn: Create web APIs with ASP.NET Core - https://learn.microsoft.com/en-us/aspnet/core/web-api/
- Microsoft Learn: Policy-based authorization in ASP.NET Core - https://learn.microsoft.com/en-us/aspnet/core/security/authorization/policies
- Microsoft Learn: Role-based authorization in ASP.NET Core - https://learn.microsoft.com/en-us/aspnet/core/security/authorization/roles
- Microsoft Learn: dotnet package add command - https://learn.microsoft.com/en-us/dotnet/core/tools/dotnet-package-add
- Microsoft Learn: Dependency injection in requirement handlers in ASP.NET Core - https://learn.microsoft.com/en-us/aspnet/core/security/authorization/dependencyinjection
- IETF RFC 7519: JSON Web Token (JWT) - https://datatracker.ietf.org/doc/html/rfc7519

## Issues Found
- The installation commands used the older verb-first `dotnet add package` form. Updated them to the current .NET 10 noun-first `dotnet package add` form documented by Microsoft.
- The `appsettings.json` example was marked as C# and included a C#-style file comment. Changed the code fence to JSON and removed the comment so the snippet is valid JSON.
- The `Program.cs` setup mapped controllers with `app.MapControllers()` but did not register controller services. Added `builder.Services.AddControllers();` to match ASP.NET Core Web API setup guidance.
- The refresh token expiration setting was defined in configuration but the authentication service hard-coded `DateTime.UtcNow.AddDays(7)`. Injected `IOptions<JwtSettings>` into `AuthService` and used `_jwtSettings.RefreshTokenExpirationDays`.
- The custom authorization policy snippet referenced `ResourceOwnerRequirement`, which was not defined in the post. Removed that undefined policy registration so the snippet remains self-contained.
- The `MinimumAgeHandler` was defined but not registered with dependency injection. Added `builder.Services.AddSingleton<IAuthorizationHandler, MinimumAgeHandler>();`.
- The minimum-age calculation did not account for whether the user's birthday had occurred yet in the current year. Added the standard birthday adjustment used in Microsoft's policy authorization guidance.
- The secure secret storage snippet was marked as C# while it mixed a CLI command and C# configuration code. Changed the fence to `text` to avoid presenting the mixed snippet as compilable C#.

## Review Notes
The post is technically relevant and broadly accurate after the fixes. The examples still assume surrounding application types such as `User`, `AuthResult`, repositories, request DTOs, and `_userService` exist. Local compilation was not run because the .NET SDK is not installed in this environment. For a production hardening pass, consider hashing refresh tokens before storage and adding explicit model validation/error handling, but those are improvements rather than correctness fixes for this tutorial.
