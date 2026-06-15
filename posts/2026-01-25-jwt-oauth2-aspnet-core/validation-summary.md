# Validation Summary: How to Implement JWT and OAuth2 in ASP.NET Core

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- ASP.NET Core
- C#
- JWT bearer authentication
- OAuth 2.0 external authentication providers
- Google authentication
- GitHub authentication
- ASP.NET Core authorization policies and handlers
- .NET CLI / NuGet package installation

## Sources Consulted
- Microsoft Learn: Configure JWT bearer authentication in ASP.NET Core - https://learn.microsoft.com/en-us/aspnet/core/security/authentication/configure-jwt-bearer-authentication
- Microsoft Learn: Overview of ASP.NET Core authentication - https://learn.microsoft.com/en-us/aspnet/core/security/authentication/
- Microsoft Learn: Google external login setup in ASP.NET Core - https://learn.microsoft.com/en-us/aspnet/core/security/authentication/social/google-logins
- Microsoft Learn: External provider authentication in ASP.NET Core Identity - https://learn.microsoft.com/en-us/aspnet/core/security/authentication/social/
- Microsoft Learn: RemoteAuthenticationOptions.SignInScheme - https://learn.microsoft.com/en-us/dotnet/api/microsoft.aspnetcore.authentication.remoteauthenticationoptions.signinscheme
- Microsoft Learn: Policy-based authorization in ASP.NET Core - https://learn.microsoft.com/en-us/aspnet/core/security/authorization/policies
- Microsoft Learn: dotnet package add - https://learn.microsoft.com/en-us/dotnet/core/tools/dotnet-package-add
- IETF RFC 7519: JSON Web Token (JWT) - https://datatracker.ietf.org/doc/html/rfc7519
- AspNet.Security.OAuth.Providers project documentation - https://github.com/aspnet-contrib/AspNet.Security.OAuth.Providers

## Issues Found
- Updated NuGet installation commands from the older `dotnet add package` form to the current `dotnet package add` form shown in current Microsoft .NET CLI documentation.
- Added `builder.Services.AddHttpContextAccessor();` before registering the custom authorization handler because the sample handler injects `IHttpContextAccessor`.
- Fixed the external OAuth provider flow by adding an external cookie sign-in scheme and setting `options.SignInScheme = "External"` for Google and GitHub. ASP.NET Core remote authentication handlers persist the external identity through a sign-in scheme, typically a cookie.
- Changed the Google and GitHub callback examples to read the authenticated external principal from the external cookie scheme instead of calling `AuthenticateAsync` on the provider scheme directly.
- Added sign-out of the external cookie after issuing local JWT/refresh tokens to avoid leaving a stale temporary external principal.
- Corrected an inaccurate comment that described reading an `access_token` cookie as "refresh token" cookie handling.

## Review Notes
- The article demonstrates hand-issued JWT access tokens for an application-controlled auth flow. Current Microsoft guidance recommends standards-based OAuth/OIDC token issuance for many production systems, especially when interoperating beyond a closed system.
- Redirecting access and refresh tokens in query strings is called out in the post as not production-ready. A production implementation should use a safer delivery mechanism, such as a backend session or secure HttpOnly cookies depending on the app architecture.
- The updated `dotnet package add` command is the current .NET 10+ noun-first form. Projects pinned to .NET 9 SDK or earlier should use the older verb-first `dotnet add package` form.
