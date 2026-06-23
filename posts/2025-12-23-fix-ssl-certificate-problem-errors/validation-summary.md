# Validation Summary: How to Fix SSL Certificate Problem Errors in .NET

## Status
validated

## Post Type
Tutorial / Troubleshooting guide

## Technologies Covered
- .NET 8 / .NET 6+
- C#
- `System.Net.Http` (`HttpClient`, `HttpClientHandler`, `SocketsHttpHandler`)
- `System.Security.Cryptography.X509Certificates` (`X509Certificate2`, `X509Chain`, `X509Store`)
- `System.Net.Security` (`SslClientAuthenticationOptions`, `SslPolicyErrors`, `RemoteCertificateValidationCallback`)
- `IHttpClientFactory` / dependency injection
- TLS 1.2 / TLS 1.3
- Docker (`update-ca-certificates`)
- Mutual TLS (client certificates)

## Sources Consulted
- HttpClientHandler.ServerCertificateCustomValidationCallback — https://learn.microsoft.com/en-us/dotnet/api/system.net.http.httpclienthandler.servercertificatecustomvalidationcallback
- HttpClientHandler.DangerousAcceptAnyServerCertificateValidator — https://learn.microsoft.com/en-us/dotnet/api/system.net.http.httpclienthandler.dangerousacceptanyservercertificatevalidator
- SocketsHttpHandler.SslOptions / SslClientAuthenticationOptions — https://learn.microsoft.com/en-us/dotnet/api/system.net.security.sslclientauthenticationoptions
- X509Chain.Build / ChainPolicy.ExtraStore — https://learn.microsoft.com/en-us/dotnet/api/system.security.cryptography.x509certificates.x509chain
- X509Store — https://learn.microsoft.com/en-us/dotnet/api/system.security.cryptography.x509certificates.x509store
- SslPolicyErrors enum — https://learn.microsoft.com/en-us/dotnet/api/system.net.security.sslpolicyerrors
- Runtime config / compatibility switches (UseSocketsHttpHandler) — https://learn.microsoft.com/en-us/dotnet/core/runtime-config/networking
- Make HTTP requests with IHttpClientFactory — https://learn.microsoft.com/en-us/dotnet/core/extensions/httpclient-factory

## Issues Found
- **Misleading comment on the `AppContext.SetSwitch` line (TLS Version Configuration section).** The original comment read `// Set minimum TLS version globally` above `AppContext.SetSwitch("System.Net.Http.UseSocketsHttpHandler", true);`. That switch selects the `SocketsHttpHandler` implementation (which is already the default on .NET Core 2.1+); it does not configure the TLS version. Changed the comment to accurately describe the switch, and relabeled the following `HttpClientHandler.SslProtocols` snippet as the actual mechanism for setting allowed TLS versions per handler. No code behavior changed.

## Review Notes
- All API surfaces used (`ServerCertificateCustomValidationCallback`, `DangerousAcceptAnyServerCertificateValidator`, `SslClientAuthenticationOptions.EnabledSslProtocols`, `CertificateRevocationCheckMode`, `RemoteCertificateValidationCallback`, `HttpClientHandler.SslProtocols`, `X509Store`, `ChainPolicy.ExtraStore`) are valid and current for .NET 8.
- The post targets .NET 8 (Docker base image `mcr.microsoft.com/dotnet/aspnet:8.0`). On .NET 9+ the `new X509Certificate2(path)` / `(path, password)` constructors become obsolete (SYSLIB0057) in favor of `X509CertificateLoader`. The code is correct for .NET 8 but readers on .NET 9+ should prefer `X509CertificateLoader`. Left unchanged since it is accurate for the version the post targets.
- The "Complete Secure Configuration" example calls `builder.Services.BuildServiceProvider()` during registration to resolve a logger. This works but is a recognized DI anti-pattern (it builds a second container). It is a design caveat, not a correctness error, so it was left as written.
- The custom validation callbacks that rebuild/relax chains (intermediate, hostname-mismatch, thumbprint pinning) are presented appropriately with security warnings and "never bypass in production" guidance; the logic is sound for the stated narrow use cases.
