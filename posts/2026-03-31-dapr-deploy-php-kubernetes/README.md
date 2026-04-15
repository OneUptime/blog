# How to Deploy Dapr PHP Applications on Kubernetes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, PHP, Kubernetes, Deployment, Container

Description: Learn how to containerize and deploy a Dapr PHP application to Kubernetes with proper sidecar injection, component secrets, and health check configuration.

---

## Introduction

Deploying a Dapr PHP application to Kubernetes follows the same pattern as other Dapr apps: containerize your PHP code, install Dapr on the cluster, apply component manifests, and annotate your Deployment to enable sidecar injection.

## Prerequisites

```bash
# Install Dapr on Kubernetes
dapr init --kubernetes --wait
kubectl get pods -n dapr-system
```

## Dockerfile for PHP App

```dockerfile
FROM php:8.2-fpm-alpine

RUN apk add --no-cache nginx supervisor
COPY nginx.conf /etc/nginx/nginx.conf

WORKDIR /app
COPY composer.json composer.lock ./
RUN curl -sS https://getcomposer.org/installer | php && \
    php composer.phar install --no-dev --optimize-autoloader

COPY . .

EXPOSE 8080
CMD ["/usr/bin/supervisord", "-c", "/etc/supervisord.conf"]
```

```nginx
# nginx.conf (simplified)
server {
    listen 8080;
    root /app/public;
    index index.php;
    location ~ \.php$ {
        fastcgi_pass 127.0.0.1:9000;
        fastcgi_param SCRIPT_FILENAME $document_root$fastcgi_script_name;
        include fastcgi_params;
    }
}
```

## Building and Pushing the Image

```bash
docker build -t my-registry/php-order-service:v1.0 .
docker push my-registry/php-order-service:v1.0
```

## Dapr Component Manifests

```yaml
# k8s/components/statestore.yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: statestore
  namespace: default
spec:
  type: state.redis
  version: v1
  metadata:
    - name: redisHost
      value: redis:6379
    - name: redisPassword
      secretKeyRef:
        name: redis-credentials
        key: password
  auth:
    secretStore: kubernetes
```

## Kubernetes Deployment

```yaml
# k8s/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: php-order-service
  namespace: default
spec:
  replicas: 3
  selector:
    matchLabels:
      app: php-order-service
  template:
    metadata:
      labels:
        app: php-order-service
      annotations:
        dapr.io/enabled: "true"
        dapr.io/app-id: "order-service"
        dapr.io/app-port: "8080"
        dapr.io/log-level: "info"
        dapr.io/sidecar-cpu-request: "100m"
        dapr.io/sidecar-memory-request: "128Mi"
    spec:
      containers:
        - name: php-order-service
          image: my-registry/php-order-service:v1.0
          ports:
            - containerPort: 8080
          livenessProbe:
            httpGet:
              path: /healthz
              port: 8080
            initialDelaySeconds: 15
          readinessProbe:
            httpGet:
              path: /readyz
              port: 8080
            initialDelaySeconds: 5
```

## Health Check Endpoint

```php
<?php
// public/index.php additions
if ($path === '/healthz') {
    header('Content-Type: application/json');
    echo json_encode(['status' => 'ok']);
    exit;
}

if ($path === '/readyz') {
    // Optionally check Dapr sidecar
    header('Content-Type: application/json');
    echo json_encode(['status' => 'ready']);
    exit;
}
```

## Service Manifest

```yaml
apiVersion: v1
kind: Service
metadata:
  name: php-order-service
spec:
  selector:
    app: php-order-service
  ports:
    - port: 80
      targetPort: 8080
```

## Deploying to the Cluster

```bash
kubectl apply -f k8s/components/
kubectl apply -f k8s/deployment.yaml

# Verify Dapr sidecar injection
kubectl get pods -l app=php-order-service
kubectl logs <pod-name> -c daprd --tail=20
```

## Summary

Deploying Dapr PHP applications to Kubernetes requires a PHP-capable container image, Dapr component manifests, and Deployment annotations for sidecar injection. Resource requests on the sidecar container guarantee it a minimum share of cluster resources. Health and readiness probes ensure the PHP-FPM process is ready before Kubernetes routes traffic to the pod.
