# Validation Summary: How to Deploy a .NET Application with Epinio

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Epinio
- .NET
- ASP.NET Core Minimal APIs
- Kubernetes
- Paketo Buildpacks
- Cloud Native Buildpacks

## Sources Consulted
- Epinio supported applications: https://docs.epinio.io/references/supported_applications
- Epinio push command reference: https://docs.epinio.io/references/commands/cli/epinio_push
- Epinio target command reference: https://docs.epinio.io/references/commands/cli/epinio_target
- Epinio app show command reference: https://docs.epinio.io/references/commands/cli/app/epinio_app_show
- Epinio app list command reference: https://docs.epinio.io/references/commands/cli/app/epinio_app_list
- Epinio app logs command reference: https://docs.epinio.io/references/commands/cli/app/epinio_app_logs
- Epinio app update command reference: https://docs.epinio.io/references/commands/cli/app/epinio_app_update
- Epinio app env set command reference: https://docs.epinio.io/references/commands/cli/app/env/epinio_app_env_set
- Epinio app env list command reference: https://docs.epinio.io/references/commands/cli/app/env/epinio_app_env_list
- Epinio quickstart and single developer workflow tutorials: https://docs.epinio.io/tutorials/quickstart and https://docs.epinio.io/tutorials/single-dev-workflow
- Epinio installation and routing/TLS behavior: https://docs.epinio.io/installation/install_epinio and https://docs.epinio.io/howtos/customization/setup_routing_secrets
- ASP.NET Core minimal API tutorial: https://learn.microsoft.com/en-us/aspnet/core/tutorials/min-web-api?view=aspnetcore-10.0
- WebApplication template behavior: https://learn.microsoft.com/en-us/aspnet/core/fundamentals/minimal-apis/webapplication?view=aspnetcore-9.0
- WebApplication.Run(String) API reference: https://learn.microsoft.com/en-us/dotnet/api/microsoft.aspnetcore.builder.webapplication.run?view=aspnetcore-9.0
- dotnet new command reference: https://learn.microsoft.com/en-us/dotnet/core/tools/dotnet-new
- ASP.NET Core container port behavior: https://learn.microsoft.com/en-us/dotnet/core/compatibility/containers/8.0/aspnet-port
- Paketo .NET Core buildpack reference: https://paketo.io/docs/reference/dotnet-core-reference/

## Issues Found
- The post claimed to be a .NET deployment guide but the application examples were a Bash netcat loop and a Node.js server. I replaced them with a working ASP.NET Core minimal API created via `dotnet new web`, which matches the title and the documented Paketo .NET buildpack support.
- The description said the app used “Epinio's .NET buildpack.” Epinio's docs describe source staging via Paketo Cloud Native Buildpacks, so I corrected the wording to reflect Epinio plus Paketo buildpacks instead of an Epinio-owned .NET buildpack.
- The prerequisites omitted a local .NET SDK even though the tutorial creates the app from scratch. I added that requirement.
- The route lookup commands were incorrect. Current Epinio docs show `epinio app show` output with a `Routes:` header followed by numbered route lines, so `grep Routes | awk '{print $2}'` would not return the URL. I changed both commands to extract the first numbered route line with `awk`.
- The browser command used `open`, which is macOS-specific. I replaced it with `echo "${APP_URL}"` so the step remains technically correct across environments.
- The custom route example implied any hostname would work as-is. I added a note that the custom route must resolve to the Epinio ingress, which matches Epinio’s routing documentation.
- The push explanation said Epinio would “Configure routing and TLS” as an unconditional step. I tightened that wording to routing plus related TLS resources, which better matches Epinio’s documented cert-manager-based behavior.
- The update section said Epinio “performs a rolling update,” which I could not confirm in the official docs used here. I changed it to the narrower, documented behavior that Epinio rebuilds and redeploys the application.
- The conclusion overstated the deployment target as “any application.” Epinio documents supported applications via Paketo buildpacks, so I changed this to “supported applications.”

## Review Notes
- Epinio’s current command reference still documents `epinio push` and `epinio app ...` subcommands. Some older Epinio tutorials use aliases such as `epinio apps list` and `epinio delete`; this post now uses the current command forms from the command reference.
- The sample app explicitly binds to `0.0.0.0:8080` to line up with Epinio’s documented application routing and port-forwarding examples and to avoid container-port ambiguity across .NET versions.
