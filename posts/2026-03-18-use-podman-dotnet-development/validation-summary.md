# Validation Summary: How to Use Podman for .NET Development

## Status
validated

## Post Type
Tutorial / guide

## Technologies Covered
- Podman
- .NET SDK and .NET container images
- ASP.NET Core
- C#
- Entity Framework Core
- SQL Server containers
- PostgreSQL containers
- Visual Studio Code debugging
- Compose-based multi-container development

## Sources Consulted
- .NET container images: https://learn.microsoft.com/en-us/dotnet/core/docker/container-images
- dotnet watch command: https://learn.microsoft.com/en-us/dotnet/core/tools/dotnet-watch
- Podman compose man page: https://docs.podman.io/en/v5.6.2/markdown/podman-compose.1.html
- dotnet tool install command: https://learn.microsoft.com/en-ca/dotnet/core/tools/dotnet-tool-install
- C# debugger settings for VS Code (`pipeTransport` / `vsdbg`): https://code.visualstudio.com/docs/csharp/debugger-settings
- Remote .NET debugging setup (`vsdbg` install example): https://learn.microsoft.com/en-us/dotnet/iot/debugging
- VS Code attach example for containerized .NET processes: https://learn.microsoft.com/en-us/azure/iot-edge/debug-module-vs-code
- .NET releases and support: https://learn.microsoft.com/en-us/dotnet/core/releases-and-support
- .NET support policy: https://dotnet.microsoft.com/platform/support-policy
- Target frameworks in SDK-style projects: https://learn.microsoft.com/en-us/dotnet/standard/frameworks
- .NET SDK multitargeting: https://learn.microsoft.com/en-us/visualstudio/msbuild/net-sdk-multitargeting?view=visualstudio

## Issues Found
- The post said Microsoft publishes official .NET images in "two main categories" but listed three image types (`sdk`, `aspnet`, `runtime`). I corrected the wording to match the examples.
- After `dotnet new webapi -n MyApi --no-https`, the rest of the walkthrough assumed the reader was already inside the generated project directory. I added `cd MyApi` so the later `Program.cs`, Containerfile, and build commands line up with the actual project layout.
- The live-reload examples used `dotnet watch` against mounted source without calling out `DOTNET_USE_POLLING_FILE_WATCHER=1`. Microsoft documents polling as required for mounted/virtual file systems in container workflows. I added that setting to the development image, direct watch commands, compose examples, and watch-test example.
- The compose examples used `podman-compose`, while current Podman documentation describes `podman compose` as the supported entry point. I updated the commands accordingly.
- The EF Core tool install command used `--global`, which installs into `$HOME/.dotnet/tools`; Microsoft documents that Linux tools installed this way require the tool path to be on `PATH`. In a fresh container exec session that can make later `dotnet ef` calls fail. I changed the install example to use `--tool-path /usr/local/bin` so the command is available to later `podman compose exec` calls.
- The debugging section installed `dotnet-debugger-extensions` and pointed VS Code at `/root/.dotnet/tools/dotnet-debugger`, which is not the VS Code .NET debugger flow. Official VS Code and Microsoft docs use `vsdbg`. I replaced the instructions with a `vsdbg` install step and updated `launch.json` to use `/vsdbg/vsdbg` plus a shell-based `podman exec` transport.
- The debugging text incorrectly referred to an exposed "debugger port" even though the sample was using process attach, not port-based debugging. I rewrote that part to use a stable container name and `podman exec`.
- The production build command referenced `Containerfile.prod` without first saying the shown file should be saved under that name. I added that clarification.
- The "Testing Against Multiple .NET Versions" section used .NET 6 and .NET 7 examples, which are out of support as of 2026-05-07, and the commands did not explain that true version testing requires multi-targeting. I updated the section to supported versions (`net8.0`, `net9.0`, `net10.0`), added a `TargetFrameworks` example, and used `dotnet test -f ...` with matching SDK images.

## Review Notes
- The post’s main build/runtime examples stay on .NET 8. That is still technically valid because .NET 8 remains supported on 2026-05-07.
- The examples use `:Z` bind-mount labeling, which is appropriate for SELinux-enabled Podman hosts. Users on macOS, Windows, or Linux hosts without SELinux may need to adjust mount options.
- `podman compose` is a thin wrapper around an external Compose provider according to Podman’s documentation, so the environment still needs a compatible provider installed.
