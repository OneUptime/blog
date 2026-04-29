# How to Configure K3s with NGINX Ingress Instead of Traefik

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: k3s, Kubernetes, Nginx, Ingress, Networking, DevOps

Description: Learn how to replace K3s's default Traefik ingress controller with the NGINX Ingress Controller for more familiar ingress management.

## Introduction

K3s ships with Traefik as its default ingress controller, but many teams prefer NGINX Ingress due to its widespread adoption, rich documentation, and familiar configuration syntax. Switching to NGINX Ingress requires disabling Traefik and deploying the NGINX Ingress Controller. This guide walks through the complete process.

## Prerequisites

- A running K3s cluster
- `kubectl` configured
- Helm installed (optional but recommended)
- Basic understanding of Kubernetes Ingress

## Step 1: Disable Traefik in K3s

Prevent K3s from deploying Traefik at installation or by modifying the config:

### During Fresh Installation

```bash
# Install K3s without Traefik

curl -sfL https://get.k3s.io | \
  sh -s - --disable=traefik
```

### On an Existing Cluster

```yaml
# /etc/rancher/k3s/config.yaml
disable:
  - traefik
```

On multi-server clusters, apply this setting to every server node. Then restart K3s:

```bash
systemctl restart k3s

# Verify Traefik pods are gone
kubectl get pods -n kube-system | grep traefik
```

## Step 2: Install NGINX Ingress Controller with Helm

```bash
# Add the NGINX Ingress Helm repository
helm repo add ingress-nginx \
  https://kubernetes.github.io/ingress-nginx
helm repo update

# Create namespace for NGINX
kubectl create namespace ingress-nginx

# Install NGINX Ingress Controller
helm install ingress-nginx ingress-nginx/ingress-nginx \
  --namespace ingress-nginx \
  --set controller.replicaCount=2 \
  --set controller.service.type=LoadBalancer \
  --set controller.metrics.enabled=true \
  --set-string controller.podAnnotations."prometheus\.io/scrape"="true" \
  --set-string controller.podAnnotations."prometheus\.io/port"="10254"

# Verify installation
kubectl get pods -n ingress-nginx
kubectl get svc -n ingress-nginx
```

### Install via K3s Auto-Deploy Manifests (Recommended)

Use K3s's native HelmChart CRD for declarative management:

```yaml
# /var/lib/rancher/k3s/server/manifests/ingress-nginx.yaml
apiVersion: helm.cattle.io/v1
kind: HelmChart
metadata:
  name: ingress-nginx
  namespace: kube-system
spec:
  repo: https://kubernetes.github.io/ingress-nginx
  chart: ingress-nginx
  version: "4.15.1"
  targetNamespace: ingress-nginx
  createNamespace: true
  valuesContent: |-
    controller:
      replicaCount: 2
      service:
        type: LoadBalancer
      metrics:
        enabled: true
      config:
        use-forwarded-headers: "true"
        compute-full-forwarded-for: "true"
        use-proxy-protocol: "false"
      resources:
        requests:
          cpu: 100m
          memory: 128Mi
        limits:
          cpu: 500m
          memory: 512Mi
```

## Step 3: Verify NGINX is Running

```bash
# Check NGINX pods
kubectl get pods -n ingress-nginx

# Get the external IP/NodePort
kubectl get svc -n ingress-nginx ingress-nginx-controller

# Wait for the controller deployment to become ready
kubectl rollout status deployment/ingress-nginx-controller -n ingress-nginx
```

## Step 4: Create an Ingress Resource

Deploy a test application and expose it with an Ingress:

```yaml
# test-app.yaml
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: hello-app
  namespace: default
spec:
  replicas: 2
  selector:
    matchLabels:
      app: hello-app
  template:
    metadata:
      labels:
        app: hello-app
    spec:
      containers:
        - name: hello-app
          image: gcr.io/google-samples/hello-app:1.0
          ports:
            - containerPort: 8080
---
apiVersion: v1
kind: Service
metadata:
  name: hello-app-svc
  namespace: default
spec:
  selector:
    app: hello-app
  ports:
    - port: 80
      targetPort: 8080
---
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: hello-ingress
  namespace: default
spec:
  ingressClassName: nginx
  rules:
    - host: hello.example.com
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: hello-app-svc
                port:
                  number: 80
```

Apply and test:

```bash
kubectl apply -f test-app.yaml

# Test with a curl (using Host header for local testing)
NGINX_IP=$(kubectl get svc -n ingress-nginx ingress-nginx-controller \
  -o jsonpath='{.status.loadBalancer.ingress[0].ip}')
curl -H "Host: hello.example.com" http://$NGINX_IP/
```

## Step 5: Configure TLS with cert-manager

Assuming cert-manager is installed and a `ClusterIssuer` named `letsencrypt-prod` already exists:

```yaml
# ingress-with-tls.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: hello-tls-ingress
  namespace: default
  annotations:
    # Automatically provision Let's Encrypt certificate
    cert-manager.io/cluster-issuer: "letsencrypt-prod"
spec:
  ingressClassName: nginx
  tls:
    - hosts:
        - hello.example.com
      secretName: hello-tls-cert
  rules:
    - host: hello.example.com
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: hello-app-svc
                port:
                  number: 80
```

## Step 6: NGINX-Specific Annotations

Common NGINX Ingress annotations:

```yaml
metadata:
  annotations:
    # Rate limiting
    nginx.ingress.kubernetes.io/limit-rps: "10"
    nginx.ingress.kubernetes.io/limit-connections: "5"

    # Timeouts
    nginx.ingress.kubernetes.io/proxy-connect-timeout: "60"
    nginx.ingress.kubernetes.io/proxy-read-timeout: "60"
    nginx.ingress.kubernetes.io/proxy-send-timeout: "60"

    # Body size
    nginx.ingress.kubernetes.io/proxy-body-size: "10m"

    # Rewrite (when using regex paths with capture groups)
    nginx.ingress.kubernetes.io/use-regex: "true"
    nginx.ingress.kubernetes.io/rewrite-target: "/$2"

    # Basic auth
    nginx.ingress.kubernetes.io/auth-type: "basic"
    nginx.ingress.kubernetes.io/auth-secret: "basic-auth"
    nginx.ingress.kubernetes.io/auth-realm: "Authentication Required"

    # CORS
    nginx.ingress.kubernetes.io/enable-cors: "true"
    nginx.ingress.kubernetes.io/cors-allow-origin: "https://example.com"
```

## Conclusion

Replacing Traefik with NGINX Ingress in K3s is straightforward - disable Traefik during installation, then deploy NGINX via Helm or K3s's HelmChart CRD. NGINX Ingress provides a familiar, well-documented annotation system and is backed by a large community. For most web application deployments, NGINX Ingress is an excellent choice that integrates seamlessly with cert-manager for automated TLS certificate management.
