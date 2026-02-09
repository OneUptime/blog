# How to Fix the OpenTelemetry Java Agent Not Starting by Checking the OTEL_JAVAAGENT_DEBUG Log Output

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Java, Debugging, Agent Startup

Description: Use the OTEL_JAVAAGENT_DEBUG flag to diagnose why the OpenTelemetry Java agent fails to start or does not produce spans.

When the OpenTelemetry Java agent does not work, the first step is always to enable debug logging. The agent's debug output tells you exactly what happened during startup: which instrumentations were applied, which failed, what configuration was detected, and whether the exporter can reach the Collector. Without this output, you are guessing.

## Enabling Debug Logging

```bash
# Method 1: System property
java -javaagent:opentelemetry-javaagent.jar \
     -Dotel.javaagent.debug=true \
     -jar myapp.jar

# Method 2: Environment variable
export OTEL_JAVAAGENT_DEBUG=true
java -javaagent:opentelemetry-javaagent.jar -jar myapp.jar
```

## Reading the Debug Output

The debug output is verbose. Here is what to look for:

### Successful Startup

```
[otel.javaagent] INFO - opentelemetry-javaagent 1.32.0
[otel.javaagent] INFO - Runtime configuration:
  otel.exporter.otlp.endpoint = http://localhost:4317
  otel.service.name = my-service
[otel.javaagent] DEBUG - Transformed class javax/servlet/http/HttpServlet
[otel.javaagent] DEBUG - Transformed class org/springframework/web/servlet/FrameworkServlet
[otel.javaagent] INFO - Installed 42 instrumentations
```

### Common Failure: Agent JAR Not Found

```bash
# Error: agent file does not exist
Error occurred during initialization of VM
agent library failed to init: instrument
```

**Fix:** Verify the agent JAR path:

```bash
ls -la /path/to/opentelemetry-javaagent.jar
```

### Common Failure: Exporter Cannot Connect

```
[otel.javaagent] WARN - Failed to export spans.
  Server responded with UNAVAILABLE.
  Make sure your Collector is running and reachable.
```

**Fix:** Check that the Collector is running and the endpoint is correct:

```bash
# Test gRPC connectivity
grpcurl -plaintext localhost:4317 list

# Test HTTP connectivity
curl http://localhost:4318/v1/traces -d '{}' -H "Content-Type: application/json"
```

### Common Failure: No Instrumentations Applied

```
[otel.javaagent] INFO - Installed 0 instrumentations
```

This means no supported libraries were detected. Check that your application actually uses libraries the agent knows about.

### Common Failure: Class Transformation Error

```
[otel.javaagent] ERROR - Failed to transform class com/mycompany/MyClass
java.lang.IllegalStateException: Cannot resolve type description for ...
```

**Fix:** This usually indicates a class loading conflict. Try disabling the problematic instrumentation:

```bash
-Dotel.instrumentation.spring-webmvc.enabled=false
```

## Essential Configuration Check

The debug output shows all resolved configuration. Verify these values:

```
otel.service.name = my-service           # Not "unknown_service"
otel.exporter.otlp.endpoint = http://..  # Points to your Collector
otel.traces.exporter = otlp              # Not "none"
otel.metrics.exporter = otlp             # Not "none"
```

## Checking Configuration Sources

The agent reads configuration from multiple sources in this priority order:

1. System properties (`-Dotel.service.name=...`)
2. Environment variables (`OTEL_SERVICE_NAME=...`)
3. Configuration file (`-Dotel.javaagent.configuration-file=config.properties`)
4. Defaults

If a value is wrong, check all sources to find where it is being set:

```bash
# Check environment variables
env | grep OTEL

# Check system properties in the JVM command line
ps aux | grep java | grep -oP '\-Dotel\.\S+'
```

## A Diagnostic Startup Script

```bash
#!/bin/bash
# start-with-diagnostics.sh

echo "=== Environment Variables ==="
env | grep OTEL | sort

echo "=== Agent JAR ==="
ls -la ${OTEL_JAVAAGENT_JAR:-opentelemetry-javaagent.jar}

echo "=== Collector Connectivity ==="
curl -s -o /dev/null -w "HTTP %{http_code}" \
  ${OTEL_EXPORTER_OTLP_ENDPOINT:-http://localhost:4318}/v1/traces \
  -H "Content-Type: application/json" -d '{}' || echo "FAILED"

echo "=== Starting Application ==="
exec java \
  -javaagent:${OTEL_JAVAAGENT_JAR:-opentelemetry-javaagent.jar} \
  -Dotel.javaagent.debug=true \
  -jar myapp.jar
```

## Reducing Debug Noise for Specific Issues

If debug output is too verbose, use the logging configuration to focus on specific areas:

```bash
# Only show instrumentation-related debug messages
-Dotel.javaagent.logging=simple
-Dotel.javaagent.debug=true
```

Or redirect debug output to a file for analysis:

```bash
java -javaagent:opentelemetry-javaagent.jar \
     -Dotel.javaagent.debug=true \
     -jar myapp.jar 2>/tmp/otel-debug.log
```

Then search the file:

```bash
grep -i "error\|warn\|fail" /tmp/otel-debug.log
```

The `OTEL_JAVAAGENT_DEBUG=true` flag is your most powerful troubleshooting tool. When the agent is not working, enable it, read the output, and the answer is almost always in the logs.
