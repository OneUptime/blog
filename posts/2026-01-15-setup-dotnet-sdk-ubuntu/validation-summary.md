# Validation Summary: How to Set Up .NET SDK on Ubuntu

## Status
validated

## Post Type
Tutorial / technical setup guide

## Technologies Covered
- Ubuntu package management
- .NET SDK and .NET CLI
- C# and ASP.NET Core
- NuGet
- Entity Framework Core
- xUnit, Moq, and FluentAssertions
- Docker and Docker Compose
- Visual Studio Code and JetBrains Rider
- Serilog and ASP.NET Core configuration
- OneUptime monitoring

## Sources Consulted
- Microsoft Learn: Install .NET SDK or Runtime on Ubuntu - https://learn.microsoft.com/en-us/dotnet/core/install/linux-ubuntu-install
- Microsoft Learn: .NET and Ubuntu overview - https://learn.microsoft.com/en-us/dotnet/core/install/linux-ubuntu-decision
- Microsoft Learn: Install .NET on Linux with install scripts - https://learn.microsoft.com/en-us/dotnet/core/install/linux-scripted-manual
- Microsoft Learn: dotnet-install scripts - https://learn.microsoft.com/en-us/dotnet/core/tools/dotnet-install-script
- Microsoft Learn: global.json overview - https://learn.microsoft.com/en-us/dotnet/core/tools/global-json
- Microsoft Learn: .NET default templates for dotnet new - https://learn.microsoft.com/en-us/dotnet/core/tools/dotnet-new-sdk-templates
- Microsoft Learn: dotnet test command - https://learn.microsoft.com/en-us/dotnet/core/tools/dotnet-test
- Microsoft Learn: dotnet publish command - https://learn.microsoft.com/en-us/dotnet/core/tools/dotnet-publish
- Microsoft Learn: .NET application publishing overview - https://learn.microsoft.com/en-us/dotnet/core/deploying/
- Microsoft Learn: Default ASP.NET Core port changed from 80 to 8080 - https://learn.microsoft.com/en-us/dotnet/core/compatibility/containers/8.0/aspnet-port
- Microsoft Learn: .NET releases, patches, and support - https://learn.microsoft.com/en-us/dotnet/core/releases-and-support
- Microsoft .NET official support policy - https://dotnet.microsoft.com/en-us/platform/support/policy

## Issues Found
- The installation section recommended Microsoft's package repository as the default for Ubuntu. Current Microsoft guidance says Ubuntu 22.04 and later should generally use Ubuntu's built-in .NET packages, with Microsoft's repository instructions reserved for versions/distributions that need it. Updated the recommendation and commands accordingly.
- The script-based install used `--channel LTS`, which now resolves to the current LTS release rather than the .NET 8 version used throughout the article. Changed it to `--channel 8.0`.
- The Snap section described the SDK snap as sandboxed even though `--classic` confinement is not strict sandboxing. Corrected the wording.
- The multiple-SDK examples included .NET 6 and .NET 7, which are out of support. Replaced them with supported .NET 8, 9, and 10 examples and release-channel install-script commands.
- The `global.json` command did not generate the `rollForward` value shown in the following snippet. Added `--roll-forward latestFeature` and aligned the example version with the .NET 8-focused guide.
- The minimal API sample used `AddSwaggerGen`, `UseSwagger`, and `UseSwaggerUI` without adding Swashbuckle. Added the required package command.
- The package list omitted packages used later by the full ASP.NET Core configuration sample: `Serilog.Enrichers.Environment`, `AspNetCore.HealthChecks.Npgsql`, and `AspNetCore.HealthChecks.Redis`. Added them.
- The test command listed `dotnet test --parallel`, which is not a documented `dotnet test` option for the standard VSTest path. Replaced it with xUnit parallelization arguments.
- The basic Dockerfile built to a custom output path and then used `dotnet publish --no-build`, which can fail because publish expects the normal build output. Removed the separate build step and published with `--no-restore`.
- The Dockerfile used line-continuation commands with comment lines inside the continued shell command. Moved those comments out so the Dockerfile syntax remains valid.
- The Docker health check used `curl` without installing it in the runtime image. Added a minimal `curl` install before switching to the non-root user.

## Review Notes
The post is technically useful and broadly accurate after the fixes. Some longer examples are illustrative and assume surrounding application types such as `ProductService`, `IProductRepository`, and related models exist in the reader's project; future revisions could make those assumptions explicit or split complete runnable samples into a companion repository.
