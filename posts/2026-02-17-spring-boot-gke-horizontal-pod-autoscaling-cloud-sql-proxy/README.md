# How to Deploy a Spring Boot Application to GKE with Horizontal Pod Autoscaling and Cloud SQL Proxy

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, GKE, Spring Boot, Kubernetes, Autoscaling, Cloud SQL, Java, Google Cloud

Description: Deploy a Spring Boot application to GKE with Horizontal Pod Autoscaling and Cloud SQL Proxy for a production-ready scalable Java backend.

---

Running Spring Boot applications on Google Kubernetes Engine (GKE) gives you fine-grained control over scaling, networking, and resource allocation. Combined with Horizontal Pod Autoscaling (HPA) and Cloud SQL Proxy for database connectivity, you get a production-ready setup that automatically scales based on demand while securely connecting to your managed PostgreSQL database.

In this post, I will walk through the entire deployment pipeline: containerizing the Spring Boot app, configuring Cloud SQL Proxy as a sidecar, setting up HPA, and deploying everything to GKE.

## Prerequisites

You will need:

- A GKE cluster running
- A Cloud SQL PostgreSQL instance
- kubectl configured to talk to your cluster
- Docker and gcloud CLI installed

## Spring Boot Application Configuration

Configure your Spring Boot application to connect to PostgreSQL through the Cloud SQL Proxy's localhost connection.

```yaml
# src/main/resources/application-gke.yml
spring:
  datasource:
    # Cloud SQL Proxy runs as a sidecar, exposing the database on localhost
    url: jdbc:postgresql://localhost:5432/${DB_NAME:mydb}
    username: ${DB_USER:appuser}
    password: ${DB_PASSWORD}
    hikari:
      maximum-pool-size: 10
      minimum-idle: 2
      connection-timeout: 30000
      idle-timeout: 600000

  jpa:
    hibernate:
      ddl-auto: validate
    properties:
      hibernate:
        dialect: org.hibernate.dialect.PostgreSQLDialect

server:
  port: 8080
  shutdown: graceful

# Graceful shutdown timeout
spring.lifecycle.timeout-per-shutdown-phase: 30s

management:
  endpoints:
    web:
      exposure:
        include: health,info,prometheus
  endpoint:
    health:
      probes:
        enabled: true
  # Expose Prometheus metrics for HPA custom metrics
  metrics:
    export:
      prometheus:
        enabled: true
```

## Dockerfile

```dockerfile
# Multi-stage build for the Spring Boot application
FROM eclipse-temurin:21-jdk-alpine AS builder
WORKDIR /app
COPY . .
RUN ./mvnw package -DskipTests

FROM eclipse-temurin:21-jre-alpine
WORKDIR /app

# Create a non-root user
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

# Copy the built JAR
COPY --from=builder /app/target/*.jar app.jar

# Set ownership
RUN chown -R appuser:appgroup /app
USER appuser

# JVM container-aware settings
ENV JAVA_OPTS="-XX:+UseContainerSupport -XX:MaxRAMPercentage=75.0 -XX:+UseG1GC"

EXPOSE 8080

ENTRYPOINT ["sh", "-c", "java $JAVA_OPTS -jar app.jar"]
```

## Building and Pushing the Image

```bash
# Build and push to Artifact Registry
docker build -t us-central1-docker.pkg.dev/YOUR_PROJECT/repo/spring-boot-app:v1 .
docker push us-central1-docker.pkg.dev/YOUR_PROJECT/repo/spring-boot-app:v1
```

## Creating Kubernetes Secrets

Store database credentials as Kubernetes secrets.

```bash
# Create a namespace for the application
kubectl create namespace spring-app

# Create database credentials secret
kubectl create secret generic db-credentials \
  --namespace=spring-app \
  --from-literal=DB_USER=appuser \
  --from-literal=DB_PASSWORD=your-password \
  --from-literal=DB_NAME=mydb
```

## Setting Up Workload Identity for Cloud SQL

Workload Identity lets your Kubernetes pods authenticate as a GCP service account without managing keys.

```bash
# Create a GCP service account for the application
gcloud iam service-accounts create spring-app-sa \
  --display-name="Spring Boot App SA"

# Grant Cloud SQL Client role
gcloud projects add-iam-policy-binding YOUR_PROJECT \
  --member="serviceAccount:spring-app-sa@YOUR_PROJECT.iam.gserviceaccount.com" \
  --role="roles/cloudsql.client"

# Create a Kubernetes service account
kubectl create serviceaccount spring-app-ksa --namespace=spring-app

# Bind the Kubernetes SA to the GCP SA
gcloud iam service-accounts add-iam-policy-binding \
  spring-app-sa@YOUR_PROJECT.iam.gserviceaccount.com \
  --role="roles/iam.workloadIdentityUser" \
  --member="serviceAccount:YOUR_PROJECT.svc.id.goog[spring-app/spring-app-ksa]"

# Annotate the Kubernetes SA
kubectl annotate serviceaccount spring-app-ksa \
  --namespace=spring-app \
  iam.gke.io/gcp-service-account=spring-app-sa@YOUR_PROJECT.iam.gserviceaccount.com
```

## Kubernetes Deployment with Cloud SQL Proxy Sidecar

```yaml
# k8s/deployment.yaml - Deployment with Cloud SQL Proxy sidecar
apiVersion: apps/v1
kind: Deployment
metadata:
  name: spring-boot-app
  namespace: spring-app
  labels:
    app: spring-boot-app
spec:
  replicas: 2
  selector:
    matchLabels:
      app: spring-boot-app
  template:
    metadata:
      labels:
        app: spring-boot-app
    spec:
      serviceAccountName: spring-app-ksa
      containers:
        # Main application container
        - name: spring-boot-app
          image: us-central1-docker.pkg.dev/YOUR_PROJECT/repo/spring-boot-app:v1
          ports:
            - containerPort: 8080
              name: http
          env:
            - name: SPRING_PROFILES_ACTIVE
              value: "gke"
            - name: DB_USER
              valueFrom:
                secretKeyRef:
                  name: db-credentials
                  key: DB_USER
            - name: DB_PASSWORD
              valueFrom:
                secretKeyRef:
                  name: db-credentials
                  key: DB_PASSWORD
            - name: DB_NAME
              valueFrom:
                secretKeyRef:
                  name: db-credentials
                  key: DB_NAME
          resources:
            requests:
              cpu: "250m"
              memory: "512Mi"
            limits:
              cpu: "1000m"
              memory: "1Gi"
          # Kubernetes probes using Spring Boot Actuator
          readinessProbe:
            httpGet:
              path: /actuator/health/readiness
              port: 8080
            initialDelaySeconds: 30
            periodSeconds: 10
          livenessProbe:
            httpGet:
              path: /actuator/health/liveness
              port: 8080
            initialDelaySeconds: 60
            periodSeconds: 15
          startupProbe:
            httpGet:
              path: /actuator/health
              port: 8080
            initialDelaySeconds: 10
            periodSeconds: 5
            failureThreshold: 30

        # Cloud SQL Proxy sidecar
        - name: cloud-sql-proxy
          image: gcr.io/cloud-sql-connectors/cloud-sql-proxy:2.8.0
          args:
            # Replace with your Cloud SQL instance connection name
            - "YOUR_PROJECT:us-central1:my-postgres"
            - "--port=5432"
            - "--structured-logs"
            - "--health-check"
            - "--http-address=0.0.0.0"
            - "--http-port=9090"
          ports:
            - containerPort: 5432
              name: postgres
          resources:
            requests:
              cpu: "100m"
              memory: "128Mi"
            limits:
              cpu: "500m"
              memory: "256Mi"
          readinessProbe:
            httpGet:
              path: /readiness
              port: 9090
            initialDelaySeconds: 5
            periodSeconds: 10
          livenessProbe:
            httpGet:
              path: /liveness
              port: 9090
            initialDelaySeconds: 5
            periodSeconds: 10
          securityContext:
            runAsNonRoot: true
```

## Kubernetes Service

```yaml
# k8s/service.yaml - Expose the application
apiVersion: v1
kind: Service
metadata:
  name: spring-boot-app
  namespace: spring-app
spec:
  selector:
    app: spring-boot-app
  ports:
    - port: 80
      targetPort: 8080
      protocol: TCP
  type: ClusterIP
```

## Horizontal Pod Autoscaler

Configure HPA to scale based on CPU utilization.

```yaml
# k8s/hpa.yaml - Horizontal Pod Autoscaler
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: spring-boot-app-hpa
  namespace: spring-app
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: spring-boot-app
  minReplicas: 2
  maxReplicas: 20
  metrics:
    # Scale based on CPU utilization
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: 60
    # Also scale based on memory usage
    - type: Resource
      resource:
        name: memory
        target:
          type: Utilization
          averageUtilization: 75
  behavior:
    scaleUp:
      stabilizationWindowSeconds: 60
      policies:
        - type: Pods
          value: 4
          periodSeconds: 60
    scaleDown:
      stabilizationWindowSeconds: 300
      policies:
        - type: Pods
          value: 2
          periodSeconds: 120
```

The `behavior` section controls how aggressively the autoscaler scales. The stabilization windows prevent rapid scale-up/scale-down oscillations.

## Deploying Everything

```bash
# Apply all Kubernetes manifests
kubectl apply -f k8s/deployment.yaml
kubectl apply -f k8s/service.yaml
kubectl apply -f k8s/hpa.yaml

# Watch the deployment progress
kubectl rollout status deployment/spring-boot-app -n spring-app

# Check the HPA status
kubectl get hpa -n spring-app

# View pod logs
kubectl logs -f deployment/spring-boot-app -n spring-app -c spring-boot-app
```

## Ingress Configuration

Expose the application externally with an Ingress.

```yaml
# k8s/ingress.yaml - HTTP Load Balancer ingress
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: spring-boot-app-ingress
  namespace: spring-app
  annotations:
    kubernetes.io/ingress.class: "gce"
spec:
  rules:
    - host: api.yourdomain.com
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: spring-boot-app
                port:
                  number: 80
```

## Monitoring the HPA

```bash
# Watch HPA metrics in real time
kubectl get hpa spring-boot-app-hpa -n spring-app --watch

# Check current replica count and metrics
kubectl describe hpa spring-boot-app-hpa -n spring-app

# View pod resource usage
kubectl top pods -n spring-app
```

## Load Testing

Test the autoscaling behavior with a load generator.

```bash
# Simple load test with hey
hey -z 5m -c 50 -q 10 http://api.yourdomain.com/api/tasks

# Watch the HPA respond
kubectl get hpa spring-boot-app-hpa -n spring-app --watch
```

As load increases, you should see the HPA increase the replica count, and as load decreases, it will gradually scale back down according to the behavior policies.

Deploying Spring Boot to GKE with HPA and Cloud SQL Proxy gives you a robust, auto-scaling Java backend. The Cloud SQL Proxy sidecar handles secure database connectivity without VPC peering or public IPs, and HPA ensures your application scales to meet demand while keeping resource usage efficient. Combined with proper liveness and readiness probes, you get a production-grade deployment that handles rolling updates, self-healing, and automatic scaling.
