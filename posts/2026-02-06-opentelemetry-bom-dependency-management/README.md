# How to Understand the OpenTelemetry BOM (Bill of Materials) for Dependency Management

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, BOM, Dependencies, Java, Version Management

Description: Master OpenTelemetry dependency management using the BOM to avoid version conflicts and simplify your Java project configuration.

Managing dependencies in Java projects can become a nightmare when dealing with complex libraries like OpenTelemetry. The OpenTelemetry BOM (Bill of Materials) solves this problem by providing a centralized way to manage all OpenTelemetry dependency versions.

## What is a BOM?

A Bill of Materials in Maven and Gradle is a special POM file that declares a set of related dependencies with specific versions. When you import a BOM, you can reference those dependencies without specifying versions, knowing they're all tested to work together.

Think of it as a curated package of compatible library versions. Instead of hunting down which version of `opentelemetry-api` works with which version of `opentelemetry-sdk`, the BOM handles this coordination for you.

## Why OpenTelemetry Needs a BOM

OpenTelemetry consists of dozens of separate artifacts. The core library includes the API, SDK, exporters, instrumentations, and extensions. Each has its own versioning, but they need to work together seamlessly.

Without a BOM, your `pom.xml` might look like this mess:

```xml
<!-- Manual dependency management - error prone and tedious -->
<dependencies>
    <dependency>
        <groupId>io.opentelemetry</groupId>
        <artifactId>opentelemetry-api</artifactId>
        <version>1.34.1</version>
    </dependency>
    <dependency>
        <groupId>io.opentelemetry</groupId>
        <artifactId>opentelemetry-sdk</artifactId>
        <version>1.34.1</version>
    </dependency>
    <dependency>
        <groupId>io.opentelemetry</groupId>
        <artifactId>opentelemetry-sdk-metrics</artifactId>
        <version>1.34.1</version>
    </dependency>
    <dependency>
        <groupId>io.opentelemetry</groupId>
        <artifactId>opentelemetry-exporter-otlp</artifactId>
        <version>1.34.1</version>
    </dependency>
    <!-- Many more dependencies... -->
</dependencies>
```

Each version number is duplicated. Update one wrong, and you face runtime conflicts.

## Setting Up the OpenTelemetry BOM

The BOM simplifies everything. Here's how to configure it in Maven:

```xml
<!-- Import the OpenTelemetry BOM in your dependencyManagement section -->
<dependencyManagement>
    <dependencies>
        <dependency>
            <groupId>io.opentelemetry</groupId>
            <artifactId>opentelemetry-bom</artifactId>
            <version>1.34.1</version>
            <type>pom</type>
            <scope>import</scope>
        </dependency>
    </dependencies>
</dependencyManagement>
```

Now your actual dependencies section becomes much cleaner:

```xml
<!-- No version numbers needed - inherited from BOM -->
<dependencies>
    <dependency>
        <groupId>io.opentelemetry</groupId>
        <artifactId>opentelemetry-api</artifactId>
    </dependency>
    <dependency>
        <groupId>io.opentelemetry</groupId>
        <artifactId>opentelemetry-sdk</artifactId>
    </dependency>
    <dependency>
        <groupId>io.opentelemetry</groupId>
        <artifactId>opentelemetry-sdk-metrics</artifactId>
    </dependency>
    <dependency>
        <groupId>io.opentelemetry</groupId>
        <artifactId>opentelemetry-exporter-otlp</artifactId>
    </dependency>
</dependencies>
```

The versions are inherited from the BOM. You specify the version once, and all dependencies stay in sync.

## Using the BOM with Gradle

Gradle users can achieve the same result with slightly different syntax:

```groovy
// Import the OpenTelemetry BOM in your build.gradle
dependencies {
    // Import the BOM
    implementation platform('io.opentelemetry:opentelemetry-bom:1.34.1')

    // Now add dependencies without versions
    implementation 'io.opentelemetry:opentelemetry-api'
    implementation 'io.opentelemetry:opentelemetry-sdk'
    implementation 'io.opentelemetry:opentelemetry-sdk-metrics'
    implementation 'io.opentelemetry:opentelemetry-exporter-otlp'
}
```

For Gradle Kotlin DSL:

```kotlin
// build.gradle.kts
dependencies {
    // Import the BOM using platform()
    implementation(platform("io.opentelemetry:opentelemetry-bom:1.34.1"))

    // Dependencies inherit versions from BOM
    implementation("io.opentelemetry:opentelemetry-api")
    implementation("io.opentelemetry:opentelemetry-sdk")
    implementation("io.opentelemetry:opentelemetry-sdk-metrics")
    implementation("io.opentelemetry:opentelemetry-exporter-otlp")
}
```

## Understanding BOM Versioning

The OpenTelemetry BOM follows semantic versioning. Each BOM version corresponds to a specific set of component versions that have been tested together.

The BOM version typically matches the core API and SDK versions. For example, BOM version `1.34.1` includes:
- `opentelemetry-api:1.34.1`
- `opentelemetry-sdk:1.34.1`
- `opentelemetry-exporter-otlp:1.34.1`
- And dozens more compatible components

You can view exactly what's included by checking the BOM POM file in the Maven repository or on GitHub.

## The OpenTelemetry Instrumentation BOM

OpenTelemetry maintains a separate BOM for instrumentation libraries. These are the auto-instrumentation agents for frameworks like Spring Boot, JDBC, Apache HttpClient, and others.

```xml
<!-- Add the instrumentation BOM separately -->
<dependencyManagement>
    <dependencies>
        <dependency>
            <groupId>io.opentelemetry</groupId>
            <artifactId>opentelemetry-bom</artifactId>
            <version>1.34.1</version>
            <type>pom</type>
            <scope>import</scope>
        </dependency>
        <dependency>
            <groupId>io.opentelemetry.instrumentation</groupId>
            <artifactId>opentelemetry-instrumentation-bom-alpha</artifactId>
            <version>2.0.0-alpha</version>
            <type>pom</type>
            <scope>import</scope>
        </dependency>
    </dependencies>
</dependencyManagement>
```

The instrumentation BOM uses a different versioning scheme because many instrumentations are still in alpha. This separate BOM allows them to evolve independently from the stable core API.

Now you can add instrumentations without version numbers:

```xml
<dependencies>
    <!-- Versions managed by instrumentation BOM -->
    <dependency>
        <groupId>io.opentelemetry.instrumentation</groupId>
        <artifactId>opentelemetry-spring-boot-starter</artifactId>
    </dependency>
    <dependency>
        <groupId>io.opentelemetry.instrumentation</groupId>
        <artifactId>opentelemetry-jdbc</artifactId>
    </dependency>
</dependencies>
```

## Handling Version Conflicts

Sometimes you need to override a specific dependency version managed by the BOM. Maybe you need a bug fix that's only in a newer version, or you need to match a version used elsewhere in your project.

In Maven, you can override by explicitly specifying a version:

```xml
<dependencies>
    <!-- This overrides the BOM version -->
    <dependency>
        <groupId>io.opentelemetry</groupId>
        <artifactId>opentelemetry-api</artifactId>
        <version>1.35.0</version>
    </dependency>

    <!-- These still use BOM versions -->
    <dependency>
        <groupId>io.opentelemetry</groupId>
        <artifactId>opentelemetry-sdk</artifactId>
    </dependency>
</dependencies>
```

However, be cautious. Mixing versions can introduce incompatibilities. The BOM exists precisely to prevent these issues.

In Gradle, overrides work similarly:

```groovy
dependencies {
    implementation platform('io.opentelemetry:opentelemetry-bom:1.34.1')

    // Override BOM version for specific dependency
    implementation('io.opentelemetry:opentelemetry-api:1.35.0')

    // Others use BOM version
    implementation 'io.opentelemetry:opentelemetry-sdk'
}
```

## BOM Best Practices

Keep these principles in mind when using the OpenTelemetry BOM:

**Update regularly.** OpenTelemetry evolves quickly. Check for BOM updates monthly. New versions often include important bug fixes and performance improvements.

**Use one BOM version.** Don't mix multiple BOM versions in the same project. Pick one version and stick with it until you're ready to upgrade everything.

**Avoid version overrides.** Only override BOM-managed versions when absolutely necessary. Each override is a potential source of bugs.

**Check transitive dependencies.** Sometimes other libraries bring in OpenTelemetry dependencies. Use `mvn dependency:tree` or `gradle dependencies` to spot conflicts.

**Test after BOM upgrades.** OpenTelemetry maintains API stability, but behavior can change between versions. Run your full test suite after upgrading.

## Multi-Module Projects

In multi-module Maven projects, define the BOM in the parent POM:

```xml
<!-- parent/pom.xml -->
<project>
    <dependencyManagement>
        <dependencies>
            <dependency>
                <groupId>io.opentelemetry</groupId>
                <artifactId>opentelemetry-bom</artifactId>
                <version>1.34.1</version>
                <type>pom</type>
                <scope>import</scope>
            </dependency>
        </dependencies>
    </dependencyManagement>
</project>
```

Child modules inherit the BOM automatically:

```xml
<!-- module/pom.xml -->
<project>
    <parent>
        <groupId>com.example</groupId>
        <artifactId>parent</artifactId>
        <version>1.0.0</version>
    </parent>

    <dependencies>
        <!-- Version inherited from parent BOM -->
        <dependency>
            <groupId>io.opentelemetry</groupId>
            <artifactId>opentelemetry-api</artifactId>
        </dependency>
    </dependencies>
</project>
```

This ensures consistent OpenTelemetry versions across all modules.

## Beyond Java

While the BOM is a Java ecosystem concept, other languages have equivalent mechanisms. JavaScript uses `package.json` with exact versions, Python uses `requirements.txt` or `poetry`, Go uses `go.mod`.

OpenTelemetry provides language-specific distribution packages that serve similar purposes:

- JavaScript: `@opentelemetry/api` and `@opentelemetry/sdk-node` with peer dependencies
- Python: `opentelemetry-distro` bundle
- Go: Module versioning with go.mod

The principle remains the same: manage related dependency versions together to ensure compatibility.

## Troubleshooting Common Issues

**Problem:** Build fails with "Could not resolve dependencies"

This usually means the BOM version doesn't exist or your Maven/Gradle repository configuration is wrong. Verify the version exists in Maven Central and check your repository settings.

**Problem:** Runtime errors about missing methods or classes

You likely have version conflicts. Run `mvn dependency:tree` or `gradle dependencies` to find where different versions are coming from. Look for OpenTelemetry dependencies brought in transitively by other libraries.

**Problem:** Instrumentation not working after BOM upgrade

Instrumentation libraries sometimes lag behind core API updates. Check the instrumentation BOM changelog for known issues. You may need to wait for an instrumentation update.

## Keeping Up with BOM Releases

OpenTelemetry releases new versions frequently. Follow these resources to stay informed:

- GitHub releases page: https://github.com/open-telemetry/opentelemetry-java/releases
- Maven Central: Search for `opentelemetry-bom` to see available versions
- OpenTelemetry Slack: Join the #java channel for announcements

Consider setting up Dependabot or Renovate to automatically create pull requests when new BOM versions are released.

The OpenTelemetry BOM transforms dependency management from a tedious, error-prone task into a simple one-liner. By centralizing version management, you reduce configuration overhead and prevent subtle runtime bugs caused by version mismatches. Whether you're starting a new project or migrating an existing one, adopting the BOM should be your first step.
