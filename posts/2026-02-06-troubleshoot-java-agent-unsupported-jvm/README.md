# How to Troubleshoot OpenTelemetry Java Agent Disabling Itself Due to Unsupported JVM Versions

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Java, JVM, Compatibility

Description: Fix the issue where the OpenTelemetry Java agent silently disables itself when running on an unsupported or incompatible JVM version.

The OpenTelemetry Java agent requires a minimum JVM version to function. When the JVM version is too old, the agent disables itself silently - no error, no warning in the default log output. Your application starts normally but produces no telemetry.

## Minimum JVM Requirements

The OpenTelemetry Java agent requires **Java 8+** for basic functionality. However, specific versions have additional requirements:

| Agent Version | Minimum Java | Notes |
|--------------|--------------|-------|
| 1.x | Java 8 | Full support |
| 2.x | Java 8 | Java 8+ required, Java 17+ recommended |

Some agent features require newer JVM versions:
- Virtual thread instrumentation requires Java 21+
- Some module system features require Java 11+

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

Look for messages like:

```
[otel.javaagent] WARN - Java version 1.7 is not supported. Agent will be disabled.
```

Or:

```
[otel.javaagent] INFO - opentelemetry-javaagent 1.32.0
```

If you see the version line, the agent started successfully. If you do not see it at all, the agent failed to load.

### Step 3: Check for JVM Flags That Disable the Agent

Some JVM flags can prevent the agent from loading:

```bash
# These flags can interfere
-XX:+DisableAttachMechanism
-XX:-EnableDynamicAgentLoading  # Java 21+
```

In Java 21+, dynamic agent loading produces a warning. This does not disable the agent but may cause confusion:

```
WARNING: A terminally deprecated method in java.lang.System has been called
WARNING: System::setSecurityManager will be removed in a future release
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

If upgrading the JVM is not possible, use an older agent version that supports your JVM:

```bash
# Download agent version compatible with your JVM
curl -L -o opentelemetry-javaagent.jar \
  https://github.com/open-telemetry/opentelemetry-java-instrumentation/releases/download/v1.28.0/opentelemetry-javaagent.jar
```

## Fix 3: Allow Dynamic Agent Loading on Java 21+

Java 21 introduced a warning for dynamic agent loading. While the OpenTelemetry agent uses static attachment (via `-javaagent`), some configurations may trigger the warning:

```bash
# Suppress the warning if needed
java -XX:+EnableDynamicAgentLoading \
     -javaagent:opentelemetry-javaagent.jar \
     -jar myapp.jar
```

## Fix 4: Handle IBM J9 and Other JVM Variants

The agent is tested primarily on HotSpot (OpenJDK, Oracle JDK). Other JVM implementations may have issues:

- **IBM J9 / OpenJ9**: Generally supported but some instrumentations may not work
- **GraalVM Native Image**: The agent does not work with native images (use SDK instead)
- **Android**: Not supported

For GraalVM native images, use the OpenTelemetry SDK directly:

```java
// SDK approach for GraalVM native
SdkTracerProvider tracerProvider = SdkTracerProvider.builder()
    .addSpanProcessor(BatchSpanProcessor.builder(
        OtlpGrpcSpanExporter.builder().build()).build())
    .build();
```

## Kubernetes Health Check

Add a health check that verifies the agent is active:

```java
@RestController
public class HealthController {

    @GetMapping("/health/telemetry")
    public Map<String, Object> telemetryHealth() {
        Map<String, Object> status = new HashMap<>();
        status.put("jvm.version", System.getProperty("java.version"));
        status.put("jvm.vendor", System.getProperty("java.vendor"));

        Tracer tracer = GlobalOpenTelemetry.getTracer("health-check");
        // If the agent is active, this returns a real tracer
        // If not, it returns a no-op tracer
        Span testSpan = tracer.spanBuilder("health-check").startSpan();
        boolean agentActive = testSpan.getSpanContext().isValid();
        testSpan.end();

        status.put("otel.agent.active", agentActive);
        return status;
    }
}
```

## Summary

When the OpenTelemetry Java agent produces no telemetry, always check the JVM version first. Enable debug logging to see exactly what the agent detected during startup. Use a supported JVM version (Java 8+) and the latest agent release for the best compatibility. For JVM variants like GraalVM native images, use the SDK instead of the agent.
