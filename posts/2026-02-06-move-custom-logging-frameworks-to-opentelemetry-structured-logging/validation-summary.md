# Validation Summary: How to Move from Custom Logging Frameworks to OpenTelemetry Structured Logging

## Status
validated

## Post Type
Technical migration guide / tutorial

## Technologies Covered
- OpenTelemetry Logs data model and log correlation
- OpenTelemetry Java Log4j2 and Logback appenders
- Apache Log4j2
- .NET `ILogger`
- Serilog and `Serilog.Sinks.OpenTelemetry`
- Python standard `logging`
- OpenTelemetry Collector and OTLP export

## Sources Consulted
- OpenTelemetry Logs Data Model: https://opentelemetry.io/docs/specs/otel/logs/data-model/
- OpenTelemetry Logs overview and correlation model: https://opentelemetry.io/docs/specs/otel/logs/
- OpenTelemetry Java docs: https://opentelemetry.io/docs/languages/java/
- OpenTelemetry Java SDK configuration and autoconfigure docs: https://opentelemetry.io/docs/languages/java/configuration/
- OpenTelemetry Java Spring Boot starter Log4j2 appender docs: https://opentelemetry.io/pl/docs/zero-code/java/spring-boot-starter/additional-instrumentations/
- OpenTelemetry Java Log4j2 appender README: https://github.com/open-telemetry/opentelemetry-java-instrumentation/tree/main/instrumentation/log4j/log4j-appender-2.17/library
- Maven Central entry for `opentelemetry-log4j-appender-2.17`: https://central.sonatype.com/artifact/io.opentelemetry.instrumentation/opentelemetry-log4j-appender-2.17
- OpenTelemetry .NET logs docs: https://opentelemetry.io/docs/languages/dotnet/logs/
- OpenTelemetry .NET log correlation docs: https://opentelemetry.io/docs/languages/dotnet/logs/correlation/
- OpenTelemetry Python instrumentation docs: https://opentelemetry.io/docs/languages/python/instrumentation/
- OpenTelemetry Python logging instrumentation docs: https://opentelemetry-python-contrib.readthedocs.io/en/latest/instrumentation/logging/logging.html
- Serilog OpenTelemetry sink README: https://github.com/serilog/serilog-sinks-opentelemetry

## Issues Found
- The Java section described bridging Log4j/SLF4J with appenders, but OpenTelemetry provides appenders for concrete backends such as Log4j2 and Logback rather than SLF4J itself. Updated the wording and description to Log4j/Logback.
- The Log4j2 dependency version was outdated and omitted the current alpha suffix used by the appender artifact. Updated the appender example to `2.28.1-alpha` and removed stale pinned SDK versions.
- The Log4j2 XML configuration was missing the `packages="io.opentelemetry.instrumentation.log4j.appender.v2_17"` package declaration shown in official appender setup examples. Added it so Log4j can discover the OpenTelemetry appender plugin.
- The Log4j2 section implied the appender would work from XML and dependencies alone. Added the required `OpenTelemetryAppender.install(openTelemetrySdk)` startup step using `AutoConfiguredOpenTelemetrySdk`.
- The .NET section implied Serilog output automatically goes through OpenTelemetry because OpenTelemetry integrates with `ILogger`. Clarified that OpenTelemetry sees `ILogger` records and that direct Serilog API calls should use `Serilog.Sinks.OpenTelemetry`.
- The Python example used the deprecated SDK `LoggingHandler`. Updated the setup to use `opentelemetry.instrumentation.logging.LoggingInstrumentor` with a configured global `LoggerProvider`.

## Review Notes
The remaining examples are illustrative and assume surrounding application setup, such as ASP.NET Core controller dependencies, a configured OpenTelemetry Collector endpoint, and an active tracer provider for the Python correlation verification snippet. The OpenTelemetry Java Log4j appender artifact is still published with an `-alpha` version suffix, so readers should check current release notes when upgrading.
