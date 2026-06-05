# How to Troubleshoot OpenTelemetry Java Agent Disabling Itself Due to

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Java, JVM, Compatibility

Description: Fix the issue where the OpenTelemetry Java agent silently disables itself when running on an unsupported or incompatible JVM version.

The OpenTelemetry Java agent requires a minimum JVM version to function. When the JVM version is too old, the agent may fail before its normal startup logging appears, or optional instrumentation compiled for a newer Java version may be skipped. Your application may start normally but produce no telemetry.

## Minimum JVM Requirements

The OpenTelemetry Java agent requires **Java 8+** for basic functionality. Current releases are tested on current LTS and early-access JVM lines:

| Agent Version | Minimum Java | Notes |
|--------------|--------------|-------|
| 1.x | Java 8 | Full support |
| 2.x | Java 8 | Tested on OpenJDK and OpenJ9 versions 8, 11, 17, 21, 25, and 26 |

Some agent features require newer JVM versions:
- Virtual thread instrumentation requires Java 21+
- Some runtime telemetry features depend on JVM-specific support such as JFR availability

## Diagnosing the Issue

### Step 1: Check Your JVM Version

```bash
java -version
# Example output:

# openjdk version "1.8.0_292"
# OpenJDK Runtime Environment (build 1.8.0_292-b10)
```

### Step 2: Enable Agent Debug Logging

```bash
java -javaagent:opentelemetry-javaagent.jar \
     -Dotel.javaagent.debug=true \
     -jar myapp.jar 2>&1 | head -50
```

Look for startup messages like:

```text
[otel.javaagent 2026-02-06 10:00:00:000 +0000] [main] INFO io.opentelemetry.javaagent.tooling.VersionLogger - opentelemetry-javaagent - version: 2.28.1
```

If optional instrumentation was compiled for a newer JVM than the one you are running, debug output can include messages like:

```text
Unable to load instrumentation class: ... has been compiled by a more recent version of the Java Runtime
```

If you see the version line, the agent started successfully. If you do not see it at all, the agent failed to load.

### Step 3: Check for Flags That Disable the Agent or Dynamic Attach

This flag disables the OpenTelemetry agent entirely:

```bash
-Dotel.javaagent.enabled=false
```

These JVM flags affect dynamic attachment through the Attach API, not normal startup with `-javaagent`:

```bash
-XX:+DisableAttachMechanism
-XX:-EnableDynamicAgentLoading  # Java 9+
```

In Java 21+, dynamic agent loading produces a warning. This does not disable a statically loaded `-javaagent`, but may cause confusion:

```text
WARNING: A Java agent has been loaded dynamically
WARNING: If a serviceability tool is in use, please run with -XX:+EnableDynamicAgentLoading to hide this warning
WARNING: Dynamic loading of agents will be disallowed by default in a future release
```

## Fix 1: Update the JVM

Upgrade to a supported JVM version:

```dockerfile
# Use a modern JDK
FROM eclipse-temurin:21-jre-alpine
COPY opentelemetry-javaagent.jar /opt/otel/
COPY myapp.jar /app/
CMD ["java", "-javaagent:/opt/otel/opentelemetry-javaagent.jar", "-jar", "/app/myapp.jar"]
```

## Fix 2: Use an Older Agent Version

If you are already on Java 8+ but a specific agent release has a JVM compatibility regression, use an older agent version that supports your JVM. Older OpenTelemetry Java agents still do not make Java 7 supported:

```bash
# Download agent version compatible with your JVM
curl -L -o opentelemetry-javaagent.jar \
  https://github.com/open-telemetry/opentelemetry-java-instrumentation/releases/download/v1.28.0/opentelemetry-javaagent.jar
```

## Fix 3: Allow Dynamic Agent Loading on Java 21+

Java 21 introduced a warning for dynamic agent loading. While the OpenTelemetry agent uses static attachment when you pass `-javaagent`, dynamically attaching an agent or using a library that attaches one at runtime may trigger the warning:

```bash
# Suppress the warning for dynamic attachment if needed
java -XX:+EnableDynamicAgentLoading \
     -javaagent:opentelemetry-javaagent.jar \
     -jar myapp.jar
```

## Fix 4: Handle IBM J9 and Other JVM Variants

The agent is tested on OpenJDK and OpenJ9. Other runtime targets may need different OpenTelemetry tooling:

- **IBM J9 / OpenJ9**: Tested on Java 8, 11, 17, 21, 25, and 26, though individual runtime telemetry features can depend on JVM support
- **GraalVM Native Image**: The agent does not work with native images (use SDK instead)
- **Android**: Use the OpenTelemetry Android agent/tooling instead of the standard JVM `-javaagent`

For GraalVM native images, use the OpenTelemetry SDK directly:

```java
// SDK approach for GraalVM native
SdkTracerProvider tracerProvider = SdkTracerProvider.builder()
    .addSpanProcessor(BatchSpanProcessor.builder(
        OtlpGrpcSpanExporter.builder().build()).build())
    .build();
```

## Kubernetes Health Check

Add a health check that verifies the telemetry pipeline can create spans:

```java
@RestController
public class HealthController {

    @GetMapping("/health/telemetry")
    public Map<String, Object> telemetryHealth() {
        Map<String, Object> status = new HashMap<>();
        status.put("jvm.version", System.getProperty("java.version"));
        status.put("jvm.vendor", System.getProperty("java.vendor"));

        Tracer tracer = GlobalOpenTelemetry.getTracer("health-check");
        // If an OpenTelemetry SDK is configured, this should create a span with a valid context.
        // Treat this as a telemetry pipeline check, not definitive proof that the Java agent loaded.
        Span testSpan = tracer.spanBuilder("health-check").startSpan();
        boolean sdkActive = testSpan.getSpanContext().isValid();
        testSpan.end();

        status.put("otel.sdk.active", sdkActive);
        return status;
    }
}
```

## Summary

When the OpenTelemetry Java agent produces no telemetry, always check the JVM version first. Enable debug logging to see exactly what the agent detected during startup. Use a supported JVM version (Java 8+) and the latest agent release for the best compatibility. For JVM variants like GraalVM native images, use the SDK instead of the agent.
