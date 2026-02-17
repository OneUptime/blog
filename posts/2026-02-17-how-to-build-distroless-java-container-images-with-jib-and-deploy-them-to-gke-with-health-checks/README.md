# How to Build Distroless Java Container Images with Jib and Deploy Them to GKE with Health Checks

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Jib, Java, Distroless, GKE, Kubernetes, Health Checks

Description: Learn how to use Jib to build distroless Java container images with minimal attack surface and deploy them to GKE with proper health check configuration.

---

Distroless images are container images that contain only your application and its runtime dependencies. No shell, no package manager, no utilities. Google maintains a set of distroless base images specifically for this purpose. For Java applications, the distroless Java image includes just the JRE and nothing else.

Why does this matter? Because every tool in your container image is a tool that an attacker can potentially use. If there is no shell, an attacker who gains code execution cannot drop into a bash session. If there is no package manager, they cannot install additional tools. The attack surface shrinks dramatically.

Jib makes building distroless Java images easy because it already understands Java application structure. You do not need to figure out which files to copy or how to set up the classpath. Jib handles all of that.

## Setting Up Jib with a Distroless Base Image

Here is a Spring Boot project with Jib configured to use a distroless base.

```groovy
// build.gradle - Jib with distroless Java base
plugins {
    id 'java'
    id 'org.springframework.boot' version '3.2.0'
    id 'io.spring.dependency-management' version '1.1.4'
    id 'com.google.cloud.tools.jib' version '3.4.0'
}

jib {
    from {
        // Use the distroless Java 17 base image from Google
        image = 'gcr.io/distroless/java17-debian12'
    }
    to {
        image = 'us-central1-docker.pkg.dev/my-project/my-repo/my-java-service'
        tags = [version, 'latest']
        credHelper = 'gcloud'
    }
    container {
        ports = ['8080']
        jvmFlags = [
            '-Xms256m',
            '-Xmx512m',
            '-XX:+UseG1GC',
            // Enable JMX for monitoring without remote access
            '-Dcom.sun.management.jmxremote=false'
        ]
        mainClass = 'com.example.service.Application'
        creationTime = 'USE_CURRENT_TIMESTAMP'
        format = 'OCI'
        // Set environment variables
        environment = [
            'SPRING_PROFILES_ACTIVE': 'production'
        ]
    }
}
```

## The Application

Let me build a Spring Boot service with proper health check endpoints.

```java
// src/main/java/com/example/service/Application.java
package com.example.service;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication
public class Application {
    public static void main(String[] args) {
        SpringApplication.run(Application.class, args);
    }
}
```

```java
// src/main/java/com/example/service/controller/ApiController.java
package com.example.service.controller;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;
import java.util.Map;

@RestController
public class ApiController {

    // Main API endpoint
    @GetMapping("/api/data")
    public Map<String, Object> getData() {
        return Map.of(
            "service", "my-java-service",
            "status", "running",
            "version", "1.0.0"
        );
    }
}
```

Spring Boot Actuator provides built-in health check endpoints. Add it to your dependencies.

```groovy
// build.gradle - dependencies section
dependencies {
    implementation 'org.springframework.boot:spring-boot-starter-web'
    implementation 'org.springframework.boot:spring-boot-starter-actuator'
}
```

Configure the actuator endpoints.

```yaml
# src/main/resources/application.yml
server:
  port: 8080

# Actuator health check configuration
management:
  endpoints:
    web:
      base-path: /actuator
      exposure:
        include: health,info,prometheus
  endpoint:
    health:
      show-details: always
      probes:
        enabled: true
  health:
    livenessstate:
      enabled: true
    readinessstate:
      enabled: true
```

With this configuration, Spring Boot exposes:
- `/actuator/health/liveness` - for Kubernetes liveness probes
- `/actuator/health/readiness` - for Kubernetes readiness probes

## Building the Distroless Image

```bash
# Build and push to Artifact Registry
./gradlew jib
```

The resulting image is significantly smaller than one based on a full OS. A typical Spring Boot application on a distroless base is around 200MB, compared to 350MB+ on Ubuntu or 250MB on Alpine.

## GKE Deployment with Health Checks

Here is the Kubernetes deployment manifest with properly configured health checks.

```yaml
# k8s/deployment.yaml - Deployment with liveness, readiness, and startup probes
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-java-service
  labels:
    app: my-java-service
spec:
  replicas: 3
  selector:
    matchLabels:
      app: my-java-service
  template:
    metadata:
      labels:
        app: my-java-service
    spec:
      containers:
        - name: my-java-service
          image: us-central1-docker.pkg.dev/my-project/my-repo/my-java-service:latest
          ports:
            - containerPort: 8080
              name: http
          resources:
            requests:
              memory: "256Mi"
              cpu: "250m"
            limits:
              memory: "512Mi"
              cpu: "500m"
          # Startup probe - gives the JVM time to start
          # Java apps can take 10-30 seconds to fully start
          startupProbe:
            httpGet:
              path: /actuator/health/readiness
              port: http
            # Check every 5 seconds, up to 60 times (5 minutes max)
            periodSeconds: 5
            failureThreshold: 60
          # Liveness probe - restarts container if unhealthy
          livenessProbe:
            httpGet:
              path: /actuator/health/liveness
              port: http
            periodSeconds: 15
            failureThreshold: 3
            timeoutSeconds: 5
          # Readiness probe - removes from service if not ready
          readinessProbe:
            httpGet:
              path: /actuator/health/readiness
              port: http
            periodSeconds: 10
            failureThreshold: 3
            timeoutSeconds: 5
          # Environment variables
          env:
            - name: JAVA_TOOL_OPTIONS
              value: "-XX:MaxRAMPercentage=75.0"
            - name: SPRING_PROFILES_ACTIVE
              value: "production"
---
apiVersion: v1
kind: Service
metadata:
  name: my-java-service
spec:
  type: ClusterIP
  selector:
    app: my-java-service
  ports:
    - port: 80
      targetPort: http
      protocol: TCP
```

## Understanding the Three Probe Types

**Startup probe**: This runs during container startup. Java applications, especially Spring Boot ones, can take 10-30 seconds to initialize. Without a startup probe, the liveness probe might kill the container before it finishes starting. The startup probe gives the application time to start without interfering with liveness checks.

**Liveness probe**: This runs continuously after startup. If it fails, Kubernetes restarts the container. Use this to detect situations where the application is stuck or deadlocked.

**Readiness probe**: This also runs continuously. If it fails, Kubernetes removes the pod from the Service's endpoint list, so it stops receiving traffic. This is useful during rolling updates or when the application is temporarily overloaded.

## Adding Custom Health Indicators

You can create custom health indicators that report on your application's dependencies.

```java
// src/main/java/com/example/service/health/DatabaseHealthIndicator.java
package com.example.service.health;

import org.springframework.boot.actuate.health.Health;
import org.springframework.boot.actuate.health.HealthIndicator;
import org.springframework.stereotype.Component;

@Component
public class DatabaseHealthIndicator implements HealthIndicator {

    @Override
    public Health health() {
        // Check database connectivity
        try {
            // Replace with your actual database check
            boolean isDatabaseUp = checkDatabaseConnection();
            if (isDatabaseUp) {
                return Health.up()
                    .withDetail("database", "reachable")
                    .build();
            }
            return Health.down()
                .withDetail("database", "unreachable")
                .build();
        } catch (Exception e) {
            return Health.down()
                .withDetail("database", "error")
                .withException(e)
                .build();
        }
    }

    private boolean checkDatabaseConnection() {
        // Your database check logic here
        return true;
    }
}
```

## Debugging Distroless Containers

The biggest challenge with distroless containers is debugging. There is no shell, so you cannot exec into the container and poke around. Here are some strategies.

**Use the debug variant for troubleshooting**. Google provides debug versions of distroless images that include a basic shell.

```groovy
// build.gradle - Debug variant for troubleshooting
jib {
    from {
        // Debug variant includes a busybox shell
        image = 'gcr.io/distroless/java17-debian12:debug'
    }
}
```

**Use ephemeral debug containers in GKE**.

```bash
# Attach a debug container to a running pod
kubectl debug -it my-java-service-pod-xxx \
    --image=busybox \
    --target=my-java-service
```

**Use application-level logging**. Since you cannot inspect the container from outside, make sure your application logs enough information.

```yaml
# application.yml - Structured logging for debugging
logging:
  level:
    root: INFO
    com.example: DEBUG
  pattern:
    console: '{"timestamp":"%d","level":"%p","logger":"%logger","message":"%m"}%n'
```

## Horizontal Pod Autoscaler

With health checks in place, you can safely add autoscaling.

```yaml
# k8s/hpa.yaml - Horizontal Pod Autoscaler
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: my-java-service
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: my-java-service
  minReplicas: 2
  maxReplicas: 10
  metrics:
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: 70
    - type: Resource
      resource:
        name: memory
        target:
          type: Utilization
          averageUtilization: 80
```

## Wrapping Up

Distroless Java images built with Jib give you a strong security posture with minimal effort. The combination of Jib's smart layering, distroless's minimal attack surface, and Kubernetes health probes creates a production-ready deployment that is both secure and resilient. The key is getting the health check configuration right - especially the startup probe, which prevents Kubernetes from killing your Java application before it finishes initializing.
