# How to Troubleshoot Slow Spring Boot Startup Caused by OpenTelemetry Java Agent

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Java, Spring Boot, Performance

Description: Diagnose and reduce Spring Boot startup time when the OpenTelemetry Java agent adds significant overhead from class transformation.

The OpenTelemetry Java agent instruments your application by transforming bytecode at class load time. Spring Boot applications load thousands of classes during startup, and the agent examines matching classes to determine if they should be instrumented. This can add noticeable startup time, depending on the application size and the number of enabled instrumentations.

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

A 14-second increase is possible for large Spring Boot applications, but measure your own service because the overhead depends on the application, JVM, and enabled instrumentations.

## Diagnosing What is Slow

Enable the agent's debug logging to see which classes are transformed:

```bash
java -javaagent:opentelemetry-javaagent.jar \
     -Dotel.javaagent.debug=true \
     -jar myapp.jar 2>&1 | grep "Transformed"
```

This shows which classes are being transformed. The debug logs are very verbose and can slow the application down, so use them only while diagnosing startup behavior.

## Fix 1: Disable Unused Instrumentations

The agent ships with instrumentations for dozens of libraries. If you only use Spring Web and JDBC, disable everything else:

```bash
java -javaagent:opentelemetry-javaagent.jar \
     -Dotel.instrumentation.common.default-enabled=false \
     -Dotel.instrumentation.spring-web.enabled=true \
     -Dotel.instrumentation.spring-webmvc.enabled=true \
     -Dotel.instrumentation.jdbc.enabled=true \
     -Dotel.instrumentation.http-url-connection.enabled=true \
     -jar myapp.jar
```

The `otel.instrumentation.common.default-enabled=false` flag disables all agent instrumentations, then you selectively enable only what you need. This can cut startup time significantly because the agent skips instrumentation modules for unused libraries. This is advanced usage because some instrumentations depend on others, so validate your traces after changing it.

## Fix 2: Exclude Classes That Should Not Be Instrumented

If one application package is expensive or problematic to instrument, exclude it from all agent instrumentation:

```bash
java -javaagent:opentelemetry-javaagent.jar \
     -Dotel.javaagent.exclude-classes=com.example.generated.*,com.example.legacy.LegacyClass \
     -jar myapp.jar
```

Use this carefully because excluding classes can leave some instrumentation partially applied.

## Fix 3: Use the Slim Agent

If you need a single custom agent jar, use the OpenTelemetry Java instrumentation distribution example and keep it aligned with the agent version you run:

```kotlin
dependencies {
    upstreamAgent("io.opentelemetry.javaagent:opentelemetry-javaagent:2.28.1")
}
```

For most users, an extension loaded with `-Dotel.javaagent.extensions=/path/to/extension.jar` is easier to maintain than rebuilding a custom distribution.

## Fix 4: Use Spring Boot Application Class Data Sharing

Java's Application Class Data Sharing (AppCDS) can reduce JVM class loading work on subsequent starts. It does not replace agent transformation work, so benchmark it with your actual agent flags before relying on it:

```bash
# Step 1: Extract the Spring Boot application
java -Djarmode=tools -jar myapp.jar extract --destination application

# Step 2: Run once and create the CDS archive when the context has refreshed
cd application
java -XX:ArchiveClassesAtExit=application.jsa \
     -Dspring.context.exit=onRefresh \
     -jar myapp.jar

# Step 3: Use the shared archive with the extracted application
java -javaagent:../opentelemetry-javaagent.jar \
     -XX:SharedArchiveFile=application.jsa \
     -jar myapp.jar
```

## Fix 5: Use SDK Instead of Agent

For maximum startup speed, replace the Java agent with the OpenTelemetry SDK and manual instrumentation:

```xml
<dependencyManagement>
    <dependencies>
        <dependency>
            <groupId>io.opentelemetry.instrumentation</groupId>
            <artifactId>opentelemetry-instrumentation-bom</artifactId>
            <version>2.28.1</version>
            <type>pom</type>
            <scope>import</scope>
        </dependency>
    </dependencies>
</dependencyManagement>

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

The Spring Boot starter does not use the Java agent's bytecode transformation, so it can reduce startup overhead. It also has less out-of-the-box instrumentation coverage than the agent.

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
| Full agent | Highest | Everything auto-instrumented |
| Agent with disabled instrumentations | Medium | Only selected libraries |
| Spring Boot starter (no agent) | Low | Spring-specific auto-config |
| Manual SDK only | ~0s | Only what you manually instrument |

Choose the approach that balances startup time with the instrumentation coverage you need. For development, the Spring Boot starter is often sufficient. For production, the agent with disabled unused instrumentations is a good compromise.
