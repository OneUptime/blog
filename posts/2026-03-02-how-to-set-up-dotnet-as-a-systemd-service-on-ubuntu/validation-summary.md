# Validation Summary: How to Set Up .NET as a systemd Service on Ubuntu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- .NET 8 (runtime, SDK, ASP.NET Core)
- `dotnet publish` (framework-dependent, self-contained, single-file)
- Ubuntu apt package management (Microsoft repo via `packages-microsoft-prod.deb`)
- systemd unit files (Service, sandboxing/hardening directives)
- nginx as reverse proxy (TLS, WebSocket/SignalR upgrade)
- `ForwardedHeaders` middleware in ASP.NET Core
- Serilog with `Serilog.Sinks.Systemd`
- journalctl for log inspection
- .NET runtime configuration via `DOTNET_*` environment variables

## Sources Consulted
- systemd resource control: https://www.freedesktop.org/software/systemd/man/latest/systemd.resource-control.html
- .NET garbage collector config: https://learn.microsoft.com/en-us/dotnet/core/runtime-config/garbage-collector
- .NET compilation config: https://learn.microsoft.com/en-us/dotnet/core/runtime-config/compilation
- Host ASP.NET Core on Linux with nginx: https://learn.microsoft.com/en-us/aspnet/core/host-and-deploy/linux-nginx
- Install .NET on Ubuntu: https://learn.microsoft.com/en-us/dotnet/core/install/linux-ubuntu

## Issues Found

1. **`MemoryLimit=512M` is deprecated in systemd.**
   - Per the systemd resource-control docs, `MemoryLimit=` is a cgroup v1 legacy option superseded by `MemoryMax=` under the unified cgroup v2 hierarchy.
   - Fix: changed to `MemoryMax=512M`.

2. **Incorrect environment variable for Server vs Workstation GC.**
   - The post used `DOTNET_GCConserveMemory=0` / `=9` and labelled them as switching between Server GC and Workstation GC. `DOTNET_GCConserveMemory` is unrelated — it is a 0–9 dial that trades throughput for lower memory use. The correct env var for selecting GC mode is `DOTNET_gcServer` (`1` = server, `0` = workstation).
   - Fix: replaced the GC-mode example with `DOTNET_gcServer=1`/`DOTNET_gcServer=0`, and moved `DOTNET_GCConserveMemory` into a separate (commented) example showing its actual purpose.

3. **`DOTNET_GCHeapHardLimit` value format was wrong.**
   - Per Microsoft docs, when set via an environment variable the value is parsed as **hexadecimal**, not decimal. `DOTNET_GCHeapHardLimit=400000000` would be read as `0x400000000` (~17 GiB), not 400 MB.
   - Fix: changed example to `DOTNET_GCHeapHardLimit=0x19000000` (≈400 MB) and added a comment noting the hex parsing rule.

4. **Note added that tiered compilation is on by default.**
   - `DOTNET_TieredCompilation=1` is valid but redundant since .NET Core 3.0. Updated the inline comment to reflect this rather than implying it must be set.

5. **nginx WebSocket / SignalR Connection header was wrong.**
   - The post had `proxy_set_header Connection $http_connection;`. This forwards whatever the client sent (often `keep-alive`), breaking WebSocket upgrades. Microsoft's official ASP.NET Core / Linux-nginx hosting guide requires a `map` directive that resolves to `$http_connection` only when the client sent `Upgrade`, and falls back to `keep-alive` otherwise.
   - Fix: added the `map $http_connection $connection_upgrade { ... }` block at the top of the nginx file and changed the directive to `proxy_set_header Connection $connection_upgrade;`.

## Review Notes
- The post targets .NET 8, which is in long-term support; package names (`aspnetcore-runtime-8.0`, `dotnet-sdk-8.0`) are correct.
- On Ubuntu 22.04+, Microsoft is moving users toward the Ubuntu-bundled .NET packages, but the manual `packages-microsoft-prod.deb` approach used here still works and is still documented.
- `ProtectSystem=strict` combined with `ReadWritePaths=/var/www/myapp/logs /tmp` is correct, but the user must `mkdir` the `logs` directory (the post does not show this). Not a technical error, just an implementation detail readers should be aware of.
- `KnownNetworks.Clear()` + `KnownProxies.Clear()` disables proxy-IP validation entirely. That is acceptable when Kestrel only listens on localhost (as configured here) but is risky if the bind address ever changes. Worth a future cautionary note.
- The Serilog snippet imports `Serilog.Events` but does not use it after the change in `MinimumLevel.Override` — left intact since the `using` is harmless and matches Serilog's common style.
