# Validation Summary: How to Use the OpenTelemetry Java Agent with Application Servers

## Status
validated

## Post Type
Tutorial / configuration guide

## Technologies Covered
- OpenTelemetry Java agent
- OpenTelemetry OTLP exporters and SDK configuration
- Apache Tomcat
- WildFly
- Open Liberty / WebSphere Liberty Profile
- Docker and Docker Compose
- Java JVM options and system properties

## Sources Consulted
- OpenTelemetry Java agent configuration: https://opentelemetry.io/docs/zero-code/java/agent/configuration/
- OpenTelemetry Java agent getting started: https://opentelemetry.io/docs/zero-code/java/agent/getting-started/
- OpenTelemetry Java agent application server configuration: https://opentelemetry.io/docs/zero-code/java/agent/server-config/
- OpenTelemetry Java agent supported libraries and application servers: https://opentelemetry.io/docs/zero-code/java/agent/supported-libraries/
- OpenTelemetry Java SDK configuration: https://opentelemetry.io/docs/languages/java/configuration/
- OpenTelemetry Java agent declarative configuration: https://opentelemetry.io/docs/zero-code/java/agent/declarative-configuration/
- OpenTelemetry Java instrumentation GitHub releases: https://github.com/open-telemetry/opentelemetry-java-instrumentation/releases/latest
- Apache Tomcat Windows Service How-To: https://tomcat.apache.org/tomcat-9.0-doc/windows-service-howto.html
- Open Liberty MicroProfile Telemetry docs: https://www.openliberty.io/docs/latest/microprofile-telemetry.html
- Open Liberty MicroProfile Telemetry feature reference: https://openliberty.io/docs/latest/reference/feature/mpTelemetry-2.0.html

## Issues Found
- The post referenced `opentelemetry-javaagent.jar.sha256`, but the current official GitHub release assets provide `opentelemetry-javaagent.jar` and `opentelemetry-javaagent.jar.asc`, not a `.sha256` asset. Updated the verification example to download the `.asc` signature and use `gpg --verify`.
- The post stated the Java agent JAR is typically 50-60MB. The current release asset is roughly 20-30MB, so the size guidance was corrected.
- The Windows Tomcat `setenv.bat` example did not quote the Java agent path. Updated it to match the official Tomcat-style Windows `-javaagent:"path"` form.
- The Tomcat Windows service example used command-line `++JvmOptions` entries for `-javaagent`. Official OpenTelemetry guidance says to use `tomcat*w.exe` and add the options in the Java Options field, so the example was corrected to open the service manager.
- The sample Tomcat startup log showed service name and instrumentation-list lines that are not documented as standard Java agent startup output. Replaced it with the documented version logger pattern.
- Removed `-Dotel.instrumentation.jboss-modules.enabled=true`; this is not a documented OpenTelemetry Java agent instrumentation toggle.
- Removed `-Dotel.instrumentation.liberty.enabled=true`; this is not a documented OpenTelemetry Java agent instrumentation toggle.
- The Open Liberty `server.xml` section claimed system properties could be set via `server.xml` variables for the Java agent. Updated the text to clarify that `server.xml` enables MicroProfile Telemetry features, while the Java agent and OpenTelemetry JVM properties remain in `jvm.options`.
- Updated the Liberty MicroProfile Telemetry feature example from `mpTelemetry-1.1` to `mpTelemetry-2.0`, because Open Liberty documents 2.0 and later for logs, metrics, and traces.
- Replaced the unsupported Java-agent YAML configuration-file example using `OTEL_CONFIG_FILE` with a Java properties file referenced through `otel.javaagent.configuration-file`. The current Java agent supports Java properties files for this setting; YAML declarative configuration is a separate experimental path in Java agent 2.26.0 and later.
- Removed the unsupported WildFly/JBoss Modules troubleshooting property and replaced it with guidance to keep the Java agent JAR outside application deployments.
- Clarified that the Prometheus `/metrics` endpoint is only available when the Prometheus exporter is configured.

## Review Notes
The Java agent 2.x default OTLP protocol is `http/protobuf`, while the examples explicitly set `otel.exporter.otlp.protocol=grpc`, which is valid. Docker Compose still accepts the shown format, though newer Compose implementations no longer require the top-level `version` field.
