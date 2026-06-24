# How to Convert Docker Compose to Kubernetes Manifests with Portainer Terra (2)

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Terraform, Kubernetes, Docker, Migration

Description: Learn how to use Portainer and Terraform to deploy applications that bridge Docker Compose and Kubernetes, and how to migrate workloads between the two using Kompose and Portainer's Kubernetes...

## Introduction

Many teams start with Docker Compose for simplicity and need to migrate to Kubernetes as their scale grows. Portainer's Terraform provider supports both Docker stacks and Kubernetes resources, making it possible to manage the migration process through code. This guide covers converting Docker Compose files to Kubernetes manifests and deploying them through Portainer.

## Prerequisites

- Portainer with both Docker and Kubernetes environments
- Terraform with Portainer provider
- `kompose` tool installed for conversion
- `kubectl` access to your cluster

## Step 1: Install Kompose

Kompose converts Docker Compose files to Kubernetes manifests:

```bash
# Install kompose

curl -L https://github.com/kubernetes/kompose/releases/latest/download/kompose-linux-amd64 \
  -o kompose
chmod +x ./kompose
sudo mv ./kompose /usr/local/bin/kompose

# Verify installation
kompose version
```

## Step 2: Your Docker Compose Starting Point

```yaml
# docker-compose.yml - Original Docker Compose
services:
  web:
    image: myapp:latest
    ports:
      - "80:8080"
    environment:
      DATABASE_URL: postgresql://db:5432/myapp
      REDIS_URL: redis://redis:6379
    depends_on:
      - db
      - redis

  db:
    image: postgres:15
    expose:
      - "5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
    environment:
      POSTGRES_DB: myapp
      POSTGRES_PASSWORD: mypassword

  redis:
    image: redis:7-alpine
    expose:
      - "6379"
    volumes:
      - redis_data:/data

volumes:
  postgres_data:
  redis_data:
```

## Step 3: Convert to Kubernetes Manifests

```bash
# Convert Docker Compose to Kubernetes YAML
kompose convert -f docker-compose.yml -o k8s/

# View generated files
ls k8s/
# web-deployment.yaml
# web-service.yaml
# db-deployment.yaml
# db-service.yaml
# postgres-data-persistentvolumeclaim.yaml
# redis-deployment.yaml
# redis-service.yaml
# redis-data-persistentvolumeclaim.yaml
```

## Step 4: Review and Enhance Generated Manifests

Kompose generates basic manifests. Enhance them for production:

```yaml
# k8s/web-deployment.yaml - Enhanced version
apiVersion: apps/v1
kind: Deployment
metadata:
  name: web
  namespace: myapp
  labels:
    app: web
    version: "1.0"
spec:
  replicas: 3                    # Added: multiple replicas
  selector:
    matchLabels:
      app: web
  template:
    metadata:
      labels:
        app: web
    spec:
      containers:
        - name: web
          image: myapp:latest
          ports:
            - containerPort: 8080
          env:
            - name: DATABASE_URL
              valueFrom:
                secretKeyRef:
                  name: myapp-secrets
                  key: database-url
            - name: REDIS_URL
              valueFrom:
                secretKeyRef:
                  name: myapp-secrets
                  key: redis-url
          resources:             # Added: resource limits
            requests:
              cpu: "100m"
              memory: "128Mi"
            limits:
              cpu: "500m"
              memory: "512Mi"
          readinessProbe:        # Added: readiness probe
            httpGet:
              path: /health
              port: 8080
            initialDelaySeconds: 10
            periodSeconds: 5
          livenessProbe:         # Added: liveness probe
            httpGet:
              path: /health
              port: 8080
            initialDelaySeconds: 30
            periodSeconds: 10
```

## Step 5: Deploy to Kubernetes via Portainer Terraform

```hcl
# k8s_resources.tf - Deploy Kubernetes manifests via Portainer

# Create the target namespace first
resource "portainer_kubernetes_namespace" "namespace" {
  environment_id = portainer_environment.k8s_production.id
  name           = "myapp"
}

resource "portainer_kubernetes_application" "deployment" {
  endpoint_id = portainer_environment.k8s_production.id
  namespace   = "myapp"

  manifest = file("${path.module}/k8s/web-deployment.yaml")

  depends_on = [portainer_kubernetes_namespace.namespace]
}

resource "portainer_kubernetes_service" "service" {
  endpoint_id = portainer_environment.k8s_production.id
  namespace   = "myapp"

  manifest = file("${path.module}/k8s/web-service.yaml")

  depends_on = [portainer_kubernetes_application.deployment]
}
```

## Step 6: Deploy Using Kubernetes Helm via Portainer

```hcl
# helm_releases.tf - Deploy via Helm through Portainer

resource "portainer_kubernetes_helm" "postgresql" {
  environment_id = portainer_environment.k8s_production.id
  name           = "postgresql"
  namespace      = "myapp"
  chart          = "postgresql"
  repo           = "https://charts.bitnami.com/bitnami"

  values = <<-EOT
    auth:
      postgresPassword: "${var.postgres_password}"
      database: "myapp"
    primary:
      persistence:
        enabled: true
        size: 20Gi
  EOT
}
```

## Step 7: Side-by-Side Management During Migration

During migration, manage both environments simultaneously:

```hcl
# migration.tf - Manage both Docker and Kubernetes during transition

# Docker Compose stack (old deployment)
resource "portainer_stack" "myapp_docker" {
  name            = "myapp-v1"
  deployment_type = "standalone"
  method          = "file"
  endpoint_id     = portainer_environment.docker.id

  stack_file_path = "${path.module}/docker-compose.yml"

  # Set to false when migration is complete
  count = var.use_docker_deployment ? 1 : 0
}

# Kubernetes deployment (new deployment)
resource "portainer_stack" "myapp_k8s" {
  name            = "myapp-v2"
  deployment_type = "kubernetes"
  method          = "string"
  endpoint_id     = portainer_environment.k8s.id
  namespace       = "myapp"

  stack_file_content = join("\n---\n", [
    file("${path.module}/k8s/web-deployment.yaml"),
    file("${path.module}/k8s/web-service.yaml"),
  ])

  # Enable when ready to migrate
  count = var.use_docker_deployment ? 0 : 1
}

variable "use_docker_deployment" {
  description = "Set to false to migrate to Kubernetes"
  type        = bool
  default     = true
}
```

## Step 8: Cutover Process

```bash
# Step 1: Verify Kubernetes deployment is healthy
kubectl get pods -n myapp
kubectl get svc -n myapp

# Step 2: Update DNS to point to your Kubernetes ingress or load balancer
# (Update your load balancer/DNS outside of Terraform)

# Step 3: Switch the Terraform variable
# In terraform.tfvars:
# use_docker_deployment = false

# Step 4: Apply - removes Docker stack, keeps K8s
terraform apply

# Step 5: Verify and clean up
terraform state list
```

## Conclusion

Portainer's Terraform provider enables a smooth transition from Docker Compose to Kubernetes by managing both environments through the same IaC toolchain. Use Kompose to generate initial Kubernetes manifests, enhance them for production readiness, and deploy through Portainer's Terraform provider. The migration can be staged using Terraform variables to control which deployment model is active, allowing safe cutover and rollback.
