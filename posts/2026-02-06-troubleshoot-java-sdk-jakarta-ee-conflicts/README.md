# How to Troubleshoot OpenTelemetry Java SDK Version Conflicts with Jakarta EE Application Servers

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Java, Jakarta EE, Application Servers

Description: Resolve version conflicts between the OpenTelemetry Java SDK and Jakarta EE application servers like Tomcat, WildFly, and Payara.

Jakarta EE application servers (Tomcat, WildFly, Payara, Open Liberty) have their own class loaders that can conflict with the OpenTelemetry Java agent or SDK. The javax-to-jakarta namespace migration adds another layer of complexity, as the agent needs to know whether your server uses `javax.servlet` or `jakarta.servlet`.

## The javax vs jakarta Problem

Jakarta EE 9+ renamed all packages from `javax.*` to `jakarta.*`:

- `javax.servlet.http.HttpServlet` became `jakarta.servlet.http.HttpServlet`
- `javax.ws.rs.Path` became `jakarta.ws.rs.Path`

The OpenTelemetry Java agent includes instrumentation for both namespaces, but it needs to detect which one your server uses. If detection fails, the wrong instrumentation is applied, and no spans are generated.

## Diagnosing the Issue

Enable agent debug logging:

```bash
java -javaagent:opentelemetry-javaagent.jar \
     -Dotel.javaagent.debug=true \
     -jar myapp.war
```

Look for:

```
# Good - correct namespace detected
Transformed class jakarta/servlet/http/HttpServlet

# Bad - wrong namespace or no transformation
No transformation applied to javax/servlet/http/HttpServlet
```

## Fix 1: Use the Latest Agent Version

The latest agent versions have improved detection for both namespaces:

```bash
curl -L -o opentelemetry-javaagent.jar \
  https://github.com/open-telemetry/opentelemetry-java-instrumentation/releases/latest/download/opentelemetry-javaagent.jar
```

## Fix 2: Specify the Servlet Version Explicitly

If auto-detection fails, tell the agent which namespace to use:

```bash
# For Jakarta EE 9+ (Tomcat 10+, WildFly 27+)
java -javaagent:opentelemetry-javaagent.jar \
     -Dotel.instrumentation.servlet.enabled=true \
     -jar server.jar

# The agent should auto-detect, but verify in debug output
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
CATALINA_OPTS="$CATALINA_OPTS -Dotel.exporter.otlp.endpoint=http://collector:4317"
```

### WildFly / JBoss EAP

WildFly has a modular class loader. The agent needs to be loaded at the JVM level:

```bash
# standalone.conf
JAVA_OPTS="$JAVA_OPTS -javaagent:/opt/otel/opentelemetry-javaagent.jar"
```

If you encounter `ClassNotFoundException` for OpenTelemetry classes, add a JBoss module dependency:

```xml
<!-- META-INF/jboss-deployment-structure.xml -->
<jboss-deployment-structure>
    <deployment>
        <dependencies>
            <system export="true">
                <paths>
                    <path name="io/opentelemetry"/>
                </paths>
            </system>
        </dependencies>
    </deployment>
</jboss-deployment-structure>
```

### Payara / GlassFish

```bash
# domain.xml or asadmin
asadmin create-jvm-options -- "-javaagent:/opt/otel/opentelemetry-javaagent.jar"
asadmin create-system-properties OTEL_SERVICE_NAME=payara-app
```

## Fix 4: Use SDK Instead of Agent for Application Server Deployments

If agent conflicts are persistent, use the OpenTelemetry SDK directly in your WAR:

```xml
<!-- pom.xml -->
<dependency>
    <groupId>io.opentelemetry</groupId>
    <artifactId>opentelemetry-api</artifactId>
    <version>1.34.0</version>
</dependency>
<dependency>
    <groupId>io.opentelemetry</groupId>
    <artifactId>opentelemetry-sdk</artifactId>
    <version>1.34.0</version>
</dependency>
<dependency>
    <groupId>io.opentelemetry</groupId>
    <artifactId>opentelemetry-exporter-otlp</artifactId>
    <version>1.34.0</version>
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
                ResourceAttributes.SERVICE_NAME, "my-ee-app")))
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
| `ClassNotFoundException: jakarta.servlet.Filter` | Server uses javax, agent expects jakarta | Update server or agent |
| `LinkageError: loader constraint violation` | Class loaded by both app server and agent | Use `provided` scope for shared deps |
| `NoSuchMethodError` in servlet class | Version mismatch between javax and jakarta | Align servlet API versions |

## Summary

Application servers add complexity to OpenTelemetry deployment because of their hierarchical class loaders and the javax-to-jakarta migration. Use the latest agent version, deploy the agent at the JVM level (not in the WAR), and verify the correct servlet namespace is detected through debug logging. When agent conflicts persist, the SDK approach gives you full control over class loading.
