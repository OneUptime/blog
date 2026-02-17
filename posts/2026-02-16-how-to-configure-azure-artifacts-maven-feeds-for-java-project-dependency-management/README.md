# How to Configure Azure Artifacts Maven Feeds for Java Project Dependency Management

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure Artifacts, Maven, Java, Dependency Management, Azure DevOps, CI/CD, Package Management

Description: Step-by-step guide to setting up Azure Artifacts Maven feeds for managing Java dependencies, including publishing and consuming packages.

---

Managing Java dependencies in an enterprise environment means more than just pulling packages from Maven Central. Teams often produce internal libraries that need to be shared across projects, and those libraries need a proper package repository. Azure Artifacts provides exactly that - a fully managed Maven feed that integrates tightly with Azure DevOps pipelines and your local development workflow.

In this post, I will walk through setting up a Maven feed in Azure Artifacts, configuring your projects to publish and consume packages from it, and integrating everything with your CI/CD pipeline.

## Creating a Maven Feed in Azure Artifacts

Start by navigating to your Azure DevOps project and clicking on Artifacts in the left sidebar. Click "Create Feed" and fill in the details:

- Give the feed a descriptive name like `java-internal` or `team-libs`
- Choose the visibility - organization-scoped feeds are accessible to all projects, while project-scoped feeds are limited to the current project
- Decide whether to include packages from public upstream sources (Maven Central, Google Maven). Enabling upstream sources means your feed acts as a proxy - developers point to one feed and get both internal and public packages

Once the feed is created, click "Connect to feed" and select Maven. Azure DevOps will show you the configuration snippets you need.

## Configuring Your Local Maven Settings

To authenticate with Azure Artifacts from your development machine, you need to update your Maven `settings.xml` file. This file typically lives at `~/.m2/settings.xml`.

First, generate a Personal Access Token (PAT) with Packaging (Read & Write) permissions. Then configure your settings:

```xml
<!-- ~/.m2/settings.xml -->
<settings xmlns="http://maven.apache.org/SETTINGS/1.0.0"
          xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
          xsi:schemaLocation="http://maven.apache.org/SETTINGS/1.0.0
                              https://maven.apache.org/xsd/settings-1.0.0.xsd">
  <servers>
    <!-- Server entry for Azure Artifacts authentication -->
    <server>
      <id>azure-artifacts-feed</id>
      <username>AzureDevOps</username>
      <!-- Use your Personal Access Token as the password -->
      <password>YOUR_PAT_HERE</password>
    </server>
  </servers>
</settings>
```

For better security, you can encrypt the PAT using Maven's built-in password encryption:

```bash
# Generate a master password and store it securely
mvn --encrypt-master-password YourMasterPassword

# Then encrypt your PAT with the master password
mvn --encrypt-password YourPATHere
```

## Configuring pom.xml for the Feed

Your project's `pom.xml` needs two sections: one for resolving dependencies from the feed, and one for publishing artifacts to it.

```xml
<project>
    <!-- Standard project coordinates -->
    <groupId>com.mycompany.services</groupId>
    <artifactId>shared-utils</artifactId>
    <version>1.2.0</version>
    <packaging>jar</packaging>

    <!-- Repository configuration for downloading dependencies -->
    <repositories>
        <repository>
            <!-- This ID must match the server ID in settings.xml -->
            <id>azure-artifacts-feed</id>
            <url>https://pkgs.dev.azure.com/myorg/myproject/_packaging/java-internal/maven/v1</url>
            <releases>
                <enabled>true</enabled>
            </releases>
            <snapshots>
                <enabled>true</enabled>
            </snapshots>
        </repository>
    </repositories>

    <!-- Distribution management for publishing artifacts -->
    <distributionManagement>
        <repository>
            <id>azure-artifacts-feed</id>
            <url>https://pkgs.dev.azure.com/myorg/myproject/_packaging/java-internal/maven/v1</url>
        </repository>
        <snapshotRepository>
            <id>azure-artifacts-feed</id>
            <url>https://pkgs.dev.azure.com/myorg/myproject/_packaging/java-internal/maven/v1</url>
        </snapshotRepository>
    </distributionManagement>
</project>
```

## Publishing Your First Package

With the configuration in place, publishing a package is a standard Maven deploy:

```bash
# Build and publish to Azure Artifacts
mvn clean deploy -DskipTests
```

If everything is set up correctly, you will see the artifact appear in your Azure Artifacts feed within a few seconds. The feed UI shows the package name, version, download count, and dependency graph.

## Consuming Packages from the Feed

Once a package is published, other projects can consume it by adding the same repository configuration to their `pom.xml` and declaring the dependency:

```xml
<!-- Add this dependency to your consumer project's pom.xml -->
<dependency>
    <groupId>com.mycompany.services</groupId>
    <artifactId>shared-utils</artifactId>
    <version>1.2.0</version>
</dependency>
```

As long as the consuming project has the repository and server configuration, Maven will resolve the dependency from your Azure Artifacts feed.

## Setting Up Upstream Sources

Upstream sources let your feed proxy requests to Maven Central and other public repositories. This gives you several benefits: a single feed URL for all dependencies, caching of public packages (so builds don't break if Maven Central has an outage), and the ability to control which public packages are allowed.

To configure upstream sources, go to your feed settings and click "Upstream sources." Add Maven Central and any other public feeds you need. The order matters - Azure Artifacts checks upstream sources in order and returns the first match.

## Pipeline Integration for Automated Publishing

The real power comes when you integrate Azure Artifacts with your build pipeline. Here is a pipeline that builds a Java library and publishes it to the feed:

```yaml
# Azure Pipeline for building and publishing a Java library
trigger:
  branches:
    include:
      - main

pool:
  vmImage: 'ubuntu-latest'

steps:
  # Use a specific Java version for consistent builds
  - task: MavenAuthenticate@0
    inputs:
      artifactsFeeds: 'java-internal'
    displayName: 'Authenticate with Azure Artifacts'

  # Build and test the project
  - task: Maven@4
    inputs:
      mavenPomFile: 'pom.xml'
      goals: 'clean verify'
      options: '-B'  # Batch mode for non-interactive builds
      publishJUnitResults: true
      testResultsFiles: '**/surefire-reports/TEST-*.xml'
      javaHomeOption: 'JDKVersion'
      jdkVersionOption: '1.17'
    displayName: 'Build and test'

  # Publish to Azure Artifacts (only on main branch)
  - task: Maven@4
    inputs:
      mavenPomFile: 'pom.xml'
      goals: 'deploy'
      options: '-B -DskipTests'
      javaHomeOption: 'JDKVersion'
      jdkVersionOption: '1.17'
    displayName: 'Publish to Azure Artifacts'
```

The `MavenAuthenticate` task handles authentication automatically in the pipeline - you don't need to configure PATs or settings.xml files manually.

## Version Management Strategies

When publishing to Azure Artifacts, you need a versioning strategy. Here are the common approaches:

For release versions, use semantic versioning (e.g., `1.2.3`). Azure Artifacts won't let you overwrite a release version once it's published, which is exactly what you want for reproducibility.

For development builds, use SNAPSHOT versions (e.g., `1.3.0-SNAPSHOT`). Snapshots can be overwritten, so every build on the develop branch can publish without changing the version number.

You can automate version bumping in your pipeline:

```yaml
# Automatically set the version based on the build number
- script: |
    # Replace SNAPSHOT with build-specific version for release branches
    mvn versions:set -DnewVersion=1.2.$(Build.BuildId) -DgenerateBackupPoms=false
  displayName: 'Set build version'
  condition: eq(variables['Build.SourceBranch'], 'refs/heads/main')
```

## Feed Retention and Cleanup

Over time, feeds can accumulate a lot of old versions. Azure Artifacts has retention policies to help manage this:

- Navigate to Feed Settings and look for Retention Policies
- Set the maximum number of versions to keep per package (e.g., keep the latest 10 versions)
- SNAPSHOT versions should have more aggressive cleanup since they're meant to be temporary

You can also delete old versions through the REST API:

```bash
# Delete a specific package version via the API
curl -X DELETE \
  -H "Authorization: Basic $(echo -n :$PAT | base64)" \
  "https://pkgs.dev.azure.com/myorg/_apis/packaging/feeds/java-internal/maven/groups/com.mycompany.services/artifacts/shared-utils/versions/1.0.0?api-version=7.1"
```

## Gradle Configuration

If your team uses Gradle instead of Maven, the setup is similar. Here is the Gradle equivalent:

```groovy
// build.gradle - repository configuration for Azure Artifacts
repositories {
    maven {
        url "https://pkgs.dev.azure.com/myorg/myproject/_packaging/java-internal/maven/v1"
        credentials {
            username "AzureDevOps"
            // Read from environment variable or gradle.properties
            password System.getenv("AZURE_ARTIFACTS_PAT") ?: project.findProperty("azureArtifactsPat")
        }
    }
    mavenCentral()
}

// Publishing configuration
publishing {
    publications {
        maven(MavenPublication) {
            from components.java
        }
    }
    repositories {
        maven {
            url "https://pkgs.dev.azure.com/myorg/myproject/_packaging/java-internal/maven/v1"
            credentials {
                username "AzureDevOps"
                password System.getenv("AZURE_ARTIFACTS_PAT") ?: project.findProperty("azureArtifactsPat")
            }
        }
    }
}
```

## Access Control and Permissions

Azure Artifacts feeds have their own permission model. You can control who can read from and publish to a feed:

- Readers can download packages but not publish
- Collaborators can publish new packages and versions
- Contributors have full control including deleting packages
- Feed administrators can manage settings and permissions

For most teams, developers should be Collaborators (so they can publish during local development) and the build service account should also be a Collaborator. Only leads or DevOps engineers need Administrator access.

## Wrapping Up

Azure Artifacts Maven feeds give Java teams a solid, integrated solution for managing internal packages. The tight integration with Azure Pipelines means your CI/CD workflow can build, test, and publish libraries with minimal configuration. Combined with upstream sources for proxying public repositories, you get a single, reliable source for all your Java dependencies. Set it up once, and your team can focus on writing code instead of wrestling with dependency management.
