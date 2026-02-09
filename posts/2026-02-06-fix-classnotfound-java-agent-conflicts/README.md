# How to Fix ClassNotFoundException Errors When OpenTelemetry Java Agent Conflicts with Application Dependencies

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Java, ClassNotFoundException, Dependencies

Description: Resolve ClassNotFoundException and NoClassDefFoundError caused by conflicts between the OpenTelemetry Java agent and your application.

The OpenTelemetry Java agent bundles its own dependencies (gRPC, protobuf, Netty, etc.). When your application uses different versions of these same libraries, class loading conflicts can occur, resulting in `ClassNotFoundException`, `NoClassDefFoundError`, or `NoSuchMethodError` at runtime.

## The Problem

```
java.lang.NoClassDefFoundError: io/grpc/LoadBalancerProvider
    at com.mycompany.service.GrpcClient.connect(GrpcClient.java:42)
```

Or:

```
java.lang.NoSuchMethodError: 'void io.grpc.ManagedChannelBuilder.forTarget(java.lang.String)'
    at com.mycompany.service.GrpcClient.<init>(GrpcClient.java:28)
```

These errors appear after adding the OpenTelemetry agent and go away when the agent is removed.

## Why This Happens

The Java agent uses a class loader isolation mechanism to keep its dependencies separate from the application. However, this isolation is not perfect. When the agent instruments a class, it may cause the application class loader to see the agent's version of a shared dependency instead of the application's version.

## Fix 1: Update Your Application Dependencies

Often, the conflict is between an old version of a library in your application and a newer version in the agent. Updating your dependency resolves the conflict:

```xml
<!-- Update gRPC to match what the agent expects -->
<dependency>
    <groupId>io.grpc</groupId>
    <artifactId>grpc-core</artifactId>
    <version>1.60.0</version>
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

## Fix 3: Use the Agent Extension to Override Dependencies

Create an agent extension that provides the correct library version:

```xml
<!-- Extension pom.xml -->
<dependencies>
    <dependency>
        <groupId>io.grpc</groupId>
        <artifactId>grpc-core</artifactId>
        <version>1.55.0</version>  <!-- Your application's version -->
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

With the SDK approach, all dependencies are resolved by your build tool (Maven/Gradle) at compile time, eliminating runtime class loading conflicts.

## Diagnosing Class Loading Issues

Use JVM flags to see class loading details:

```bash
java -javaagent:opentelemetry-javaagent.jar \
     -verbose:class \
     -jar myapp.jar 2>&1 | grep "io.grpc"
```

This shows which class loader is loading each class:

```
[Loaded io.grpc.ManagedChannel from file:/app/myapp.jar]
[Loaded io.grpc.ManagedChannel from opentelemetry-javaagent.jar]
```

If you see the same class loaded from two locations, that is the conflict.

## Maven Dependency Analysis

Use Maven to identify version conflicts:

```bash
mvn dependency:tree -Dincludes=io.grpc

# Output shows:
# io.grpc:grpc-core:jar:1.55.0
#   \- io.grpc:grpc-api:jar:1.55.0
# But the agent bundles grpc 1.60.0
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
    <version>1.60.0</version>
</dependency>
```

In Gradle:

```groovy
implementation('com.google.cloud:google-cloud-storage:2.30.0') {
    exclude group: 'io.grpc', module: 'grpc-core'
}
implementation 'io.grpc:grpc-core:1.60.0'
```

## Common Libraries That Conflict

These are the most frequent sources of class loading conflicts with the OpenTelemetry Java agent:

| Library | Agent Version | Common App Version | Symptom |
|---------|--------------|-------------------|---------|
| io.grpc | 1.60+ | 1.40-1.55 | NoSuchMethodError |
| io.netty | 4.1.100+ | 4.1.60-4.1.90 | NoClassDefFoundError |
| com.google.protobuf | 3.25+ | 3.19-3.23 | InvalidProtocolBufferException |
| com.squareup.okhttp3 | 4.x | 3.x | ClassCastException |

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

ClassNotFoundException errors with the OpenTelemetry Java agent are caused by class loading conflicts between the agent's bundled dependencies and your application's dependencies. The fixes, in order of preference: update your dependencies, disable conflicting instrumentations, exclude transitive dependencies, use the SDK instead of the agent. Always check `mvn dependency:tree` to understand what versions your application uses before troubleshooting.
