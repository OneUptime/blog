# Validation Summary: How to Migrate from AppDynamics to OpenTelemetry

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTelemetry
- AppDynamics
- Java auto-instrumentation
- .NET OpenTelemetry SDK and instrumentation packages
- Python OpenTelemetry auto-instrumentation
- OpenTelemetry Collector
- OTLP and OneUptime telemetry ingestion
- Host metrics receiver

## Sources Consulted
- OpenTelemetry Java zero-code agent getting started: https://opentelemetry.io/docs/zero-code/java/agent/getting-started/
- OpenTelemetry Java SDK configuration and OTLP exporter settings: https://opentelemetry.io/docs/languages/java/configuration/
- OpenTelemetry .NET instrumentation docs: https://opentelemetry.io/docs/languages/dotnet/instrumentation/
- OpenTelemetry .NET exporters docs: https://opentelemetry.io/docs/languages/dotnet/exporters/
- OpenTelemetry SqlClient instrumentation README and changelog: https://github.com/open-telemetry/opentelemetry-dotnet-contrib/tree/main/src/OpenTelemetry.Instrumentation.SqlClient
- OpenTelemetry Python zero-code instrumentation docs: https://opentelemetry.io/docs/zero-code/python/
- OpenTelemetry Collector hostmetrics receiver README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/receiver/hostmetricsreceiver/README.md
- OpenTelemetry OTLP exporter specification: https://opentelemetry.io/docs/specs/otel/protocol/exporter/
- OneUptime OpenTelemetry ingestion docs: https://oneuptime.com/docs/en/telemetry/open-telemetry
- AppDynamics Java agent system property docs: https://docs.appdynamics.com/appd/24.x/24.2/en/application-monitoring/install-app-server-agents/java-agent/install-the-java-agent/use-system-properties-for-java-agent-settings
- AppDynamics .NET Linux agent installation snippets: https://docs.appdynamics.com/appd/21.x/21.6/en/application-monitoring/install-app-server-agents/net-agent/net-agent-for-linux/install-the-net-agent-for-linux
- AppDynamics Python agent API docs: https://docs.appdynamics.com/appd/24.x/latest/en/application-monitoring/install-app-server-agents/python-agent/python-agent-api/python-agent-api-reference

## Issues Found
- The AppDynamics .NET profiler GUID in the removal example was incorrect. Updated it to the GUID shown in AppDynamics .NET Linux agent documentation.
- The .NET example used `SetResourceBuilder` in each signal pipeline. Updated it to the current documented `ConfigureResource(...)` pattern on `AddOpenTelemetry()`.
- The .NET SqlClient example set `SetDbStatementForText`, which was removed in current OpenTelemetry.Instrumentation.SqlClient releases because related behavior is now enabled by default. Removed that option and retained `RecordException`.
- The .NET OTLP exporter examples used a base endpoint in code. For `OtlpExportProtocol.HttpProtobuf`, the .NET exporter requires signal-specific URLs, so the tracing exporter now uses `/v1/traces` and the metrics exporter uses `/v1/metrics`.
- The .NET metrics pipeline installed SqlClient instrumentation but did not enable SqlClient metrics. Added `.AddSqlClientInstrumentation()` to the metrics pipeline.
- The Collector example used the gRPC `otlp` exporter with the OneUptime HTTP ingestion URL. Updated it to the OneUptime-documented `otlphttp` exporter with JSON encoding and the required `Content-Type` and `x-oneuptime-token` headers.
- The Java custom metrics snippet used `Attributes` and `AttributeKey` without imports. Added the missing OpenTelemetry API imports.

## Review Notes
The post is technically relevant and code-bearing. I verified the snippets against official documentation where possible. Local compilation of the .NET example was not run because `dotnet` is not installed in this environment; the API usage was checked against current OpenTelemetry .NET and SqlClient instrumentation documentation.
