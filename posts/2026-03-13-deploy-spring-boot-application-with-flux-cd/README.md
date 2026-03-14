# How to Deploy a Spring Boot Application with Flux CD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, Kubernetes, GitOps, Spring Boot, Java, Deployment

Description: Deploy a Spring Boot Java application to Kubernetes using Flux CD, with ConfigMaps for externalized configuration and graceful shutdown support.

---

## Introduction

Spring Boot is the de-facto standard for building production-grade Java microservices. Its embedded Tomcat or Netty server, auto-configuration, and Actuator health endpoints make it well-suited for Kubernetes deployment. However, the JVM startup time and memory footprint require careful resource configuration compared to lighter-weight runtimes.

Flux CD provides the GitOps layer that ensures your Spring Boot deployment is consistent across environments. Environment-specific configuration such as database URLs, service endpoints, and feature flags is stored in Kubernetes ConfigMaps and Secrets, not baked into the image. Flux reconciles these resources from your Git repository automatically.

This guide covers the Spring Boot Docker build (using layered JAR for efficient caching), Kubernetes manifests with Actuator-based probes, externalized configuration, and the full Flux pipeline.

## Prerequisites

- A Spring Boot 3.x application built with Maven or Gradle
- Spring Boot Actuator on the classpath (`spring-boot-starter-actuator`)
- A Kubernetes cluster with Flux CD bootstrapped
- A container registry
- `kubectl` and `flux` CLIs

## Step 1: Build the Spring Boot Container with Layered JAR

Spring Boot's layered JAR mode splits the JAR into layers that change at different frequencies, dramatically improving Docker layer cache efficiency.

```dockerfile
# Dockerfile — extract and run using Spring Boot layered JAR
FROM eclipse-temurin:21-jre-alpine AS extractor
WORKDIR /app
# Copy the fat JAR built by Maven/Gradle
COPY target/my-app-*.jar app.jar
# Extract layers; Spring Boot writes layers.idx describing layer order
RUN java -Djarmode=tools -jar app.jar extract --layers --destination extracted

FROM eclipse-temurin:21-jre-alpine AS runner
WORKDIR /app
# Create non-root user
RUN addgroup -S spring && adduser -S spring -G spring

# Copy layers in order (least to most frequently changing)
COPY --from=extractor --chown=spring:spring /app/extracted/dependencies ./
COPY --from=extractor --chown=spring:spring /app/extracted/spring-boot-loader ./
COPY --from=extractor --chown=spring:spring /app/extracted/snapshot-dependencies ./
COPY --from=extractor --chown=spring:spring /app/extracted/application ./

USER spring
EXPOSE 8080
# Set JVM flags appropriate for containerized environments
ENTRYPOINT ["java", \
  "-XX:MaxRAMPercentage=75.0", \
  "-XX:+UseContainerSupport", \
  "org.springframework.boot.loader.launch.JarLauncher"]
```

```bash
mvn clean package -DskipTests
docker build -t ghcr.io/your-org/my-spring-app:1.0.0 .
docker push ghcr.io/your-org/my-spring-app:1.0.0
```

## Step 2: Configure application.properties for Kubernetes

```properties
# src/main/resources/application-kubernetes.properties
# Use environment variables for all environment-specific values
spring.datasource.url=${DATABASE_URL}
spring.datasource.username=${DB_USERNAME}
spring.datasource.password=${DB_PASSWORD}

# Actuator endpoints for Kubernetes probes
management.endpoints.web.exposure.include=health,info,metrics,prometheus
management.endpoint.health.show-details=always
management.health.livenessstate.enabled=true
management.health.readinessstate.enabled=true

# Graceful shutdown — wait for in-flight requests to complete
server.shutdown=graceful
spring.lifecycle.timeout-per-shutdown-phase=20s
```

## Step 3: Write Kubernetes Manifests

```yaml
# deploy/namespace.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: my-spring-app
---
# deploy/configmap.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: spring-config
  namespace: my-spring-app
data:
  SPRING_PROFILES_ACTIVE: "kubernetes"
  LOG_LEVEL: "INFO"
  JAVA_OPTS: "-XX:MaxRAMPercentage=75.0"
---
# deploy/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-spring-app
  namespace: my-spring-app
spec:
  replicas: 2
  selector:
    matchLabels:
      app: my-spring-app
  template:
    metadata:
      labels:
        app: my-spring-app
    spec:
      containers:
        - name: my-spring-app
          image: ghcr.io/your-org/my-spring-app:1.0.0  # {"$imagepolicy": "flux-system:my-spring-app"}
          ports:
            - containerPort: 8080
          envFrom:
            - configMapRef:
                name: spring-config
          env:
            - name: DATABASE_URL
              valueFrom:
                secretKeyRef:
                  name: spring-secrets
                  key: DATABASE_URL
          resources:
            requests:
              cpu: "500m"
              memory: "512Mi"   # JVM needs sufficient memory
            limits:
              cpu: "2000m"
              memory: "1Gi"
          # Spring Boot Actuator liveness/readiness probes
          livenessProbe:
            httpGet:
              path: /actuator/health/liveness
              port: 8080
            initialDelaySeconds: 60   # JVM startup takes time
            periodSeconds: 20
            failureThreshold: 3
          readinessProbe:
            httpGet:
              path: /actuator/health/readiness
              port: 8080
            initialDelaySeconds: 30
            periodSeconds: 10
          lifecycle:
            preStop:
              exec:
                command: ["/bin/sh", "-c", "sleep 10"]
      terminationGracePeriodSeconds: 40
---
# deploy/service.yaml
apiVersion: v1
kind: Service
metadata:
  name: my-spring-app
  namespace: my-spring-app
spec:
  selector:
    app: my-spring-app
  ports:
    - name: http
      port: 80
      targetPort: 8080
```

## Step 4: Configure Flux GitRepository and Kustomization

```yaml
# clusters/my-cluster/apps/my-spring-app/source.yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: GitRepository
metadata:
  name: my-spring-app
  namespace: flux-system
spec:
  interval: 1m
  url: https://github.com/your-org/my-spring-app
  ref:
    branch: main
---
# clusters/my-cluster/apps/my-spring-app/kustomization.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: my-spring-app
  namespace: flux-system
spec:
  interval: 5m
  sourceRef:
    kind: GitRepository
    name: my-spring-app
  path: ./deploy
  prune: true
  healthChecks:
    - apiVersion: apps/v1
      kind: Deployment
      name: my-spring-app
      namespace: my-spring-app
```

## Step 5: Configure Flux Image Automation

```yaml
# clusters/my-cluster/apps/my-spring-app/image-automation.yaml
apiVersion: image.toolkit.fluxcd.io/v1
kind: ImageRepository
metadata:
  name: my-spring-app
  namespace: flux-system
spec:
  image: ghcr.io/your-org/my-spring-app
  interval: 5m
  secretRef:
    name: ghcr-credentials
---
apiVersion: image.toolkit.fluxcd.io/v1
kind: ImagePolicy
metadata:
  name: my-spring-app
  namespace: flux-system
spec:
  imageRepositoryRef:
    name: my-spring-app
  policy:
    semver:
      range: ">=1.0.0"
---
apiVersion: image.toolkit.fluxcd.io/v1
kind: ImageUpdateAutomation
metadata:
  name: my-spring-app
  namespace: flux-system
spec:
  interval: 5m
  sourceRef:
    kind: GitRepository
    name: my-spring-app
  git:
    checkout:
      ref:
        branch: main
    commit:
      author:
        email: fluxbot@your-org.com
        name: Flux Bot
      messageTemplate: "chore: update spring app to {{range .Updated.Images}}{{.}}{{end}}"
    push:
      branch: main
  update:
    path: ./deploy
    strategy: Setters
```

## Step 6: Verify

```bash
flux get kustomizations my-spring-app

# JVM takes time to start — watch pods become Ready
kubectl get pods -n my-spring-app --watch

# Check Actuator health
kubectl port-forward -n my-spring-app svc/my-spring-app 8080:80
curl http://localhost:8080/actuator/health
```

## Best Practices

- Set `initialDelaySeconds` generously for Spring Boot liveness probes; the JVM and Spring context initialization can take 30-60 seconds depending on the number of beans.
- Use `-XX:MaxRAMPercentage=75.0` and `-XX:+UseContainerSupport` so the JVM respects the container's memory limit rather than the node's total memory.
- Enable Spring Boot's `spring.profiles.active=kubernetes` and use a `kubernetes`-specific properties file for Kubernetes-specific tuning.
- Use Spring Boot's native compilation with GraalVM for significantly faster startup and lower memory footprint if your application and dependencies support it.
- Configure `server.shutdown=graceful` to drain in-flight requests before the JVM shuts down during rolling updates.

## Conclusion

Spring Boot on Kubernetes with Flux CD provides an enterprise-grade deployment pipeline. Actuator health endpoints integrate perfectly with Kubernetes probes, graceful shutdown handles rolling updates cleanly, and Flux ensures every configuration change is tracked in Git. The result is a reliable, auditable deployment pipeline for your Java services.
