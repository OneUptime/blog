# How to Install Epinio on Kubernetes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Epinio, Kubernetes, PaaS, Developer Experience, Helm

Description: A complete guide to installing Epinio, the application deployment platform, on any Kubernetes cluster using Helm.

## Introduction

Epinio is a developer-friendly PaaS (Platform as a Service) built on Kubernetes. It provides a simple push-to-deploy workflow similar to Heroku or Cloud Foundry, while running on your own Kubernetes cluster. Developers can deploy applications without writing Kubernetes manifests, while operators maintain full control over the underlying infrastructure.

## Prerequisites

- Kubernetes cluster (v1.20-v1.28)
- `kubectl` configured for the cluster
- `helm` v3.x installed
- A wildcard-enabled domain that points to your ingress controller
- A default `IngressClass`
- A default `StorageClass`
- cert-manager (required for the TLS setup used below)

## Step 1: Install Required Dependencies

### Install cert-manager

```bash
helm repo add jetstack https://charts.jetstack.io
helm repo update

helm upgrade --install cert-manager jetstack/cert-manager \
  --namespace cert-manager \
  --create-namespace \
  --set crds.enabled=true
```

### Install an Ingress Controller

```bash
# Install NGINX Ingress

helm repo add ingress-nginx https://kubernetes.github.io/ingress-nginx
helm repo update

helm upgrade --install ingress-nginx ingress-nginx/ingress-nginx \
  --namespace ingress-nginx \
  --create-namespace \
  --set controller.ingressClassResource.default=true

# Get the external IP
kubectl get svc -n ingress-nginx ingress-nginx-controller

# Verify a default StorageClass exists
kubectl get storageclass
```

## Step 2: Add the Epinio Helm Repository

```bash
helm repo add epinio https://epinio.github.io/helm-charts
helm repo update

# See available versions
helm search repo epinio
```

## Step 3: Install Epinio

### Basic Installation

```bash
# Install Epinio with your domain
helm install epinio epinio/epinio \
  --namespace epinio \
  --create-namespace \
  --set global.domain=epinio.example.com \
  --set global.tlsIssuer=selfsigned-issuer
```

### Production Installation with Let's Encrypt

```yaml
# epinio-values.yaml
global:
  # Base domain backed by a wildcard DNS record
  domain: epinio.example.com
  # TLS configuration
  tlsIssuer: letsencrypt-production
  tlsIssuerEmail: user@example.com

# Use external S3-compatible storage
seaweedfs:
  enabled: false

s3:
  endpoint: s3.amazonaws.com
  bucket: my-epinio-bucket
  region: us-west-2
  accessKeyID: "your-access-key"
  secretAccessKey: "your-secret-key"

# Configure internal container registry
containerregistry:
  enabled: true
```

```bash
helm install epinio epinio/epinio \
  --namespace epinio \
  --create-namespace \
  --values epinio-values.yaml
```

## Step 4: Install the Epinio CLI

```bash
# Install on Linux (AMD64)
curl -fsSL \
  https://github.com/epinio/epinio/releases/latest/download/epinio-linux-x86_64 \
  -o /usr/local/bin/epinio
chmod +x /usr/local/bin/epinio

# Verify installation
epinio version
```

## Step 5: Login to Epinio

```bash
# Login with the default admin user
epinio login https://epinio.epinio.example.com \
  --user admin \
  --password password \
  --trust-ca

# Verify login
epinio settings show
```

## Step 6: Verify Installation

```bash
# Check all Epinio pods are running
kubectl get pods -n epinio

# Check Epinio services
kubectl get svc -n epinio

# Verify ingress is configured
kubectl get ingress -n epinio

# Test the API
epinio app list
```

## Step 7: Deploy a Test Application

```bash
# Create a test application directory
mkdir hello-world && cd hello-world
cat > app.rb << 'EOF'
require 'sinatra'
configure { set :server, :puma }

get '/' do
  "Hello from Epinio!\n"
end
EOF

cat > Gemfile << 'EOF'
source 'https://rubygems.org'

gem 'puma'
gem 'sinatra'
EOF

cat > config.ru << 'EOF'
require './app'
run Sinatra::Application
EOF

# Push the application
epinio push --name hello-world --path .

# Check deployment
epinio app show hello-world
```

## Conclusion

Epinio transforms Kubernetes into a developer-friendly PaaS without sacrificing operator control. Once installed, developers can push applications using a simple `epinio push` command without needing to understand Kubernetes internals. The platform handles buildpacks, containers, routing, and SSL certificates automatically.
