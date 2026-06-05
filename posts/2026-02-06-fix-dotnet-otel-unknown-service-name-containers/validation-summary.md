# Validation Summary: How to Fix the .NET OpenTelemetry SDK Reporting service.name as

## Status
validated

## Post Type
Tutorial / troubleshooting guide

## Technologies Covered
- OpenTelemetry .NET SDK
- OpenTelemetry resource attributes and semantic conventions
- .NET / ASP.NET Core
- Docker containers
- Kubernetes environment variable configuration
- NuGet / dotnet CLI

## Sources Consulted
- OpenTelemetry .NET resources documentation: https://opentelemetry.io/docs/languages/dotnet/resources/
- OpenTelemetry SDK environment variable specification: https://opentelemetry.io/docs/specs/otel/configuration/sdk-environment-variables/
- OpenTelemetry general SDK configuration documentation: https://opentelemetry.io/docs/languages/sdk-configuration/general/
- OpenTelemetry resource semantic conventions: https://opentelemetry.io/docs/specs/semconv/resource/
- OpenTelemetry deployment semantic conventions: https://opentelemetry.io/docs/specs/semconv/registry/attributes/deployment/
- OpenTelemetry .NET ResourceBuilder source: https://github.com/open-telemetry/opentelemetry-dotnet/blob/main/src/OpenTelemetry/Resources/ResourceBuilder.cs
- OpenTelemetry .NET ResourceBuilderExtensions source: https://github.com/open-telemetry/opentelemetry-dotnet/blob/main/src/OpenTelemetry/Resources/ResourceBuilderExtensions.cs
- OpenTelemetry .NET Resource source: https://github.com/open-telemetry/opentelemetry-dotnet/blob/main/src/OpenTelemetry/Resources/Resource.cs
- OpenTelemetry.Resources.Container README/source: https://github.com/open-telemetry/opentelemetry-dotnet-contrib/tree/main/src/OpenTelemetry.Resources.Container
- OpenTelemetry.Resources.Host README/source: https://github.com/open-telemetry/opentelemetry-dotnet-contrib/tree/main/src/OpenTelemetry.Resources.Host
- Microsoft .NET CLI package command documentation: https://learn.microsoft.com/en-us/dotnet/core/tools/dotnet-package-add

## Issues Found
- The post said the .NET SDK falls back to the assembly entry point name. The current .NET SDK default resource uses the current process executable name, which explains `unknown_service:dotnet` in framework-dependent container launches. Updated the explanation accordingly.
- The post described a simple precedence order where `OTEL_SERVICE_NAME` always overrides programmatic `AddService()`. The OpenTelemetry spec defines `OTEL_SERVICE_NAME` precedence over `service.name` in `OTEL_RESOURCE_ATTRIBUTES`, but .NET `ResourceBuilder` merge order means `ConfigureResource(...AddService(...))` can override the default environment-variable detector. Updated the precedence section and example to re-apply `AddEnvironmentVariableDetector()` last when deployment config should win.
- The detector package names were outdated/deprecated. Updated `OpenTelemetry.ResourceDetectors.Container` and `OpenTelemetry.ResourceDetectors.Host` to the current `OpenTelemetry.Resources.Container` and `OpenTelemetry.Resources.Host` packages with `--prerelease`.
- The post used deprecated `deployment.environment`. Updated examples to the current stable semantic convention `deployment.environment.name`.
- The post said the container detector adds Kubernetes metadata and only reads `/proc/self/cgroup`. The .NET container detector records `container.id` and can read cgroup data from `/proc/self/cgroup` or `/proc/self/mountinfo`. Updated the wording.
- The post said the host detector reads hostname and OS information. The current host detector records `host.name`, `host.arch`, and `host.id` when available. Updated the wording.

## Review Notes
The `GetResource()` verification sample is valid for the OpenTelemetry .NET SDK provider type, but in a hosted ASP.NET Core app resolving `TracerProvider` from services will instantiate the provider if it has not already been started by the hosted service. That is acceptable for a startup verification snippet.
