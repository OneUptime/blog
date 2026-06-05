# How to Fix ClassNotFoundException Errors When OpenTelemetry Java Agent Conflicts

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Java, ClassNotFoundException, Dependencies

Description: Resolve ClassNotFoundException and NoClassDefFoundError caused by conflicts between the OpenTelemetry Java agent and your application.

The OpenTelemetry Java agent bundles, shades, and isolates its own dependencies. Your application should still use its own versions of gRPC, protobuf, Netty, and other libraries. When an instrumented library is outside the agent's supported version range, or when adding the agent exposes an existing application dependency mismatch, you may see `ClassNotFoundException`, `NoClassDefFoundError`, or `NoSuchMethodError` at runtime.

## The Problem

```text
java.lang.NoClassDefFoundError: io/grpc/LoadBalancerProvider
    at com.mycompany.service.GrpcClient.connect(GrpcClient.java:42)
```

Or:

```text
java.lang.NoSuchMethodError: 'io.grpc.ManagedChannelBuilder io.grpc.ManagedChannelBuilder.addTransportFilter(io.grpc.ClientTransportFilter)'
    at com.mycompany.service.GrpcClient.<init>(GrpcClient.java:28)
```

These errors appear after adding the OpenTelemetry agent and go away when the agent is removed.

## Why This Happens

The Java agent uses shading and class loader isolation to keep its own implementation dependencies separate from the application. The usual failure mode is not that the application class loader sees the agent's copy of gRPC or Netty. More commonly, the agent applies bytecode instrumentation to a library version that is not compatible with that instrumentation, or the extra class loading triggered by instrumentation reveals that the application is already resolving an older or inconsistent dependency version.

## Fix 1: Update Your Application Dependencies

Often, the conflict is an old or inconsistent version of a library in your application. Updating your dependency to a version supported by the OpenTelemetry Java agent instrumentation resolves the conflict:

```xml
<!-- Keep gRPC modules aligned with the gRPC BOM -->
<dependencyManagement>
    <dependencies>
        <dependency>
            <groupId>io.grpc</groupId>
            <artifactId>grpc-bom</artifactId>
            <version>1.81.0</version>
            <type>pom</type>
            <scope>import</scope>
        </dependency>
    </dependencies>
</dependencyManagement>

<dependency>
    <groupId>io.grpc</groupId>
    <artifactId>grpc-netty-shaded</artifactId>
</dependency>
```

## Fix 2: Exclude the Conflicting Instrumentation

If the conflict is caused by a specific instrumentation, disable it:

```bash
# Disable gRPC instrumentation if it conflicts with your gRPC version

java -javaagent:opentelemetry-javaagent.jar \
     -Dotel.instrumentation.grpc.enabled=false \
     -jar myapp.jar
```

Common instrumentations that cause conflicts:
- `grpc` - conflicts with application's gRPC version
- `netty` - conflicts with custom Netty configurations
- `okhttp` - conflicts with different OkHttp major versions

## Fix 3: Use an Agent Extension for Custom Instrumentation

Agent extensions can customize agent behavior or add instrumentation. They are not a way to override your application's dependency versions. If the conflict comes from custom instrumentation code, move that custom code into an extension and package the extension with its own dependencies:

```xml
<!-- Extension pom.xml -->
<dependencies>
    <dependency>
        <groupId>io.opentelemetry.javaagent</groupId>
        <artifactId>opentelemetry-javaagent-extension-api</artifactId>
        <version>2.28.1-alpha</version>
        <scope>provided</scope>
    </dependency>
</dependencies>
```

```bash
java -javaagent:opentelemetry-javaagent.jar \
     -Dotel.javaagent.extensions=/path/to/my-extension.jar \
     -jar myapp.jar
```

## Fix 4: Use SDK Instead of Agent

If agent conflicts are persistent, switch to the SDK approach where you control all dependencies:

```xml
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

With the SDK approach, all dependencies are resolved by your build tool (Maven/Gradle) at compile time, eliminating runtime class loading conflicts.

## Diagnosing Class Loading Issues

Use JVM flags to see class loading details:

```bash
java -javaagent:opentelemetry-javaagent.jar \
     -Xlog:class+load=info \
     -jar myapp.jar 2>&1 | grep "io.grpc"
```

This shows which class loader is loading each class:

```text
[0.530s][info][class,load] io.grpc.ManagedChannel source: file:/app/libs/grpc-api-1.55.0.jar
[0.547s][info][class,load] io.grpc.LoadBalancerProvider source: file:/app/libs/grpc-api-1.55.0.jar
```

If the class is loaded from an unexpected application JAR, fix the application's dependency resolution. Agent-internal classes are usually shaded under agent packages and should not replace application classes.

## Maven Dependency Analysis

Use Maven to identify version conflicts:

```bash
mvn dependency:tree -Dincludes=io.grpc

# Output shows:
# io.grpc:grpc-core:jar:1.55.0
#   \- io.grpc:grpc-api:jar:1.55.0
# Make sure all gRPC modules resolve to one compatible version
```

## Gradle Dependency Analysis

```bash
./gradlew dependencies --configuration runtimeClasspath | grep grpc
```

## Fix 5: Use Dependency Exclusions

If a transitive dependency pulls in a conflicting version, exclude it:

```xml
<dependency>
    <groupId>com.google.cloud</groupId>
    <artifactId>google-cloud-storage</artifactId>
    <version>2.30.0</version>
    <exclusions>
        <exclusion>
            <groupId>io.grpc</groupId>
            <artifactId>grpc-core</artifactId>
        </exclusion>
    </exclusions>
</dependency>

<!-- Then add the version you need explicitly -->
<dependency>
    <groupId>io.grpc</groupId>
    <artifactId>grpc-core</artifactId>
    <version>1.81.0</version>
</dependency>
```

In Gradle:

```groovy
implementation('com.google.cloud:google-cloud-storage:2.30.0') {
    exclude group: 'io.grpc', module: 'grpc-core'
}
implementation 'io.grpc:grpc-core:1.81.0'
```

## Common Libraries That Conflict

These are frequent places to check when class loading errors appear after enabling the OpenTelemetry Java agent:

| Library | Agent Instrumentation Support | What to Check | Symptom |
|---------|-------------------------------|---------------|---------|
| io.grpc | gRPC 1.6+ | All gRPC modules resolve to one compatible version | NoSuchMethodError |
| io.netty | Netty HTTP codec 3.8+ / Netty 4.1 instrumentation | Netty modules are aligned by BOM or dependency management | NoClassDefFoundError |
| com.google.protobuf | Used transitively by gRPC and exporters | Protobuf runtime matches generated code expectations | InvalidProtocolBufferException |
| com.squareup.okhttp3 | OkHttp 2.2+ | OkHttp modules are aligned and no old transitive version wins | ClassCastException |

## Creating a Minimal Reproduction

When reporting a conflict, create a minimal reproduction:

```xml
<!-- pom.xml for reproduction -->
<dependencies>
    <dependency>
        <groupId>io.grpc</groupId>
        <artifactId>grpc-netty-shaded</artifactId>
        <version>1.50.0</version>  <!-- Old version -->
    </dependency>
</dependencies>
```

```bash
# Run with the agent to reproduce
java -javaagent:opentelemetry-javaagent.jar \
     -Dotel.javaagent.debug=true \
     -jar repro.jar
```

This helps the OpenTelemetry maintainers fix the compatibility issue in future releases.

## Summary

ClassNotFoundException errors that appear after adding the OpenTelemetry Java agent are usually caused by unsupported instrumented library versions or by dependency mismatches already present in your application. The fixes, in order of preference: update your dependencies, disable conflicting instrumentations, exclude transitive dependencies, use the SDK instead of the agent. Always check `mvn dependency:tree` to understand what versions your application uses before troubleshooting.
