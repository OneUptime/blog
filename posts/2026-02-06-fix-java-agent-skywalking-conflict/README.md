# How to Fix OpenTelemetry Java Agent Conflicts with SkyWalking or Other Bytecode Instrumentation Agents

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Java, SkyWalking, Bytecode Instrumentation

Description: Resolve class loading and instrumentation conflicts when the OpenTelemetry Java agent runs alongside SkyWalking or other agents.

Running two bytecode instrumentation agents on the same JVM almost always causes problems. When you attach both the OpenTelemetry Java agent and SkyWalking (or New Relic, Datadog, Dynatrace agents), they compete to transform the same classes. The result ranges from duplicate spans to ClassCastException errors to application crashes during startup.

## Why Two Agents Conflict

Both agents use the `java.lang.instrument` API to transform bytecode at class load time. When a class like `javax.servlet.http.HttpServlet` is loaded:

1. Agent A transforms it to add tracing hooks
2. Agent B transforms the already-transformed class to add its own hooks
3. The resulting bytecode may be invalid or produce unexpected behavior

Common symptoms:
- `ClassCastException` or `LinkageError` at runtime
- Duplicate spans (one from each agent)
- Missing spans (one agent's transformation breaks the other's)
- JVM crashes during class loading

## Diagnosing the Conflict

Check your JVM startup flags for multiple `-javaagent` entries:

```bash
# Look for multiple agents
ps aux | grep javaagent

# You might see:
# java -javaagent:/path/to/opentelemetry-javaagent.jar
#      -javaagent:/path/to/skywalking-agent.jar
#      -jar myapp.jar
```

## The Fix: Remove One Agent

The only reliable fix is to use a single instrumentation agent. Remove the agent you are migrating away from:

```bash
# Before (both agents)
java -javaagent:/opt/skywalking/agent/skywalking-agent.jar \
     -javaagent:/opt/otel/opentelemetry-javaagent.jar \
     -jar myapp.jar

# After (OpenTelemetry only)
java -javaagent:/opt/otel/opentelemetry-javaagent.jar \
     -jar myapp.jar
```

## Migration Strategy: Gradual Rollover

If you cannot switch all services at once, migrate service by service:

```yaml
# Kubernetes - service A migrated to OpenTelemetry
apiVersion: apps/v1
kind: Deployment
metadata:
  name: service-a
spec:
  template:
    spec:
      containers:
        - name: app
          env:
            - name: JAVA_TOOL_OPTIONS
              value: "-javaagent:/opt/otel/opentelemetry-javaagent.jar"
            - name: OTEL_SERVICE_NAME
              value: "service-a"
            - name: OTEL_EXPORTER_OTLP_ENDPOINT
              value: "http://otel-collector:4317"
```

```yaml
# Kubernetes - service B still on SkyWalking (will migrate later)
apiVersion: apps/v1
kind: Deployment
metadata:
  name: service-b
spec:
  template:
    spec:
      containers:
        - name: app
          env:
            - name: JAVA_TOOL_OPTIONS
              value: "-javaagent:/opt/skywalking/skywalking-agent.jar"
```

## Bridging During Migration

During the migration period, you need traces from both systems to connect. Use W3C Trace Context propagation, which both OpenTelemetry and SkyWalking support:

```bash
# OpenTelemetry agent - uses W3C Trace Context by default
-Dotel.propagators=tracecontext,baggage

# SkyWalking agent - enable W3C propagation
-Dskywalking.agent.propagation_format=W3C
```

This way, traces cross service boundaries even when services use different agents.

## Disabling Specific OpenTelemetry Instrumentations

If you must temporarily run both agents (not recommended), disable overlapping instrumentations in one of them:

```bash
# Disable specific OpenTelemetry instrumentations to reduce conflicts
java -javaagent:/opt/otel/opentelemetry-javaagent.jar \
     -Dotel.instrumentation.servlet.enabled=false \
     -Dotel.instrumentation.spring-web.enabled=false \
     -javaagent:/opt/skywalking/skywalking-agent.jar \
     -jar myapp.jar
```

This is fragile and not a long-term solution, but it can help during a brief transition period.

## Checking for Hidden Agents

Some APM tools embed agents in unexpected places:

```bash
# Check for agents in Docker images
find / -name "*agent*.jar" 2>/dev/null

# Check JAVA_TOOL_OPTIONS (auto-attaches agents)
echo $JAVA_TOOL_OPTIONS

# Check for agents in application server configs
grep -r "javaagent" /opt/tomcat/bin/
```

Agents can also be attached via `JAVA_TOOL_OPTIONS`, init containers in Kubernetes, or application server configuration files.

## Summary

Never run two bytecode instrumentation agents on the same JVM. The conflicts are unpredictable and often difficult to debug. Migrate services one at a time, use W3C Trace Context propagation to bridge the gap during migration, and remove the old agent completely before adding the new one.
