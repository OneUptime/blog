# Validation Summary: How to Configure ASP.NET Core for IPv6

## Status
validated

## Post Type
Guide

## Technologies Covered
- ASP.NET Core
- Kestrel
- C#
- IPv6
- Forwarded Headers Middleware
- CORS
- curl

## Sources Consulted
- Microsoft Learn: Configure endpoints for the ASP.NET Core Kestrel web server — https://learn.microsoft.com/en-us/aspnet/core/fundamentals/servers/kestrel/endpoints?view=aspnetcore-10.0
- Microsoft Learn: Configure ASP.NET Core to work with proxy servers and load balancers — https://learn.microsoft.com/en-us/aspnet/core/host-and-deploy/proxy-load-balancer?view=aspnetcore-10.0
- Microsoft Learn: IPNetwork and ForwardedHeadersOptions.KnownNetworks are obsolete — https://learn.microsoft.com/en-us/aspnet/core/breaking-changes/10/ipnetwork-knownnetworks-obsolete?view=aspnetcore-10.0
- Microsoft Learn API reference: KestrelServerOptions.ListenAnyIP — https://learn.microsoft.com/en-us/dotnet/api/microsoft.aspnetcore.server.kestrel.core.kestrelserveroptions.listenanyip?view=aspnetcore-10.0
- Microsoft Learn API reference: ForwardedHeadersOptions.KnownIPNetworks — https://learn.microsoft.com/en-us/dotnet/api/microsoft.aspnetcore.builder.forwardedheadersoptions.knownipnetworks?view=aspnetcore-10.0
- Microsoft Learn API reference: ConnectionInfo.RemoteIpAddress — https://learn.microsoft.com/en-us/dotnet/api/microsoft.aspnetcore.http.connectioninfo.remoteipaddress?view=aspnetcore-10.0
- Microsoft Learn API reference: IPAddress.IsLoopback — https://learn.microsoft.com/en-us/dotnet/api/system.net.ipaddress.isloopback?view=net-10.0
- Microsoft Learn: Enable Cross-Origin Requests (CORS) in ASP.NET Core — https://learn.microsoft.com/en-us/aspnet/core/security/cors?view=aspnetcore-10.0
- RFC 3986: Uniform Resource Identifier (URI): Generic Syntax — https://www.rfc-editor.org/rfc/rfc3986.html
- RFC 3849: IPv6 Address Prefix Reserved for Documentation — https://www.rfc-editor.org/rfc/rfc3849.html
- Local CLI help: `curl --help all`

## Issues Found
- The Kestrel code sample bound `ListenAnyIP(5000)` and a specific IPv6 address on the same port, which would conflict. I changed the specific IPv6 endpoint to port `5002`.
- The controller example exposed `/info/client-ip`, but the main `Program.cs` snippet didn't register or map controllers. I added `builder.Services.AddControllers();` and `app.MapControllers();` so the route shown in the post is actually reachable.
- The HTTPS `appsettings.json` example defined an HTTPS URL without a certificate configuration. Microsoft documents that HTTPS URL bindings require a default or endpoint certificate. I added the `Certificate` block to the HTTPS endpoint and changed the `ASPNETCORE_URLS` example to HTTP-only so it is valid on its own.
- The forwarded-headers sample used `KnownNetworks` and `Microsoft.AspNetCore.HttpOverrides.IPNetwork`, which are obsolete in current ASP.NET Core/.NET 10 guidance. I updated the sample to use `KnownIPNetworks` with `System.Net.IPNetwork`.
- The client IP controller used `IPAddress.IsLoopback(ip!)` even though `RemoteIpAddress` can be `null`, and it reported IPv4-mapped IPv6 addresses as IPv6 after normalization. I changed the sample to normalize first, then compute `ClientIP`, `IsIPv6`, and `IsLoopback` from the normalized address safely.
- The test command used `2001:db8::1` as if it were a real target address. That prefix is reserved for documentation, so I changed the second `curl` example to use a placeholder IPv6 address instead.

## Review Notes
- `ListenAnyIP` is documented to listen on all IPs using IPv6 `[::]`, or IPv4 `0.0.0.0` if IPv6 isn't supported. The post now reflects that more precisely.
- The IPv6 origins shown in the CORS sample are syntactically valid because RFC 3986 requires IPv6 literals in URIs to be enclosed in brackets.
- `dotnet` wasn't installed in the local environment, so `dotnet run --help` couldn't be checked directly. The .NET command and hosting behavior were validated against Microsoft Learn instead. `curl -6` was checked against local `curl --help all`.
