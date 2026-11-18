# How to Stop OpenTelemetry Java Agent Exports to Localhost

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Java, Configuration, Troubleshooting

Description: Identify which Java agent signal still exports to localhost, disable unwanted exporters, and verify the effective endpoint and configuration source.

A Java application exports traces to its backend, yet its logs keep reporting failed connections to localhost. The failing connection may belong to another signal. Start by identifying the exporter in the error and the process that owns it.

This guide uses the Java agent's environment-variable and system-property configuration. Record the agent version and whether a declarative configuration file is active before changing settings.

## Identify the signal before changing the endpoint

Read the complete error around the failed export. Does it mention spans, metrics, or log records? Record the destination, protocol, process ID, and cadence. A periodic metric export can continue while trace export succeeds.

Build a small inventory:

| Signal | Required? | Selected exporter | Effective destination |
| --- | --- | --- | --- |
| Traces | Yes | OTLP | Trace backend or Collector |
| Metrics | Decide | Inspect separately | Inspect separately |
| Logs | Decide | Inspect separately | Inspect separately |

Java autoconfiguration selects exporters independently. Setting a trace endpoint does not configure the metric or log endpoint. The SDK configuration reference lists `otlp` as the default for all three exporter selections. [Java SDK configuration](https://opentelemetry.io/docs/languages/java/configuration/).

## Disable exporters for signals you do not need

For a service that exports only traces through OTLP/HTTP, configure the process before startup:

```bash
export OTEL_TRACES_EXPORTER=otlp
export OTEL_METRICS_EXPORTER=none
export OTEL_LOGS_EXPORTER=none
export OTEL_EXPORTER_OTLP_TRACES_PROTOCOL=http/protobuf
export OTEL_EXPORTER_OTLP_TRACES_ENDPOINT=https://collector.example.com:4318/v1/traces
java -javaagent:/opt/opentelemetry-javaagent.jar -jar app.jar
```

Replace the endpoint and supply the authentication your deployment requires. `none` disables the selected signal's exporter. It does not promise that every instrumentation hook or application logging statement disappears. Normal application console logging can continue.

For a temporary test of the autoconfigured SDK being disabled entirely, use `OTEL_SDK_DISABLED=true` and restart. This changes telemetry behavior more broadly than selecting exporters. Avoid using it as a permanent fix if traces are still required.

## Correct the destination when every signal is wanted

A shared HTTP base endpoint allows the exporter to construct the signal paths:

```bash
export OTEL_EXPORTER_OTLP_PROTOCOL=http/protobuf
export OTEL_EXPORTER_OTLP_ENDPOINT=https://collector.example.com:4318
export OTEL_TRACES_EXPORTER=otlp
export OTEL_METRICS_EXPORTER=otlp
export OTEL_LOGS_EXPORTER=otlp
```

Inspect any `OTEL_EXPORTER_OTLP_TRACES_ENDPOINT`, `OTEL_EXPORTER_OTLP_METRICS_ENDPOINT`, or `OTEL_EXPORTER_OTLP_LOGS_ENDPOINT` override. A signal-specific setting wins over the common endpoint. For HTTP, the common endpoint receives `/v1/traces`, `/v1/metrics`, or `/v1/logs`; a signal-specific endpoint is used as supplied and needs the appropriate path. [OTLP exporter specification](https://opentelemetry.io/docs/specs/otel/protocol/exporter/).

Match the receiving listener's protocol. The Java agent uses `http/protobuf` by default starting with version 2.0, while examples for the standalone SDK may use gRPC. Specify the protocol explicitly when comparing configurations. [Java agent configuration](https://opentelemetry.io/docs/zero-code/java/agent/configuration/).

## Find the configuration that overrides your change

Check the actual service launch definition, container configuration, and injected agent options. In the properties-based agent configuration, JVM system properties have higher priority than environment variables, followed by the agent properties file and extension-supplied defaults. For example, an existing `-Dotel.metrics.exporter=otlp` can override `OTEL_METRICS_EXPORTER=none`.

If the agent uses declarative configuration, inspect that file's exporters and environment substitutions. Do not assume the ordinary environment-variable recipe overrides the file: declarative configuration has its own model and must explicitly reference variables it uses. Support begins with agent 2.26.0. [Agent declarative configuration](https://opentelemetry.io/docs/zero-code/java/agent/declarative-configuration/).

Restart the affected process, send a small known request, and observe it across the configured metric export interval. Verify both that wanted telemetry arrives and that the unwanted connection attempts stop.

If errors persist, identify another process, application-created SDK, vendor agent, or old replica still exporting. A Java agent setting does not reconfigure an independently constructed exporter. Keep the investigation tied to the PID and exporter shown in each error.

## Confirm the repair

Record the before-and-after signal inventory with sensitive headers omitted. Successful trace export plus quiet metrics and logs is the expected result only when those signals were intentionally disabled. When all signals are required, verify one known event or measurement for each destination before closing the issue.
