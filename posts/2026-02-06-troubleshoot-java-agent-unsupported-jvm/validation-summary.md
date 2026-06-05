# Validation Summary: How to Troubleshoot OpenTelemetry Java Agent Disabling Itself Due to

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- OpenTelemetry Java agent
- OpenTelemetry Java SDK
- Java/JVM
- OpenJDK and OpenJ9
- Java Attach API and dynamic agent loading
- GraalVM Native Image
- Android OpenTelemetry tooling
- Docker
- Kubernetes/Spring health checks

## Sources Consulted
- OpenTelemetry Java instrumentation README: https://github.com/open-telemetry/opentelemetry-java-instrumentation
- OpenTelemetry Java agent supported libraries, frameworks, application servers, and JVMs: https://github.com/open-telemetry/opentelemetry-java-instrumentation/blob/main/docs/supported-libraries.md
- OpenTelemetry Java agent configuration documentation: https://opentelemetry.io/docs/zero-code/java/agent/configuration/
- OpenTelemetry Java agent disabling documentation: https://opentelemetry.io/docs/zero-code/java/agent/disable/
- OpenJDK JEP 451, Prepare to Disallow the Dynamic Loading of Agents: https://openjdk.org/jeps/451
- OpenTelemetry Android repository: https://github.com/open-telemetry/opentelemetry-android
- OpenTelemetry Java instrumentation source files inspected locally from the upstream repository, including `OpenTelemetryAgent.java`, `SafeServiceLoader.java`, and virtual thread instrumentation.

## Issues Found
- The post claimed unsupported JVMs cause the agent to disable itself silently with no default warning. I changed this to state that the agent may fail before normal startup logging appears, or optional instrumentation compiled for a newer Java version may be skipped.
- The 2.x support table said Java 17+ was recommended. I updated it to match the current upstream tested JVM matrix for OpenJDK and OpenJ9 versions 8, 11, 17, 21, 25, and 26.
- The debug log examples used an inaccurate unsupported-Java warning and an incomplete version-line format. I replaced them with the current version logger format and the kind of unsupported class-version message emitted when optional instrumentation cannot load on an older JVM.
- The JVM flag section incorrectly suggested `-XX:+DisableAttachMechanism` and `-XX:-EnableDynamicAgentLoading` can prevent normal `-javaagent` startup. I clarified that these affect dynamic attachment through the Attach API, and added the actual OpenTelemetry flag `-Dotel.javaagent.enabled=false`.
- The Java 21 warning example was unrelated to dynamic agent loading. I replaced it with the warning text described by JEP 451.
- The older-agent workaround implied older OpenTelemetry agents could support unsupported JVMs such as Java 7. I added a caveat that OpenTelemetry Java agents still require Java 8+.
- The OpenJ9 section understated upstream support. I updated it to reflect current OpenJ9 test coverage while preserving a caveat for JVM-specific runtime telemetry features.
- The Android note said Android was simply unsupported. I changed it to direct readers to OpenTelemetry Android tooling instead of the standard JVM `-javaagent`.
- The Kubernetes health check claimed to prove the Java agent was active. I changed it to describe an OpenTelemetry SDK/pipeline check and renamed the reported status key from `otel.agent.active` to `otel.sdk.active`.

## Review Notes
The Java snippets omit imports and full application setup, but the APIs shown are plausible as illustrative snippets. The health-check approach is still only a heuristic for telemetry configuration and should not be treated as definitive proof of Java agent startup.
