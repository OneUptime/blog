# How to Deploy a Java Application with Epinio

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Epinio, Java, Kubernetes, PaaS, Spring Boot

Description: Deploy a Spring Boot Java application to Kubernetes with Epinio's Maven and Gradle buildpack support.

## Introduction

How to Deploy a Java Application with Epinio demonstrates how Epinio simplifies application deployment to Kubernetes. Epinio abstracts away Kubernetes complexity, letting developers focus on code while the platform handles containerization, deployment, and routing automatically.

## Prerequisites

- Epinio installed and accessible
- Epinio CLI installed and logged in
- An Epinio namespace created (`epinio namespace create my-apps`)
- Application source code ready

## Step 1: Prepare Your Application

```bash
# Create the application directory structure
mkdir -p my-app/src/main/java/com/example/demo my-app/src/main/resources
cd my-app
```

## Step 2: Create the Application

For this example, we'll create a simple Spring Boot web application:

```bash
# Create the Maven build file
cat > pom.xml << 'EOF'
<project xmlns="http://maven.apache.org/POM/4.0.0"
         xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
         xsi:schemaLocation="http://maven.apache.org/POM/4.0.0 https://maven.apache.org/xsd/maven-4.0.0.xsd">
  <modelVersion>4.0.0</modelVersion>

  <parent>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-parent</artifactId>
    <version>4.0.6</version>
    <relativePath/>
  </parent>

  <groupId>com.example</groupId>
  <artifactId>my-app</artifactId>
  <version>0.0.1-SNAPSHOT</version>

  <properties>
    <java.version>17</java.version>
  </properties>

  <dependencies>
    <dependency>
      <groupId>org.springframework.boot</groupId>
      <artifactId>spring-boot-starter-web</artifactId>
    </dependency>
  </dependencies>

  <build>
    <plugins>
      <plugin>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-maven-plugin</artifactId>
      </plugin>
    </plugins>
  </build>
</project>
EOF
```

Create the application class and basic configuration:

```bash
# Create the Spring Boot application
cat > src/main/java/com/example/demo/DemoApplication.java << 'EOF'
package com.example.demo;

import java.time.Instant;
import java.util.Map;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@SpringBootApplication
@RestController
public class DemoApplication {

    public static void main(String[] args) {
        SpringApplication.run(DemoApplication.class, args);
    }

    @GetMapping("/")
    public Map<String, Object> home() {
        return Map.of(
            "message", "Application deployed via Epinio",
            "runtime", System.getProperty("java.version"),
            "timestamp", Instant.now().toString()
        );
    }
}
EOF

# Let Spring Boot use a platform-provided port when available
cat > src/main/resources/application.properties << 'EOF'
server.port=${PORT:8080}
EOF
```

## Step 3: Target Your Namespace

```bash
# Target the namespace for deployment
epinio target my-apps

# Verify namespace is active
epinio namespace show my-apps
```

## Step 4: Deploy the Application

```bash
# Push the application (Epinio uses Paketo buildpacks to detect and build it)
epinio push --name my-app

# Or specify options explicitly
# Custom routes must resolve to your ingress controller
epinio push \
  --name my-app \
  --instances 2 \
  --route my-app.example.com
```

During push, Epinio will:
1. Upload source code
2. Detect the application type and build tool
3. Run the appropriate buildpack
4. Build a container image
5. Deploy to Kubernetes
6. Configure routing and TLS

## Step 5: Verify the Deployment

```bash
# Check application status and routes
epinio app show my-app

# List all applications in the targeted namespace
epinio app list
```

## Step 6: Test the Application

```bash
# Copy the route from the "Routes" field in `epinio app show my-app`
APP_URL="<route-from-epinio-app-show>"

# Test with curl
curl "$APP_URL"

# Or open the same URL in your browser
```

## Step 7: View Application Logs

```bash
# View recent logs
epinio app logs my-app

# Follow live logs
epinio app logs my-app --follow
```

## Step 8: Update the Application

```bash
# Make changes to your application code
# Then re-push to update
epinio push --name my-app

# Epinio rebuilds and redeploys the application
epinio app show my-app
```

## Step 9: Configure Environment Variables

```bash
# Set environment variables
epinio app env set my-app SPRING_PROFILES_ACTIVE production
epinio app env set my-app LOGGING_LEVEL_ROOT INFO

# List environment variables
epinio app env list my-app
```

## Step 10: Scale the Application

```bash
# Scale to more instances
epinio app update my-app --instances 3

# Verify scaling
epinio app show my-app
```

## Cleanup

```bash
# Delete the application
epinio app delete my-app
```

## Conclusion

How to Deploy a Java Application with Epinio demonstrates how the platform removes barriers between development and deployment. The simple push workflow means developers can deploy supported Java applications to Kubernetes without writing YAML or understanding container orchestration. Epinio's buildpack system automatically detects the application type, resolves dependencies, and creates a container image for deployment.
