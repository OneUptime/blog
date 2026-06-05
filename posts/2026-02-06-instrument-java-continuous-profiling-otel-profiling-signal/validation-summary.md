# Validation Summary: How to Instrument Java Applications for Continuous Profiling

## Status
validated

## Post Type
Tutorial / guide

## Technologies Covered
- OpenTelemetry Java agent
- OpenTelemetry Profiles signal
- OpenTelemetry Java profiles SDK/exporter
- Java Flight Recorder (JFR)
- Java / Spring Boot
- Docker
- OTLP

## Sources Consulted
- OpenTelemetry Java agent documentation: https://opentelemetry.io/docs/zero-code/java/agent/
- OpenTelemetry Java agent configuration documentation: https://opentelemetry.io/docs/zero-code/java/agent/configuration/
- OpenTelemetry Profiles concept documentation: https://opentelemetry.io/docs/concepts/signals/profiles/
- OpenTelemetry Java repository README and source, including alpha profiles SDK/exporter and JFR profiles shim: https://github.com/open-telemetry/opentelemetry-java
- OpenTelemetry Java instrumentation repository runtime telemetry documentation: https://github.com/open-telemetry/opentelemetry-java-instrumentation
- OpenTelemetry eBPF profiler repository: https://github.com/open-telemetry/opentelemetry-ebpf-profiler
- Oracle `jcmd` / JFR command documentation: https://docs.oracle.com/en/java/javase/21/docs/specs/man/jcmd.html
- Dev.java JFR configuration documentation: https://dev.java/learn/jvm/jfr/configure/
- Oracle JDK `jdk.jfr.Event` API documentation: https://docs.oracle.com/en/java/javase/21/docs/api/jdk.jfr/jdk/jfr/Event.html

## Issues Found
- The original post claimed the official OpenTelemetry Java agent can start JFR, convert JFR data to OpenTelemetry Profiles, export profiles through OTLP, and attach trace context to profile samples using `otel.profiling.*` settings. These settings are not documented or present in the official Java agent source. I changed the post to state that the Java agent handles traces, metrics, and logs, while JFR must be started separately with JVM/JFR options. I also noted that OpenTelemetry Java profile SDK/exporter support is alpha and requires separate code or backend-specific integration.
- The original OTLP examples used `http://localhost:4317` without setting `otel.exporter.otlp.protocol=grpc`. OpenTelemetry Java agent 2.x defaults to `http/protobuf`, so I changed examples to port `4318`, the conventional OTLP HTTP endpoint.
- The original command snippets placed shell comments inside continued `java \` commands. Those comments would terminate the shell command and make following `-D...` lines execute incorrectly. I moved comments before the continued commands and removed inline comments from the argument lists.
- The original Docker and environment-variable examples used unsupported `OTEL_PROFILING_*` variables. I replaced them with valid OpenTelemetry environment variables plus `JAVA_TOOL_OPTIONS` for `-javaagent` and `-XX:StartFlightRecording`.
- The original correlation section said trace IDs and span IDs are automatically attached to profile samples. I changed it to explain that the official Java agent does not automatically attach trace context to JFR execution samples; correlation should be done by service metadata, timestamps, thread names, or backend-specific profilers.
- The original production tuning block used unsupported `otel.profiling.*` settings and asserted a specific overhead percentage. I replaced it with valid JFR `settings=default` guidance for continuous recording and kept JVM tuning flags intact.

## Review Notes
OpenTelemetry Profiles and Java profile export are still evolving. Future versions of the OpenTelemetry Java agent or a backend distribution may add direct JFR-to-OTLP profile support, so this post should be rechecked when the Profiles signal reaches a more stable status in Java.
