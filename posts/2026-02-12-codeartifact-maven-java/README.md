# How to Use CodeArtifact with Maven (Java)

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, CodeArtifact, Maven, Java, DevOps

Description: Configure Maven and Gradle to use AWS CodeArtifact for resolving and publishing Java packages, including settings.xml configuration and CI/CD integration.

---

Java teams building internal libraries need a private Maven repository. CodeArtifact fills that role while also proxying Maven Central, so your builds pull everything from one source. No more managing Nexus or Artifactory infrastructure yourself.

This guide covers setting up Maven with CodeArtifact, configuring Gradle, publishing JARs, and integrating with CI/CD pipelines.

## Prerequisites

You'll need:

- An AWS CodeArtifact domain and repository with a Maven Central upstream (see our guide on [setting up CodeArtifact](https://oneuptime.com/blog/post/2026-02-12-aws-codeartifact-package-management/view))
- AWS CLI installed and configured
- Java JDK and Maven installed

## Step 1: Get the Repository Endpoint

```bash
# Get the Maven repository URL
REPO_URL=$(aws codeartifact get-repository-endpoint \
  --domain my-org \
  --domain-owner 123456789012 \
  --repository my-packages \
  --format maven \
  --query repositoryEndpoint \
  --output text)

echo "Repository URL: $REPO_URL"

# Get the auth token
AUTH_TOKEN=$(aws codeartifact get-authorization-token \
  --domain my-org \
  --domain-owner 123456789012 \
  --query authorizationToken \
  --output text)
```

## Step 2: Configure Maven settings.xml

Maven uses `~/.m2/settings.xml` for repository configuration. Create or update it:

```xml
<!-- ~/.m2/settings.xml - Maven configuration for CodeArtifact -->
<settings xmlns="http://maven.apache.org/SETTINGS/1.0.0"
          xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
          xsi:schemaLocation="http://maven.apache.org/SETTINGS/1.0.0
                              https://maven.apache.org/xsd/settings-1.0.0.xsd">

    <servers>
        <!-- CodeArtifact authentication -->
        <server>
            <id>codeartifact</id>
            <username>aws</username>
            <password>${env.CODEARTIFACT_AUTH_TOKEN}</password>
        </server>
    </servers>

    <profiles>
        <profile>
            <id>codeartifact</id>
            <activation>
                <activeByDefault>true</activeByDefault>
            </activation>
            <repositories>
                <repository>
                    <id>codeartifact</id>
                    <url>https://my-org-123456789012.d.codeartifact.us-east-1.amazonaws.com/maven/my-packages/</url>
                </repository>
            </repositories>
        </profile>
    </profiles>

    <mirrors>
        <!-- Route all Maven requests through CodeArtifact -->
        <mirror>
            <id>codeartifact</id>
            <name>my-org-codeartifact</name>
            <url>https://my-org-123456789012.d.codeartifact.us-east-1.amazonaws.com/maven/my-packages/</url>
            <mirrorOf>*</mirrorOf>
        </mirror>
    </mirrors>
</settings>
```

The `<mirror>` section with `<mirrorOf>*</mirrorOf>` routes all package requests through CodeArtifact, including Maven Central dependencies. This works because your repository has Maven Central as an upstream.

Set the auth token environment variable:

```bash
# Set the token before running Maven
export CODEARTIFACT_AUTH_TOKEN=$(aws codeartifact get-authorization-token \
  --domain my-org \
  --domain-owner 123456789012 \
  --query authorizationToken \
  --output text)

# Now Maven commands will authenticate with CodeArtifact
mvn clean install
```

## Step 3: Configure Your Project pom.xml

For publishing artifacts to CodeArtifact, add the distribution management section to your `pom.xml`:

```xml
<!-- pom.xml - Project configuration with CodeArtifact -->
<project>
    <modelVersion>4.0.0</modelVersion>
    <groupId>com.myorg</groupId>
    <artifactId>shared-utils</artifactId>
    <version>1.2.0</version>
    <packaging>jar</packaging>

    <name>MyOrg Shared Utilities</name>
    <description>Shared utility classes for internal projects</description>

    <properties>
        <maven.compiler.source>17</maven.compiler.source>
        <maven.compiler.target>17</maven.compiler.target>
        <project.build.sourceEncoding>UTF-8</project.build.sourceEncoding>
    </properties>

    <dependencies>
        <dependency>
            <groupId>com.google.guava</groupId>
            <artifactId>guava</artifactId>
            <version>32.1.2-jre</version>
        </dependency>
        <dependency>
            <groupId>junit</groupId>
            <artifactId>junit</artifactId>
            <version>4.13.2</version>
            <scope>test</scope>
        </dependency>
    </dependencies>

    <!-- Tell Maven where to publish artifacts -->
    <distributionManagement>
        <repository>
            <id>codeartifact</id>
            <name>CodeArtifact</name>
            <url>https://my-org-123456789012.d.codeartifact.us-east-1.amazonaws.com/maven/my-packages/</url>
        </repository>
        <snapshotRepository>
            <id>codeartifact</id>
            <name>CodeArtifact</name>
            <url>https://my-org-123456789012.d.codeartifact.us-east-1.amazonaws.com/maven/my-packages/</url>
        </snapshotRepository>
    </distributionManagement>
</project>
```

The `<id>` in `distributionManagement` must match the `<id>` in your `settings.xml` server configuration.

## Step 4: Publish a Package

```bash
# Set the auth token
export CODEARTIFACT_AUTH_TOKEN=$(aws codeartifact get-authorization-token \
  --domain my-org \
  --domain-owner 123456789012 \
  --query authorizationToken \
  --output text)

# Build and deploy to CodeArtifact
mvn clean deploy
```

Verify the package was published:

```bash
# List packages in the repository
aws codeartifact list-packages \
  --domain my-org \
  --repository my-packages \
  --format maven \
  --query 'packages[*].{Package:package,Namespace:namespace}'

# List versions of your package
aws codeartifact list-package-versions \
  --domain my-org \
  --repository my-packages \
  --format maven \
  --package shared-utils \
  --namespace com.myorg
```

## Gradle Configuration

If your team uses Gradle instead of Maven, here's how to set it up.

For resolving dependencies:

```groovy
// build.gradle - Configure CodeArtifact as a repository
repositories {
    maven {
        url = uri("https://my-org-123456789012.d.codeartifact.us-east-1.amazonaws.com/maven/my-packages/")
        credentials {
            username = "aws"
            password = System.env.CODEARTIFACT_AUTH_TOKEN
        }
    }
}

dependencies {
    implementation 'com.myorg:shared-utils:1.2.0'
    implementation 'com.google.guava:guava:32.1.2-jre'
    testImplementation 'junit:junit:4.13.2'
}
```

For publishing:

```groovy
// build.gradle - Publishing configuration
plugins {
    id 'java-library'
    id 'maven-publish'
}

publishing {
    publications {
        maven(MavenPublication) {
            groupId = 'com.myorg'
            artifactId = 'shared-utils'
            version = '1.2.0'
            from components.java
        }
    }
    repositories {
        maven {
            url = uri("https://my-org-123456789012.d.codeartifact.us-east-1.amazonaws.com/maven/my-packages/")
            credentials {
                username = "aws"
                password = System.env.CODEARTIFACT_AUTH_TOKEN
            }
        }
    }
}
```

Publish with Gradle:

```bash
# Set the auth token
export CODEARTIFACT_AUTH_TOKEN=$(aws codeartifact get-authorization-token \
  --domain my-org \
  --domain-owner 123456789012 \
  --query authorizationToken \
  --output text)

# Publish
./gradlew publish
```

## CI/CD with CodeBuild

Here's a CodeBuild buildspec for Java projects:

```yaml
# buildspec.yml - Java build with CodeArtifact
version: 0.2

phases:
  pre_build:
    commands:
      # Get auth token and export it
      - export CODEARTIFACT_AUTH_TOKEN=$(aws codeartifact get-authorization-token --domain my-org --domain-owner 123456789012 --query authorizationToken --output text)
      # Copy settings.xml to the Maven config directory
      - mkdir -p ~/.m2
      - cp ci/settings.xml ~/.m2/settings.xml
  install:
    runtime-versions:
      java: corretto17
  build:
    commands:
      - echo "Running tests..."
      - mvn clean verify
  post_build:
    commands:
      - echo "Deploying artifact..."
      - mvn deploy -DskipTests

cache:
  paths:
    - '/root/.m2/**/*'
```

Include a CI-specific `settings.xml` in your repo:

```xml
<!-- ci/settings.xml - Maven settings for CI environment -->
<settings>
    <servers>
        <server>
            <id>codeartifact</id>
            <username>aws</username>
            <password>${env.CODEARTIFACT_AUTH_TOKEN}</password>
        </server>
    </servers>
    <mirrors>
        <mirror>
            <id>codeartifact</id>
            <url>https://my-org-123456789012.d.codeartifact.us-east-1.amazonaws.com/maven/my-packages/</url>
            <mirrorOf>*</mirrorOf>
        </mirror>
    </mirrors>
</settings>
```

The CodeBuild service role needs the same CodeArtifact permissions as mentioned in our [npm guide](https://oneuptime.com/blog/post/2026-02-12-codeartifact-npm/view).

## Token Refresh Helper

Create a shell function to simplify token management:

```bash
# Add to ~/.bashrc or ~/.zshrc
codeartifact-auth() {
    export CODEARTIFACT_AUTH_TOKEN=$(aws codeartifact get-authorization-token \
        --domain my-org \
        --domain-owner 123456789012 \
        --query authorizationToken \
        --output text)
    echo "CodeArtifact token set (valid for 12 hours)"
}

# Usage: just type
# codeartifact-auth
# mvn clean install
```

## Troubleshooting

**"Not authorized" errors:**
Token expired or not set. Run the auth command again and make sure `CODEARTIFACT_AUTH_TOKEN` is exported.

**"Could not transfer artifact" from Maven Central:**
Your repository needs an upstream connection to Maven Central. Verify with:
```bash
aws codeartifact describe-repository \
  --domain my-org \
  --repository my-packages \
  --query 'repository.upstreams'
```

**Server ID mismatch:**
The `<id>` in `settings.xml` must match the `<id>` in your `pom.xml` distribution management section. They both need to be `codeartifact` (or whatever name you chose).

**Gradle can't resolve dependencies:**
Make sure the repository URL ends with `/` and the `CODEARTIFACT_AUTH_TOKEN` environment variable is set before running Gradle.

For monitoring your Java build pipeline and artifact publishing, [OneUptime](https://oneuptime.com) can track build durations, failure rates, and dependency resolution times across your projects.
