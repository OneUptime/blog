# How to Troubleshoot Slow Spring Boot Startup Caused by OpenTelemetry Java Agent Class Transformation

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Java, Spring Boot, Performance

Description: Diagnose and reduce Spring Boot startup time when the OpenTelemetry Java agent adds significant overhead from class transformation.

The OpenTelemetry Java agent instruments your application by transforming bytecode at class load time. Spring Boot applications load thousands of classes during startup, and the agent examines each one to determine if it should be instrumented. This can add 5 to 30 seconds to startup time, depending on the application size and the number of enabled instrumentations.

## Measuring the Impact

Compare startup times with and without the agent:

```bash
# Without agent
time java -jar myapp.jar
# Started in 8.2 seconds

# With agent
time java -javaagent:opentelemetry-javaagent.jar -jar myapp.jar
# Started in 22.5 seconds
```

A 14-second increase is common for large Spring Boot applications.

## Diagnosing What is Slow

Enable the agent's debug logging to see class transformation times:

```bash
java -javaagent:opentelemetry-javaagent.jar \
     -Dotel.javaagent.debug=true \
     -jar myapp.jar 2>&1 | grep "Transformed"
```

This shows which classes are being transformed and how long each one takes.

## Fix 1: Disable Unused Instrumentations

The agent ships with instrumentations for dozens of libraries. If you only use Spring Web and JDBC, disable everything else:

```bash
java -javaagent:opentelemetry-javaagent.jar \
     -Dotel.instrumentation.default.enabled=false \
     -Dotel.instrumentation.spring-web.enabled=true \
     -Dotel.instrumentation.spring-webmvc.enabled=true \
     -Dotel.instrumentation.jdbc.enabled=true \
     -Dotel.instrumentation.http-url-connection.enabled=true \
     -jar myapp.jar
```

The `default.enabled=false` flag disables all instrumentations, then you selectively enable only what you need. This can cut startup time significantly because the agent skips class examination for unused libraries.

## Fix 2: Use Lazy Instrumentation

Some instrumentations support lazy loading, where classes are transformed on first use rather than at startup:

```bash
java -javaagent:opentelemetry-javaagent.jar \
     -Dotel.javaagent.experimental.early-class-transform=false \
     -jar myapp.jar
```

## Fix 3: Use the Slim Agent

Build a custom agent with only the instrumentations you need using the agent extension mechanism:

```xml
<!-- pom.xml for custom agent build -->
<dependencies>
    <dependency>
        <groupId>io.opentelemetry.javaagent</groupId>
        <artifactId>opentelemetry-javaagent</artifactId>
        <version>1.32.0</version>
    </dependency>
</dependencies>
```

Or use the OpenTelemetry Java agent builder to create a slim agent.

## Fix 4: Use Spring Boot Application Class Data Sharing

Java's Application Class Data Sharing (AppCDS) can cache the transformed classes so they do not need to be re-transformed on subsequent startups:

```bash
# Step 1: Create the class list
java -javaagent:opentelemetry-javaagent.jar \
     -XX:DumpLoadedClassList=classes.lst \
     -jar myapp.jar

# Step 2: Create the shared archive
java -javaagent:opentelemetry-javaagent.jar \
     -XX:SharedClassListFile=classes.lst \
     -XX:SharedArchiveFile=app.jsa \
     -Xshare:dump \
     -jar myapp.jar

# Step 3: Use the shared archive
java -javaagent:opentelemetry-javaagent.jar \
     -XX:SharedArchiveFile=app.jsa \
     -Xshare:on \
     -jar myapp.jar
```

## Fix 5: Use SDK Instead of Agent

For maximum startup speed, replace the Java agent with the OpenTelemetry SDK and manual instrumentation:

```xml
<dependency>
    <groupId>io.opentelemetry</groupId>
    <artifactId>opentelemetry-api</artifactId>
</dependency>
<dependency>
    <groupId>io.opentelemetry</groupId>
    <artifactId>opentelemetry-sdk</artifactId>
</dependency>
<dependency>
    <groupId>io.opentelemetry.instrumentation</groupId>
    <artifactId>opentelemetry-spring-boot-starter</artifactId>
</dependency>
```

The Spring Boot starter uses Spring's bean post-processors instead of bytecode transformation, which is significantly faster at startup.

## Kubernetes Startup Probes

If you cannot reduce startup time, adjust your Kubernetes probes to account for it:

```yaml
spec:
  containers:
    - name: app
      startupProbe:
        httpGet:
          path: /actuator/health
          port: 8080
        initialDelaySeconds: 30
        periodSeconds: 5
        failureThreshold: 10
      readinessProbe:
        httpGet:
          path: /actuator/health
          port: 8080
        periodSeconds: 10
```

## Comparing Approaches

| Approach | Startup Impact | Instrumentation Coverage |
|----------|---------------|------------------------|
| Full agent | +15-30s | Everything auto-instrumented |
| Agent with disabled instrumentations | +5-10s | Only selected libraries |
| Spring Boot starter (no agent) | +1-2s | Spring-specific auto-config |
| Manual SDK only | ~0s | Only what you manually instrument |

Choose the approach that balances startup time with the instrumentation coverage you need. For development, the Spring Boot starter is often sufficient. For production, the agent with disabled unused instrumentations is a good compromise.
