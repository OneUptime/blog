# How to Set Up a Maven Repository in Artifact Registry for Java Package Management

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Artifact Registry, Maven, Java, Package Management, DevOps

Description: Learn how to create a Maven repository in Google Artifact Registry, configure your Java projects to publish and consume packages from it.

---

If your team builds Java applications on GCP, hosting your own Maven repository in Artifact Registry makes a lot of sense. You get a private repository that integrates with GCP IAM, works with standard Maven tooling, and sits close to your build and deployment infrastructure.

Setting this up is not complicated, but there are a few pieces that need to be configured correctly - the repository itself, Maven authentication, and your project's pom.xml. Let me walk through each piece.

## Creating the Maven Repository

First, enable the Artifact Registry API and create the repository:

```bash
# Enable the API if not already done
gcloud services enable artifactregistry.googleapis.com --project=my-project

# Create a Maven repository
gcloud artifacts repositories create my-maven-repo \
  --repository-format=maven \
  --location=us-central1 \
  --description="Internal Java packages" \
  --project=my-project
```

You can choose between standard Maven repository mode and snapshot mode. By default, the repository accepts both releases and snapshots.

If you want separate repositories for releases and snapshots (which is a common practice):

```bash
# Repository for release versions
gcloud artifacts repositories create maven-releases \
  --repository-format=maven \
  --location=us-central1 \
  --description="Release versions of Java packages" \
  --version-policy=RELEASE \
  --project=my-project

# Repository for snapshot versions
gcloud artifacts repositories create maven-snapshots \
  --repository-format=maven \
  --location=us-central1 \
  --description="Snapshot versions of Java packages" \
  --version-policy=SNAPSHOT \
  --project=my-project
```

## Configuring Maven Authentication

Maven needs credentials to access your private repository. The recommended approach uses the Artifact Registry Maven wagon extension.

### Adding the Wagon Extension

Add the Artifact Registry wagon to your project's pom.xml in the build extensions section:

```xml
<!-- pom.xml - Add the Artifact Registry Maven extension -->
<project>
  <!-- ... your existing configuration ... -->

  <build>
    <extensions>
      <!-- Artifact Registry Maven wagon for authentication -->
      <extension>
        <groupId>com.google.cloud.artifactregistry</groupId>
        <artifactId>artifactregistry-maven-wagon</artifactId>
        <version>2.2.1</version>
      </extension>
    </extensions>
  </build>
</project>
```

This extension handles authentication automatically using your Application Default Credentials (ADC). If you are logged in with gcloud, it just works.

### Setting Up Application Default Credentials

Make sure you have valid credentials:

```bash
# Set up Application Default Credentials for local development
gcloud auth application-default login
```

For CI/CD environments, use a service account:

```bash
# Activate a service account for automated builds
gcloud auth activate-service-account \
  --key-file=/path/to/service-account-key.json

# Set the application default credentials
export GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account-key.json
```

## Configuring Your Project to Use the Repository

### Adding the Repository to pom.xml

Add your Artifact Registry repository as both a dependency repository (for downloading packages) and a distribution repository (for publishing packages):

```xml
<!-- pom.xml - Repository configuration -->
<project>
  <groupId>com.example</groupId>
  <artifactId>my-library</artifactId>
  <version>1.0.0</version>

  <!-- Where to download dependencies from -->
  <repositories>
    <repository>
      <id>artifact-registry</id>
      <url>artifactregistry://us-central1-maven.pkg.dev/my-project/my-maven-repo</url>
      <releases>
        <enabled>true</enabled>
      </releases>
      <snapshots>
        <enabled>true</enabled>
      </snapshots>
    </repository>
  </repositories>

  <!-- Where to publish artifacts to -->
  <distributionManagement>
    <repository>
      <id>artifact-registry</id>
      <url>artifactregistry://us-central1-maven.pkg.dev/my-project/maven-releases</url>
    </repository>
    <snapshotRepository>
      <id>artifact-registry-snapshots</id>
      <url>artifactregistry://us-central1-maven.pkg.dev/my-project/maven-snapshots</url>
    </snapshotRepository>
  </distributionManagement>

  <build>
    <extensions>
      <extension>
        <groupId>com.google.cloud.artifactregistry</groupId>
        <artifactId>artifactregistry-maven-wagon</artifactId>
        <version>2.2.1</version>
      </extension>
    </extensions>
  </build>
</project>
```

Notice the `artifactregistry://` URL scheme. The wagon extension intercepts these URLs and handles authentication.

## Publishing a Package

With everything configured, publishing is standard Maven:

```bash
# Deploy (publish) your package to Artifact Registry
mvn deploy
```

If you want to deploy a specific artifact without building:

```bash
# Deploy a pre-built JAR
mvn deploy:deploy-file \
  -DgroupId=com.example \
  -DartifactId=my-library \
  -Dversion=1.0.0 \
  -Dpackaging=jar \
  -Dfile=target/my-library-1.0.0.jar \
  -DrepositoryId=artifact-registry \
  -Durl=artifactregistry://us-central1-maven.pkg.dev/my-project/maven-releases
```

## Consuming Packages

Once a package is published, other projects can depend on it just by adding it to their dependencies:

```xml
<!-- pom.xml of the consuming project -->
<dependencies>
  <dependency>
    <groupId>com.example</groupId>
    <artifactId>my-library</artifactId>
    <version>1.0.0</version>
  </dependency>
</dependencies>
```

Make sure the consuming project also has the Artifact Registry repository and wagon extension configured.

## Using with Gradle

If you use Gradle instead of Maven, the configuration is similar but uses Gradle syntax:

```groovy
// build.gradle - Artifact Registry configuration for Gradle
plugins {
    id 'java-library'
    id 'maven-publish'
}

// Apply the Artifact Registry plugin
buildscript {
    repositories {
        mavenCentral()
    }
    dependencies {
        classpath 'com.google.cloud.artifactregistry:artifactregistry-gradle-plugin:2.2.1'
    }
}
apply plugin: 'com.google.cloud.artifactregistry.gradle-plugin'

repositories {
    // Pull dependencies from Artifact Registry
    maven {
        url 'artifactregistry://us-central1-maven.pkg.dev/my-project/my-maven-repo'
    }
    mavenCentral()
}

publishing {
    repositories {
        // Publish to Artifact Registry
        maven {
            url 'artifactregistry://us-central1-maven.pkg.dev/my-project/maven-releases'
        }
    }
    publications {
        mavenJava(MavenPublication) {
            from components.java
        }
    }
}
```

Publish with:

```bash
# Publish using Gradle
gradle publish
```

## Integrating with Cloud Build

Cloud Build can publish Maven packages as part of your CI/CD pipeline:

```yaml
# cloudbuild.yaml - Build and publish a Java package
steps:
  # Run tests
  - name: 'maven:3.9-eclipse-temurin-17'
    entrypoint: 'mvn'
    args: ['test']

  # Publish the package to Artifact Registry
  - name: 'maven:3.9-eclipse-temurin-17'
    entrypoint: 'mvn'
    args: ['deploy', '-DskipTests']
```

Cloud Build's service account needs the `roles/artifactregistry.writer` role on the repository.

## Listing and Managing Packages

Browse your packages from the command line:

```bash
# List all packages in the Maven repository
gcloud artifacts packages list \
  --repository=my-maven-repo \
  --location=us-central1 \
  --project=my-project

# List versions of a specific package
gcloud artifacts versions list \
  --package=com.example:my-library \
  --repository=my-maven-repo \
  --location=us-central1 \
  --project=my-project

# Delete a specific version
gcloud artifacts versions delete 1.0.0 \
  --package=com.example:my-library \
  --repository=my-maven-repo \
  --location=us-central1 \
  --project=my-project
```

## Setting Up IAM Permissions

Grant team members the appropriate access:

```bash
# Developers can pull packages
gcloud artifacts repositories add-iam-policy-binding my-maven-repo \
  --location=us-central1 \
  --member="group:developers@example.com" \
  --role="roles/artifactregistry.reader" \
  --project=my-project

# CI/CD can push packages
gcloud artifacts repositories add-iam-policy-binding my-maven-repo \
  --location=us-central1 \
  --member="serviceAccount:ci-sa@my-project.iam.gserviceaccount.com" \
  --role="roles/artifactregistry.writer" \
  --project=my-project
```

## Wrapping Up

Setting up a Maven repository in Artifact Registry gives your Java team a private, secure, and performant package repository that integrates natively with GCP services. The key pieces are the repository itself, the wagon extension for authentication, and the correct pom.xml configuration. Once everything is wired up, publishing and consuming packages works exactly like any other Maven repository - just with GCP IAM handling the access control.
