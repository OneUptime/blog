# Validation Summary: How to Monitor Azure App Services (PaaS) with OpenTelemetry

## Status
validated

## Post Type
Technical guide / Tutorial

## Technologies Covered
- Azure App Service
- Azure Monitor Diagnostic Settings and Event Hubs
- OpenTelemetry SDKs and zero-code instrumentation
- OpenTelemetry Collector and `azure_event_hub` receiver
- Node.js, .NET, Java, and Python application runtimes
- OneUptime OTLP ingestion

## Sources Consulted
- Azure App Service environment variables and app settings reference: https://learn.microsoft.com/en-us/azure/app-service/reference-app-settings
- Azure App Service Python configuration: https://learn.microsoft.com/en-us/azure/app-service/configure-language-python
- Azure App Service diagnostic logging: https://learn.microsoft.com/en-us/azure/app-service/troubleshoot-diagnostic-logs
- Supported logs for `Microsoft.Web/sites`: https://learn.microsoft.com/en-us/azure/azure-monitor/reference/supported-logs/microsoft-web-sites-logs
- Azure Monitor diagnostic settings: https://learn.microsoft.com/en-us/azure/azure-monitor/platform/diagnostic-settings
- Azure App Service sidecar configuration and overview: https://learn.microsoft.com/en-us/azure/app-service/configure-sidecar and https://learn.microsoft.com/en-us/azure/app-service/overview-sidecar
- Azure App Service custom container documentation, including Docker Compose retirement notice: https://learn.microsoft.com/en-us/azure/app-service/configure-custom-container
- OpenTelemetry JavaScript zero-code instrumentation: https://opentelemetry.io/docs/zero-code/js/
- OpenTelemetry .NET automatic instrumentation getting started and configuration: https://opentelemetry.io/docs/zero-code/dotnet/getting-started/ and https://opentelemetry.io/docs/zero-code/dotnet/configuration/
- OpenTelemetry Java agent configuration: https://opentelemetry.io/docs/zero-code/java/agent/configuration/
- OpenTelemetry Python zero-code instrumentation: https://opentelemetry.io/docs/zero-code/python/
- OpenTelemetry Collector receiver component list: https://opentelemetry.io/docs/collector/components/receiver/
- OpenTelemetry Collector Azure Event Hub receiver README: https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/main/receiver/azureeventhubreceiver
- OpenTelemetry resource semantic conventions: https://opentelemetry.io/docs/specs/semconv/resource/
- OneUptime OpenTelemetry ingestion documentation: https://oneuptime.com/docs/telemetry/open-telemetry

## Issues Found
- The prerequisites said Linux or Windows works for all listed runtimes. Azure App Service's built-in Python runtime is Linux-only, so the text now says Python on Windows requires a custom Windows container.
- The .NET automatic instrumentation example omitted the startup hook, additional deps, and shared store environment variables that the official .NET auto-instrumentation setup uses. Added `DOTNET_STARTUP_HOOKS`, `DOTNET_ADDITIONAL_DEPS`, and `DOTNET_SHARED_STORE`.
- The .NET Windows note implied a different Windows CLSID. The OpenTelemetry profiler CLSID is the same; Windows uses bitness-specific DLL path variables, so the text now says to use `CORECLR_PROFILER_PATH_32` or `CORECLR_PROFILER_PATH_64`.
- The Java App Service snippet used `JAVA_OPTS` for all Java apps. Azure App Service uses `CATALINA_OPTS` for Tomcat, so the post now distinguishes Java SE from Tomcat.
- The resource attribute examples used the older `deployment.environment` name and used `faas.name` for App Service. Updated to `deployment.environment.name` and removed the FaaS attribute.
- The resource attribute section claimed Azure expands `$VAR` placeholders inside an Application setting. App Service passes app-setting values as environment variables without shell expansion, so the post now shows a startup-script export and explains that portal settings need concrete values or startup-code construction.
- The Diagnostic Settings section overclaimed scaling events, slot swaps, and CPU quota hits as App Service diagnostic-setting output. Reworded the platform telemetry description to HTTP logs, App Service platform events, resource metrics, and container startup failures.
- The Collector example used the deprecated `azureeventhub` receiver name and a category-specific Event Hub path while claiming to collect multiple logs and metrics. Updated to the current `azure_event_hub` receiver name and explained named versus category-specific Event Hubs.
- The writable path gotcha only mentioned `/home`. Updated it to distinguish Linux `/home`, Windows `D:\home`, and the App Service storage requirement for custom containers.
- The `OTEL_BSP_SCHEDULE_DELAY` gotcha described seconds, but the environment variable value is milliseconds. Updated the guidance to the default `5000` ms.
- The Collector sidecar resource guidance called the sidecar "in-process" and gave an arbitrary minimum plan size. Reworded it to say the sidecar shares plan CPU/RAM and the plan should be sized accordingly.
- The OneUptime section said "no Azure Monitor in the middle," which was misleading because platform telemetry still uses Azure Monitor Diagnostic Settings. Reworded it to "no Azure Monitor workspace or vendor-specific agents."

## Review Notes
- The OpenTelemetry Collector Azure Event Hub receiver supports logs, metrics, and traces in the contrib distribution, but production deployments should add checkpoint persistence so restarts do not lose or reprocess Event Hub messages.
- The Java agent protocol line is acceptable and explicit; current Java agent versions default to `http/protobuf`, but keeping the setting is harmless.
- The OneUptime endpoint and `x-oneuptime-token` header match OneUptime's OpenTelemetry documentation.
