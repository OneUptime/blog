# How to Fix the Mistake of Mixing OpenTelemetry API

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Java, Maven, Dependency Management

Description: Resolve NoSuchMethodError and IncompatibleClassChangeError caused by mixing different OpenTelemetry API and SDK versions in Java.

In Java multi-module projects (Maven or Gradle), it is common for different modules to depend on different versions of the OpenTelemetry API and SDK. When module A uses API 1.30.0 and module B uses API 1.34.0, the build tool resolves to one version, and the other module may break with `NoSuchMethodError` or `IncompatibleClassChangeError` at runtime.

## The Problem

A typical multi-module project:

```text
my-project/
  module-api/        -> depends on opentelemetry-api:1.30.0
  module-service/    -> depends on opentelemetry-api:1.34.0
  module-web/        -> depends on both modules
```

Maven resolves the conflict using "nearest wins" strategy. If `module-web` is the entry point, the version used depends on which module is listed first in the dependencies.

## Diagnosing Version Conflicts

### Maven

```bash
mvn dependency:tree -Dincludes=io.opentelemetry

# Look for conflicting versions:

# [INFO] \- io.opentelemetry:opentelemetry-api:jar:1.30.0:compile
# [INFO] \- io.opentelemetry:opentelemetry-sdk:jar:1.34.0:compile
```

### Gradle

```bash
./gradlew dependencies --configuration runtimeClasspath | grep opentelemetry
```

### Runtime Detection

The error typically looks like:

```text
java.lang.NoSuchMethodError:
  '... io.opentelemetry...SomeClass.someMethod(...)'
```

This means the code was compiled against a version that has the method, but the runtime has a different version that does not. OpenTelemetry's stable Java API has strong backward compatibility guarantees, so between close stable versions such as 1.30.0 and 1.34.0 this is more likely to happen when an older transitive dependency, an alpha artifact, or instrumentation dependency pulls in an incompatible OpenTelemetry artifact.

## Fix 1: Use a BOM (Bill of Materials)

OpenTelemetry provides BOMs that ensure related packages use compatible versions. Use the core BOM for API and SDK dependencies. If you use instrumentation dependencies such as the Spring Boot starter, use the instrumentation BOM instead; it also manages compatible core API and SDK versions.

### Maven

```xml
<dependencyManagement>
    <dependencies>
        <dependency>
            <groupId>io.opentelemetry.instrumentation</groupId>
            <artifactId>opentelemetry-instrumentation-bom</artifactId>
            <version>2.1.0</version>
            <type>pom</type>
            <scope>import</scope>
        </dependency>
    </dependencies>
</dependencyManagement>

<!-- Now declare dependencies without versions -->
<dependencies>
    <dependency>
        <groupId>io.opentelemetry</groupId>
        <artifactId>opentelemetry-api</artifactId>
        <!-- Version comes from BOM -->
    </dependency>
    <dependency>
        <groupId>io.opentelemetry</groupId>
        <artifactId>opentelemetry-sdk</artifactId>
    </dependency>
</dependencies>
```

### Gradle

```groovy
dependencies {
    implementation platform('io.opentelemetry.instrumentation:opentelemetry-instrumentation-bom:2.1.0')

    // Versions are resolved by the platform
    implementation 'io.opentelemetry:opentelemetry-api'
    implementation 'io.opentelemetry:opentelemetry-sdk'
}
```

## Fix 2: Enforce Version Consistency in the Parent POM

For multi-module Maven projects, declare the BOM in the parent POM:

```xml
<!-- parent/pom.xml -->
<project>
    <groupId>com.mycompany</groupId>
    <artifactId>my-project-parent</artifactId>
    <packaging>pom</packaging>

    <dependencyManagement>
        <dependencies>
            <dependency>
                <groupId>io.opentelemetry.instrumentation</groupId>
                <artifactId>opentelemetry-instrumentation-bom</artifactId>
                <version>2.1.0</version>
                <type>pom</type>
                <scope>import</scope>
            </dependency>
        </dependencies>
    </dependencyManagement>

    <modules>
        <module>module-api</module>
        <module>module-service</module>
        <module>module-web</module>
    </modules>
</project>
```

All child modules inherit the version management:

```xml
<!-- module-api/pom.xml -->
<dependencies>
    <dependency>
        <groupId>io.opentelemetry</groupId>
        <artifactId>opentelemetry-api</artifactId>
        <!-- Version managed by parent -->
    </dependency>
</dependencies>
```

## Fix 3: Use Maven Enforcer Plugin

Add the Maven Enforcer plugin to fail the build if versions conflict:

```xml
<plugin>
    <groupId>org.apache.maven.plugins</groupId>
    <artifactId>maven-enforcer-plugin</artifactId>
    <executions>
        <execution>
            <id>enforce-versions</id>
            <goals>
                <goal>enforce</goal>
            </goals>
            <configuration>
                <rules>
                    <dependencyConvergence />
                </rules>
            </configuration>
        </execution>
    </executions>
</plugin>
```

The `dependencyConvergence` rule fails the build if any dependency is resolved to different versions through different paths.

## Which Versions Must Match

Packages published from the same OpenTelemetry Java repository generally use the same version. Use the matching BOM so these groups resolve to compatible versions:

**Group 1: Core API and SDK** (managed by `opentelemetry-bom`):
- `opentelemetry-api`
- `opentelemetry-sdk`
- `opentelemetry-sdk-trace`
- `opentelemetry-sdk-metrics`
- `opentelemetry-sdk-logs`
- `opentelemetry-exporter-otlp`

**Group 2: Instrumentation** (managed by `opentelemetry-instrumentation-bom`, which also imports a compatible core BOM):
- `opentelemetry-instrumentation-api`
- `opentelemetry-spring-boot-starter`
- All `opentelemetry-*-instrumentation` packages

The instrumentation BOM handles both groups correctly when you use instrumentation dependencies.

## Checking at Runtime

Add a startup check that verifies version consistency:

```java
@PostConstruct
public void verifyOtelVersions() {
    String apiVersion = io.opentelemetry.api.OpenTelemetry.class.getPackage().getImplementationVersion();
    logger.info("OpenTelemetry API version: {}", apiVersion);

    // Compare this with the SDK version resolved in your dependency tree
}
```

## Summary

Never specify OpenTelemetry versions directly on individual dependencies in multi-module projects. Always use the BOM to manage versions from a single location. Add the Maven Enforcer plugin or Gradle's resolution strategy to catch conflicts at build time. Version mismatches between API and SDK are one of the most common causes of runtime errors in Java OpenTelemetry projects.
