# How to Troubleshoot Missing Spans When the OpenTelemetry Java Agent Cannot Instrument Shaded Libraries

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Java, Shading, Library Instrumentation

Description: Understand why the OpenTelemetry Java agent cannot instrument shaded or relocated libraries and learn workarounds.

Java library shading (also called shadowing or relocation) renames package paths to avoid dependency conflicts. When a library shades its dependencies, the OpenTelemetry Java agent cannot find them because the class names no longer match what the instrumentation expects. The agent looks for `io.grpc.ManagedChannel` but the shaded library has renamed it to `com.mycompany.shaded.io.grpc.ManagedChannel`.

## What Shading Does

Shading is a build-time process that rewrites package names:

```xml
<!-- Maven shade plugin configuration -->
<plugin>
    <groupId>org.apache.maven.plugins</groupId>
    <artifactId>maven-shade-plugin</artifactId>
    <configuration>
        <relocations>
            <relocation>
                <pattern>io.grpc</pattern>
                <shadedPattern>com.mycompany.shaded.io.grpc</shadedPattern>
            </relocation>
        </relocations>
    </configuration>
</plugin>
```

After shading, `io.grpc.ManagedChannel` becomes `com.mycompany.shaded.io.grpc.ManagedChannel`. The OpenTelemetry agent's gRPC instrumentation only knows about `io.grpc.ManagedChannel` and skips the shaded version.

## Diagnosing the Issue

Enable agent debug logging:

```bash
java -javaagent:opentelemetry-javaagent.jar \
     -Dotel.javaagent.debug=true \
     -jar myapp.jar
```

You will NOT see transformation messages for the shaded classes. The agent does not even try to instrument them because the class names do not match.

Check if your dependencies are shaded:

```bash
# List classes in the jar
jar tf mylib.jar | grep grpc

# If you see paths like:
# com/mycompany/shaded/io/grpc/ManagedChannel.class
# ...the library is shaded
```

## Workaround 1: Use the Unshaded Library

If you control the dependency, use the unshaded version:

```xml
<dependency>
    <groupId>com.mycompany</groupId>
    <artifactId>my-library</artifactId>
    <version>1.0.0</version>
    <!-- Use classifier to get unshaded version if available -->
    <classifier>original</classifier>
</dependency>
```

## Workaround 2: Add Manual Instrumentation

Since auto-instrumentation cannot find shaded classes, add manual spans around the calls:

```java
import io.opentelemetry.api.trace.Tracer;
import io.opentelemetry.api.trace.Span;

@Service
public class MyGrpcClient {

    private final Tracer tracer;

    public MyGrpcClient(Tracer tracer) {
        this.tracer = tracer;
    }

    public Response callService(Request request) {
        Span span = tracer.spanBuilder("grpc.call")
            .setAttribute("rpc.service", "MyService")
            .setAttribute("rpc.method", "myMethod")
            .startSpan();

        try (Scope scope = span.makeCurrent()) {
            // Call the shaded gRPC library
            return shadedGrpcClient.myMethod(request);
        } catch (Exception e) {
            span.setStatus(StatusCode.ERROR, e.getMessage());
            span.recordException(e);
            throw e;
        } finally {
            span.end();
        }
    }
}
```

## Workaround 3: Write a Custom Instrumentation Extension

For the OpenTelemetry Java agent, you can write an extension that targets the shaded class names:

```java
// Custom instrumentation for shaded gRPC
@AutoService(InstrumentationModule.class)
public class ShadedGrpcInstrumentationModule extends InstrumentationModule {

    public ShadedGrpcInstrumentationModule() {
        super("shaded-grpc", "shaded-grpc-1.0");
    }

    @Override
    public List<TypeInstrumentation> typeInstrumentations() {
        return List.of(new ShadedManagedChannelInstrumentation());
    }
}

class ShadedManagedChannelInstrumentation implements TypeInstrumentation {
    @Override
    public ElementMatcher<TypeDescription> typeMatcher() {
        // Match the SHADED class name
        return named("com.mycompany.shaded.io.grpc.internal.ManagedChannelImpl");
    }

    // ... define the advice methods
}
```

Build this as a JAR and attach it as an agent extension:

```bash
java -javaagent:opentelemetry-javaagent.jar \
     -Dotel.javaagent.extensions=/path/to/my-extension.jar \
     -jar myapp.jar
```

## Workaround 4: Exclude the Library from Shading

If you control the build, exclude the instrumented library from the shade plugin:

```xml
<plugin>
    <groupId>org.apache.maven.plugins</groupId>
    <artifactId>maven-shade-plugin</artifactId>
    <configuration>
        <relocations>
            <relocation>
                <pattern>com.google</pattern>
                <shadedPattern>com.mycompany.shaded.com.google</shadedPattern>
                <excludes>
                    <!-- Do not shade gRPC so OTel can instrument it -->
                    <exclude>io.grpc.**</exclude>
                </excludes>
            </relocation>
        </relocations>
    </configuration>
</plugin>
```

## Common Libraries That Get Shaded

- `io.grpc` (gRPC) - shaded by many Google Cloud libraries
- `io.netty` - shaded by gRPC and other networking libraries
- `org.apache.http` (HttpClient) - shaded by Elasticsearch clients
- `com.google.protobuf` - shaded by various Google libraries

## Summary

The OpenTelemetry Java agent cannot instrument shaded libraries because class name matching fails. The best fix is to use unshaded versions of libraries when possible. When shading is unavoidable, add manual instrumentation or write custom agent extensions that target the shaded class names.
