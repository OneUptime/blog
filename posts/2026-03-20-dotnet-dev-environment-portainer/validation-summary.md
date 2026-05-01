# Validation Summary: How to Set Up a .NET Development Environment with Portainer

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Portainer
- Docker Compose
- .NET 8
- ASP.NET Core minimal APIs
- `dotnet watch`
- Visual Studio Code debugging
- `vsdbg`

## Sources Consulted
- Docker Compose file reference: https://docs.docker.com/reference/compose-file/
- Docker Compose `version` top-level element: https://docs.docker.com/reference/compose-file/version-and-name/
- `dotnet watch` command docs: https://learn.microsoft.com/en-us/dotnet/core/tools/dotnet-watch
- ASP.NET Core runtime environments: https://learn.microsoft.com/en-us/aspnet/core/fundamentals/environments?view=aspnetcore-10.0
- Minimal API / `ASPNETCORE_URLS` guidance: https://learn.microsoft.com/en-us/aspnet/core/fundamentals/minimal-apis/webapplication?view=aspnetcore-9.0
- ASP.NET Core Swagger / OpenAPI guidance: https://learn.microsoft.com/en-us/aspnet/core/tutorials/web-api-help-pages-using-swagger?view=aspnetcore-8.0
- ASP.NET Core OpenAPI overview: https://learn.microsoft.com/en-us/aspnet/core/fundamentals/openapi/overview?view=aspnetcore-10.0
- VS Code Docker Compose debugging docs: https://code.visualstudio.com/docs/containers/docker-compose
- VS Code debug configuration docs: https://code.visualstudio.com/docs/debugtest/debugging-configuration
- VS Code C# debugger settings: https://code.visualstudio.com/docs/csharp/debugger-settings
- Microsoft `vsdbg` install example: https://learn.microsoft.com/en-us/dotnet/iot/debugging
- Microsoft remote attach example using `coreclr` + `pickRemoteProcess`: https://learn.microsoft.com/en-us/azure/iot-edge/debug-module-vs-code
- Portainer relative path volume behavior: https://docs.portainer.io/advanced/relative-paths

## Issues Found
- The Compose snippet declared `version: "3.8"`. Docker now treats the top-level `version` field as obsolete, so I removed it.
- The stack exposed ports `5001` and `4024`, but the sample app only listened on HTTP port `5000`, and VS Code `vsdbg` attach uses `docker exec`/`pipeTransport` rather than a published debugger TCP port. I removed the incorrect port mappings.
- Hot reload on Docker-mounted volumes needs `DOTNET_USE_POLLING_FILE_WATCHER=1` for reliable file watching. I added that environment variable.
- `dotnet watch` was being run in a non-interactive container without `--non-interactive`. I added the flag so rude edits do not block on prompts.
- The Portainer bind mount used `./app`, which Portainer documents as a special relative-path feature for Git-based Business Edition deployments. I changed the example to an absolute host-path placeholder and added a note.
- The ASP.NET Core sample used `AddSwaggerGen`, `UseSwagger`, and `UseSwaggerUI`, but the shown `.csproj` did not include the required Swagger package. I removed the Swagger-specific calls so the sample builds with the project file as shown.
- The `vsdbg` install command used `bash`. Microsoft’s documented install command uses `/bin/sh`, so I corrected it.
- The `launch.json` snippet hardcoded `dotnet-dev` as the container name. In Compose/Portainer, the service name is not necessarily the actual container name used by `docker exec`. I changed it to a `<container-name>` placeholder and completed the sample with the standard top-level `version` field.

## Review Notes
- The post now describes an HTTP-only setup. If HTTPS is added later, the stack will also need certificate setup and an HTTPS URL binding.
- `mcr.microsoft.com/dotnet/sdk:8.0-alpine` is a floating patch tag. If reproducibility matters, pin a specific patch tag or image digest in a future revision.
