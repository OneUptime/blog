# Validation Summary: How to Configure Kestrel for IPv6 in .NET

## Status
validated

## Post Type
Tutorial / Configuration guide

## Technologies Covered
- Kestrel (ASP.NET Core web server)
- .NET / ASP.NET Core
- C# (Minimal API, `Program.cs`)
- IPv6 networking
- `appsettings.json` (Kestrel configuration schema)
- `Microsoft.AspNetCore.HttpOverrides` (`ForwardedHeadersOptions`, `KnownProxies`, `KnownNetworks`)
- Docker / Docker Compose (IPv6-enabled networks)
- NGINX (IPv6 reverse proxy)
- HTTPS / TLS configuration via `UseHttps`
- HTTP/1.1 and HTTP/2 protocol selection (`HttpProtocols`)

## Sources Consulted
- Microsoft Learn: Configure endpoints for the ASP.NET Core Kestrel web server — https://learn.microsoft.com/en-us/aspnet/core/fundamentals/servers/kestrel/endpoints
- Microsoft Learn: Configure ASP.NET Core to work with proxy servers and load balancers (`ForwardedHeadersOptions`) — https://learn.microsoft.com/en-us/aspnet/core/host-and-deploy/proxy-load-balancer
- Microsoft Learn: `IPAddress.Parse` and IPv6 string format — https://learn.microsoft.com/en-us/dotnet/api/system.net.ipaddress.parse
- Microsoft Learn: `IPAddress.IsIPv4MappedToIPv6` / `MapToIPv4` — https://learn.microsoft.com/en-us/dotnet/api/system.net.ipaddress.isipv4mappedtoipv6
- Microsoft Learn: `KestrelServerOptions.ListenAnyIP` — https://learn.microsoft.com/en-us/dotnet/api/microsoft.aspnetcore.server.kestrel.core.kestrelserveroptions.listenanyip
- Microsoft Learn: `HttpProtocols` enum — https://learn.microsoft.com/en-us/dotnet/api/microsoft.aspnetcore.server.kestrel.core.httpprotocols
- ASP.NET Core configuration: Kestrel `appsettings.json` endpoint schema (`Http`, `HttpsInlineCertFile`, custom names) — https://learn.microsoft.com/en-us/aspnet/core/fundamentals/servers/kestrel/endpoints#configure-endpoints-in-appsettingsjson
- Docker Compose reference: ports (IP-prefixed short syntax `"[IP]:HOST:CONTAINER"`) — https://docs.docker.com/compose/compose-file/05-services/#ports
- Docker Compose reference: networks `enable_ipv6` and IPAM — https://docs.docker.com/compose/compose-file/06-networks/
- NGINX `listen` directive (IPv6) — https://nginx.org/en/docs/http/ngx_http_core_module.html#listen
- RFC 3849 — IPv6 Address Prefix Reserved for Documentation (`2001:db8::/32`)
- RFC 4291 — IP Version 6 Addressing Architecture (hexadecimal text representation)

## Issues Found
- **Invalid IPv6 literal in `KnownProxies`** (Step 3): The example contained `IPAddress.Parse("2001:db8::lb")`. The character `l` is not a valid hexadecimal digit, so `IPAddress.Parse` would throw a `FormatException` at runtime per RFC 4291 / `System.Net.IPAddress` documentation. Replaced with `2001:db8::1b`, which is a valid documentation-range (`2001:db8::/32`) IPv6 address that preserves the example's intent.

## Review Notes
- Step 1 demonstrates several `Listen*` methods and reuses port `5000` across "Method 1", "Method 3", and "Method 5". The methods are presented as alternatives, but a reader who copies the snippet verbatim will hit "address already in use" at startup. This is illustrative and clearly labeled as separate methods, so no change was made.
- In .NET 8+, `Microsoft.AspNetCore.HttpOverrides.IPNetwork` was marked obsolete and `ForwardedHeadersOptions.KnownNetworks` switched to `System.Net.IPNetwork`. Both types share the `(IPAddress, int prefixLength)` constructor used in the example, so the snippet still compiles and runs on .NET 8/9, though with `using System.Net;` and `using Microsoft.AspNetCore.HttpOverrides;` both in scope on .NET 8+, the `IPNetwork` reference can be ambiguous and may need to be fully qualified depending on the SDK. Consider noting this version caveat in a future revision.
- The IPv6 prefix length used for `KnownNetworks` (`/32`) is the documentation-range aggregation block; in real deployments most operators trust a `/48`, `/56`, or `/64` corresponding to the proxy/LB subnet. Technically valid, just unusually broad.
- `app.UseForwardedHeaders()` is correctly placed before `UseAuthentication`/`UseAuthorization`, matching Microsoft's guidance.
- The `appsettings.json` endpoint names (`Http`, `HttpsInlineCertFile`, `IPv4Only`) are user-defined keys; the schema only requires `Url` and (optionally) `Certificate`, so the configuration is valid.
- Docker Compose IPv6 port short-form `"[::]:5000:5000"` is supported; on hosts where `net.ipv6.bindv6only=0` (the default on Linux), this also covers IPv4 via the dual-stack socket — worth mentioning, but not incorrect.
