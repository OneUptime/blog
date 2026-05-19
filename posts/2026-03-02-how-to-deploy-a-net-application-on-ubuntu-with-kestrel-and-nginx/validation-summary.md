# Validation Summary: How to Deploy a .NET Application on Ubuntu with Kestrel and Nginx

## Status
validated

## Post Type
Tutorial / deployment guide

## Technologies Covered
- Ubuntu
- .NET 8 / ASP.NET Core
- Kestrel
- Nginx
- systemd
- Certbot / Let's Encrypt
- Entity Framework Core

## Sources Consulted
- Microsoft Learn: Host ASP.NET Core on Linux with Nginx - https://learn.microsoft.com/aspnet/core/host-and-deploy/linux-nginx
- Microsoft Learn: Configure endpoints for the ASP.NET Core Kestrel web server - https://learn.microsoft.com/aspnet/core/fundamentals/servers/kestrel/endpoints
- Microsoft Learn: Configure ASP.NET Core to work with proxy servers and load balancers - https://learn.microsoft.com/aspnet/core/host-and-deploy/proxy-load-balancer
- Microsoft Learn: Install .NET on Ubuntu - https://learn.microsoft.com/dotnet/core/install/linux-ubuntu
- Microsoft Learn: dotnet publish command - https://learn.microsoft.com/dotnet/core/tools/dotnet-publish
- Microsoft Learn: EF Core tools reference (.NET CLI) - https://learn.microsoft.com/ef/core/cli/dotnet
- Nginx documentation: ngx_http_proxy_module proxy_pass - https://nginx.org/en/docs/http/ngx_http_proxy_module.html#proxy_pass
- Microsoft .NET Blog: .NET Core and systemd - https://devblogs.microsoft.com/dotnet/net-core-and-systemd/

## Issues Found
- The introduction described the deployment as "self-contained" even though the primary commands install the ASP.NET Core runtime and publish a framework-dependent app. Changed this to "systemd service" to match the guide.
- The Microsoft package repository command used `lsb_release` without installing the package that provides it on minimal Ubuntu systems. Added `lsb-release` and `ca-certificates` to the prerequisite install command.
- The `Program.cs` snippet used `ForwardedHeadersOptions`, `ForwardedHeaders`, and `IPAddress` without showing the required namespaces, and ended before `app.Run()`. Added the required `using` statements and completed the minimal app pipeline.
- The systemd unit used `Type=notify`, which requires explicit systemd integration in the app. Changed it to `Type=simple` for a standard ASP.NET Core service and commented the globalization-invariant environment variable because enabling it globally can break culture-sensitive behavior.
- The Unix socket needed predictable group access for Nginx. Set the service group to `www-data` and added `UMask=0007` so the socket can be created with group write access.
- The Nginx Unix socket `proxy_pass` form was fragile and could rewrite `/hub` requests incorrectly when a URI was included. Replaced direct socket `proxy_pass` values with an `upstream` that points to `unix:/run/myapp/app.sock`, then proxied to that upstream.
- The SignalR `/hub` location omitted the forwarded headers configured for the main location. Added `X-Real-IP`, `X-Forwarded-For`, and `X-Forwarded-Proto`.
- The EF Core CLI example passed a published DLL to `--project`, but the official option expects a project path or project directory. Updated the example to point at a source `.csproj` and pass the production environment after `--`.

## Review Notes
.NET 8 remains an LTS release as of the validation date, but future updates of this post should consider whether the default example should move to the current LTS runtime after .NET 8 reaches end of support.
