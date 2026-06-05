# How to Troubleshoot OpenTelemetry Java SDK Version Conflicts

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Java, Jakarta EE, Application Server

Description: Resolve version conflicts between the OpenTelemetry Java SDK and Jakarta EE application servers like Tomcat, WildFly, and Payara.

Jakarta EE application servers and servlet containers (Tomcat, WildFly, Payara, Open Liberty) have their own class loaders that can conflict with the OpenTelemetry Java agent or SDK. The javax-to-jakarta namespace migration adds another layer of complexity, because the agent has separate servlet instrumentation for the legacy `javax.servlet` API and the newer `jakarta.servlet` API.

## The javax vs jakarta Problem

Jakarta EE 9+ renamed all packages from `javax.*` to `jakarta.*`:

- `javax.servlet.http.HttpServlet` became `jakarta.servlet.http.HttpServlet`
- `javax.ws.rs.Path` became `jakarta.ws.rs.Path`

The OpenTelemetry Java agent includes instrumentation for both namespaces, but the application and server must use matching APIs. If your application, server, or dependencies mix incompatible `javax` and `jakarta` servlet APIs, the expected servlet classes may not load or no servlet spans may be generated.

## Diagnosing the Issue

Enable agent debug logging:

```bash
java -javaagent:opentelemetry-javaagent.jar \
     -Dotel.javaagent.debug=true \
     -jar server.jar
```

Look for:

```text
# Good - correct namespace detected

Applying instrumentation: servlet-5.0

# Bad - wrong namespace or no transformation
ClassNotFoundException: jakarta.servlet.Filter
```

## Fix 1: Use the Latest Agent Version

The latest agent versions have improved detection for both namespaces:

```bash
curl -L -o opentelemetry-javaagent.jar \
  https://github.com/open-telemetry/opentelemetry-java-instrumentation/releases/latest/download/opentelemetry-javaagent.jar
```

## Fix 2: Verify Servlet Instrumentation Is Enabled

Servlet instrumentation is enabled by default. If you disabled default instrumentation globally, enable it again and verify that your server and application use the same servlet namespace:

```bash
# For Jakarta EE 9+ (Tomcat 10+, WildFly 27+)
java -javaagent:opentelemetry-javaagent.jar \
     -Dotel.instrumentation.servlet.enabled=true \
     -jar server.jar

# The agent should match the servlet API on the classpath, but verify in debug output
```

## Fix 3: Handle Application Server Class Loading

Application servers use hierarchical class loaders. The agent's classes may conflict with the server's libraries.

### Tomcat

For Tomcat, place the agent on the JVM command line, not in the webapp:

```bash
# catalina.sh
export JAVA_OPTS="$JAVA_OPTS -javaagent:/opt/otel/opentelemetry-javaagent.jar"
```

Or in `setenv.sh`:

```bash
# tomcat/bin/setenv.sh
CATALINA_OPTS="$CATALINA_OPTS -javaagent:/opt/otel/opentelemetry-javaagent.jar"
CATALINA_OPTS="$CATALINA_OPTS -Dotel.service.name=tomcat-app"
CATALINA_OPTS="$CATALINA_OPTS -Dotel.exporter.otlp.endpoint=http://collector:4318"
```

### WildFly / JBoss EAP

WildFly has a modular class loader. The agent needs to be loaded at the JVM level:

```bash
# standalone.conf
JAVA_OPTS="$JAVA_OPTS -javaagent:/opt/otel/opentelemetry-javaagent.jar"
```

If you encounter `ClassNotFoundException` for OpenTelemetry classes in your application code, add the OpenTelemetry API or SDK dependencies to your WAR. Do not rely on the agent JAR to provide application compile-time dependencies.

### Payara / GlassFish

```bash
# domain.xml or asadmin
asadmin create-jvm-options "-javaagent\:/opt/otel/opentelemetry-javaagent.jar"
asadmin create-system-properties otel.service.name=payara-app
```

## Fix 4: Use SDK Instead of Agent for Application Server Deployments

If agent conflicts are persistent, use the OpenTelemetry SDK directly in your WAR:

```xml
<!-- pom.xml -->
<dependency>
    <groupId>io.opentelemetry</groupId>
    <artifactId>opentelemetry-api</artifactId>
    <version>1.62.0</version>
</dependency>
<dependency>
    <groupId>io.opentelemetry</groupId>
    <artifactId>opentelemetry-sdk</artifactId>
    <version>1.62.0</version>
</dependency>
<dependency>
    <groupId>io.opentelemetry</groupId>
    <artifactId>opentelemetry-exporter-otlp</artifactId>
    <version>1.62.0</version>
</dependency>
```

Initialize in a `ServletContextListener`:

```java
@WebListener
public class OtelInitializer implements ServletContextListener {
    @Override
    public void contextInitialized(ServletContextEvent sce) {
        SdkTracerProvider tracerProvider = SdkTracerProvider.builder()
            .addSpanProcessor(BatchSpanProcessor.builder(
                OtlpGrpcSpanExporter.builder().build()).build())
            .setResource(Resource.create(Attributes.of(
                AttributeKey.stringKey("service.name"), "my-ee-app")))
            .build();

        OpenTelemetrySdk sdk = OpenTelemetrySdk.builder()
            .setTracerProvider(tracerProvider)
            .buildAndRegisterGlobal();
    }
}
```

## Common Error Messages

| Error | Cause | Fix |
|-------|-------|-----|
| `ClassNotFoundException: jakarta.servlet.Filter` | Application or library expects Jakarta Servlet, but the server provides the older javax Servlet API | Run on a Jakarta EE 9+ server or use javax-compatible dependencies |
| `LinkageError: loader constraint violation` | Servlet or Jakarta EE API loaded by both the app and the server | Use `provided` scope for server-provided APIs |
| `NoSuchMethodError` in servlet class | Version mismatch between servlet API and server implementation | Align servlet API versions |

## Summary

Application servers add complexity to OpenTelemetry deployment because of their hierarchical class loaders and the javax-to-jakarta migration. Use the latest agent version, deploy the agent at the JVM level (not in the WAR), and verify the correct servlet namespace is detected through debug logging. When agent conflicts persist, the SDK approach gives you full control over class loading.
