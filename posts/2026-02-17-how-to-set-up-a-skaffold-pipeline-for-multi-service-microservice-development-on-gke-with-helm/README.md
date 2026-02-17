# How to Set Up a Skaffold Pipeline for Multi-Service Microservice Development on GKE with Helm

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Skaffold, GKE, Helm, Kubernetes, Microservices, DevOps

Description: Learn how to set up a Skaffold pipeline for developing and deploying multiple microservices on GKE using Helm charts for templating and deployment.

---

Developing microservices on Kubernetes becomes complicated fast. You have multiple services, each with its own Dockerfile, Helm chart, dependencies, and configuration. Running `docker build`, `helm upgrade`, and `kubectl apply` for each service every time you make a change is tedious. When you have five or ten services, manual deployment is not an option.

Skaffold orchestrates the entire workflow. It watches your source code, builds the changed services, and deploys them using Helm. Combined with GKE, you get a development environment that mirrors production.

## Project Structure

A typical multi-service project looks like this.

```text
my-platform/
  services/
    api-gateway/
      src/
      Dockerfile
    user-service/
      src/
      Dockerfile
    order-service/
      src/
      Dockerfile
    notification-service/
      src/
      Dockerfile
  helm/
    api-gateway/
      Chart.yaml
      values.yaml
      templates/
    user-service/
      Chart.yaml
      values.yaml
      templates/
    order-service/
      Chart.yaml
      values.yaml
      templates/
    notification-service/
      Chart.yaml
      values.yaml
      templates/
  skaffold.yaml
```

## Creating a Helm Chart for a Service

Here is a Helm chart for the user service. The other services follow the same pattern.

```yaml
# helm/user-service/Chart.yaml
apiVersion: v2
name: user-service
description: User management microservice
version: 1.0.0
appVersion: "1.0.0"
```

```yaml
# helm/user-service/values.yaml
replicaCount: 1

image:
  repository: user-service
  tag: latest
  pullPolicy: IfNotPresent

service:
  type: ClusterIP
  port: 80
  targetPort: 8080

resources:
  requests:
    memory: "128Mi"
    cpu: "100m"
  limits:
    memory: "256Mi"
    cpu: "500m"

env:
  - name: DATABASE_URL
    value: "postgres://user-db:5432/users"
  - name: PORT
    value: "8080"
```

```yaml
# helm/user-service/templates/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: {{ .Release.Name }}
  labels:
    app: {{ .Release.Name }}
spec:
  replicas: {{ .Values.replicaCount }}
  selector:
    matchLabels:
      app: {{ .Release.Name }}
  template:
    metadata:
      labels:
        app: {{ .Release.Name }}
    spec:
      containers:
        - name: {{ .Release.Name }}
          image: "{{ .Values.image.repository }}:{{ .Values.image.tag }}"
          ports:
            - containerPort: {{ .Values.service.targetPort }}
          env:
            {{- range .Values.env }}
            - name: {{ .name }}
              value: {{ .value | quote }}
            {{- end }}
          resources:
            {{- toYaml .Values.resources | nindent 12 }}
          livenessProbe:
            httpGet:
              path: /health
              port: {{ .Values.service.targetPort }}
            initialDelaySeconds: 10
            periodSeconds: 15
          readinessProbe:
            httpGet:
              path: /health
              port: {{ .Values.service.targetPort }}
            initialDelaySeconds: 5
            periodSeconds: 10
```

```yaml
# helm/user-service/templates/service.yaml
apiVersion: v1
kind: Service
metadata:
  name: {{ .Release.Name }}
spec:
  type: {{ .Values.service.type }}
  selector:
    app: {{ .Release.Name }}
  ports:
    - port: {{ .Values.service.port }}
      targetPort: {{ .Values.service.targetPort }}
```

## The Skaffold Configuration

Here is the main `skaffold.yaml` that ties everything together.

```yaml
# skaffold.yaml - Multi-service pipeline with Helm
apiVersion: skaffold/v4beta6
kind: Config
metadata:
  name: my-platform

build:
  artifacts:
    # Build each service
    - image: api-gateway
      context: services/api-gateway
      docker:
        dockerfile: Dockerfile
    - image: user-service
      context: services/user-service
      docker:
        dockerfile: Dockerfile
    - image: order-service
      context: services/order-service
      docker:
        dockerfile: Dockerfile
    - image: notification-service
      context: services/notification-service
      docker:
        dockerfile: Dockerfile

deploy:
  helm:
    releases:
      # Deploy each service with its Helm chart
      - name: api-gateway
        chartPath: helm/api-gateway
        setValueTemplates:
          image.repository: "{{.IMAGE_REPO_api_gateway}}"
          image.tag: "{{.IMAGE_TAG_api_gateway}}"
      - name: user-service
        chartPath: helm/user-service
        setValueTemplates:
          image.repository: "{{.IMAGE_REPO_user_service}}"
          image.tag: "{{.IMAGE_TAG_user_service}}"
      - name: order-service
        chartPath: helm/order-service
        setValueTemplates:
          image.repository: "{{.IMAGE_REPO_order_service}}"
          image.tag: "{{.IMAGE_TAG_order_service}}"
      - name: notification-service
        chartPath: helm/notification-service
        setValueTemplates:
          image.repository: "{{.IMAGE_REPO_notification_service}}"
          image.tag: "{{.IMAGE_TAG_notification_service}}"

portForward:
  - resourceType: service
    resourceName: api-gateway
    port: 80
    localPort: 8080
```

The `setValueTemplates` section is key. Skaffold injects the built image repository and tag into the Helm values, replacing the placeholders with the actual image references. The variable names are derived from the artifact image names with dots and hyphens replaced by underscores.

## Running the Pipeline

Start the development loop.

```bash
# Start Skaffold dev - builds all services and deploys with Helm
skaffold dev --default-repo=us-central1-docker.pkg.dev/my-project/my-repo
```

Skaffold will:

1. Build all four Docker images
2. Push them to Artifact Registry
3. Deploy each service using its Helm chart
4. Set up port forwarding for the API gateway
5. Watch for source code changes

When you edit a file in `services/user-service/src/`, Skaffold only rebuilds and redeploys the user service. The other services remain untouched. This selective rebuild is one of Skaffold's most useful features for microservice development.

## Environment-Specific Values

Use separate values files for different environments.

```yaml
# helm/user-service/values-dev.yaml
replicaCount: 1
resources:
  requests:
    memory: "64Mi"
    cpu: "50m"
env:
  - name: DATABASE_URL
    value: "postgres://user-db:5432/users_dev"
  - name: LOG_LEVEL
    value: "debug"
```

```yaml
# helm/user-service/values-prod.yaml
replicaCount: 3
resources:
  requests:
    memory: "256Mi"
    cpu: "250m"
  limits:
    memory: "512Mi"
    cpu: "1000m"
env:
  - name: DATABASE_URL
    valueFrom:
      secretKeyRef:
        name: user-service-secrets
        key: database-url
  - name: LOG_LEVEL
    value: "warn"
```

Reference these in Skaffold profiles.

```yaml
# skaffold.yaml - With environment profiles
profiles:
  - name: dev
    deploy:
      helm:
        releases:
          - name: user-service
            chartPath: helm/user-service
            valuesFiles:
              - helm/user-service/values-dev.yaml
            setValueTemplates:
              image.repository: "{{.IMAGE_REPO_user_service}}"
              image.tag: "{{.IMAGE_TAG_user_service}}"

  - name: production
    build:
      googleCloudBuild:
        projectId: my-project
    deploy:
      helm:
        releases:
          - name: user-service
            chartPath: helm/user-service
            valuesFiles:
              - helm/user-service/values-prod.yaml
            setValueTemplates:
              image.repository: "{{.IMAGE_REPO_user_service}}"
              image.tag: "{{.IMAGE_TAG_user_service}}"
```

## Service Dependencies

Some services depend on others. You can control the deployment order.

```yaml
# skaffold.yaml - With dependency ordering
deploy:
  helm:
    releases:
      # Deploy databases first
      - name: user-db
        chartPath: helm/user-db
        wait: true  # Wait for pods to be ready before continuing
      - name: order-db
        chartPath: helm/order-db
        wait: true
      # Then deploy services
      - name: user-service
        chartPath: helm/user-service
        setValueTemplates:
          image.repository: "{{.IMAGE_REPO_user_service}}"
          image.tag: "{{.IMAGE_TAG_user_service}}"
      - name: order-service
        chartPath: helm/order-service
        setValueTemplates:
          image.repository: "{{.IMAGE_REPO_order_service}}"
          image.tag: "{{.IMAGE_TAG_order_service}}"
      # Deploy gateway last
      - name: api-gateway
        chartPath: helm/api-gateway
        setValueTemplates:
          image.repository: "{{.IMAGE_REPO_api_gateway}}"
          image.tag: "{{.IMAGE_TAG_api_gateway}}"
```

## Using Skaffold Modules

For larger projects, you can split the Skaffold config into modules.

```yaml
# skaffold.yaml - Root config importing modules
apiVersion: skaffold/v4beta6
kind: Config
metadata:
  name: my-platform
requires:
  - path: services/user-service/skaffold.yaml
  - path: services/order-service/skaffold.yaml
  - path: services/api-gateway/skaffold.yaml
  - path: services/notification-service/skaffold.yaml
```

```yaml
# services/user-service/skaffold.yaml - Per-service config
apiVersion: skaffold/v4beta6
kind: Config
metadata:
  name: user-service
build:
  artifacts:
    - image: user-service
      docker:
        dockerfile: Dockerfile
deploy:
  helm:
    releases:
      - name: user-service
        chartPath: ../../helm/user-service
        setValueTemplates:
          image.repository: "{{.IMAGE_REPO_user_service}}"
          image.tag: "{{.IMAGE_TAG_user_service}}"
```

This lets you develop individual services independently or run the whole platform.

```bash
# Develop just the user service
skaffold dev -m user-service

# Develop the full platform
skaffold dev
```

## Wrapping Up

Skaffold with Helm on GKE provides a complete development pipeline for microservice architectures. Each service gets its own Helm chart for configuration templating, and Skaffold handles the build-push-deploy cycle automatically. The selective rebuild feature means you only rebuild what changed, and Helm's templating keeps your Kubernetes manifests DRY and environment-aware. For teams working on multiple services simultaneously, this setup is a significant productivity boost.
