# How to Deploy GitLab on Rancher

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher, GitLab, Kubernetes, DevOps, Helm, CI/CD

Description: Deploy GitLab on Rancher with Helm for a self-hosted DevOps platform including Git, CI/CD pipelines, container registry, and issue tracking.

## Introduction

GitLab is a complete DevOps platform providing Git hosting, CI/CD pipelines, container registry, artifact storage, and issue tracking. Deploying it on Rancher gives organizations full control over their source code and pipeline infrastructure.

## Prerequisites

- Rancher cluster with at least 8 CPUs and 16GB RAM
- An external PostgreSQL database (recommended for production)
- An S3-compatible object store for artifacts
- A domain name with wildcard DNS support

## Step 1: Add GitLab Repository

```bash
helm repo add gitlab https://charts.gitlab.io/
helm repo update
```

## Step 2: Configure Values

```yaml
# gitlab-values.yaml

global:
  hosts:
    domain: example.com         # GitLab will be at gitlab.example.com
    externalIP: 10.0.0.100      # Your Ingress IP

  ingress:
    class: nginx
    configureCertmanager: false   # Using our own ClusterIssuer
    annotations:
      cert-manager.io/cluster-issuer: letsencrypt-prod

  psql:
    host: postgres.databases.svc.cluster.local
    port: 5432
    database: gitlabhq_production
    username: gitlab
    password:
      useSecret: true
      secret: gitlab-postgres-password
      key: postgres-password

  appConfig:
    object_store:
      enabled: true
      connection:
        secret: gitlab-s3-connection
        key: connection

certmanager:
  install: false    # Use existing cert-manager

nginx-ingress:
  enabled: false    # Use Rancher's Ingress controller

# Disable bundled PostgreSQL
postgresql:
  install: false

# Resource limits and Gitaly persistence
gitlab:
  webservice:
    resources:
      requests:
        memory: 1.5Gi
        cpu: 500m
    replicaCount: 2
  sidekiq:
    resources:
      requests:
        memory: 1Gi
        cpu: 500m
  gitaly:
    persistence:
      storageClass: longhorn
      size: 100Gi    # Storage for Git repositories
    resources:
      requests:
        memory: 600Mi
        cpu: 400m
```

## Step 3: Create S3 Connection Secret

```bash
kubectl create namespace gitlab

kubectl create secret generic gitlab-s3-connection \
  --from-file=connection=s3-config.yml \
  -n gitlab

# Create the external PostgreSQL password secret referenced in values
kubectl create secret generic gitlab-postgres-password \
  --from-literal=postgres-password=gitlabpassword \
  -n gitlab
```

`s3-config.yml`:
```yaml
provider: AWS
region: us-east-1
aws_access_key_id: YOUR_ACCESS_KEY
aws_secret_access_key: YOUR_SECRET_KEY
aws_signature_version: 4
endpoint: 'https://s3.amazonaws.com'
```

## Step 4: Deploy GitLab

```bash
helm install gitlab gitlab/gitlab \
  --namespace gitlab \
  --values gitlab-values.yaml \
  --timeout 600s

# Monitor deployment (takes 10-20 minutes)
kubectl get pods -n gitlab -w
```

## Step 5: Get Initial Root Password

```bash
# Get the initial root password
kubectl get secret gitlab-gitlab-initial-root-password \
  -n gitlab \
  -o jsonpath='{.data.password}' | base64 -d
```

## Step 6: Configure GitLab Runner on Rancher

```bash
# Register a GitLab Runner in the cluster
helm install gitlab-runner gitlab/gitlab-runner \
  --namespace gitlab \
  --set gitlabUrl=https://gitlab.example.com \
  --set runnerToken=YOUR_RUNNER_TOKEN
```

## Conclusion

GitLab on Rancher provides a complete self-hosted DevOps platform. The Helm chart handles the complexity of GitLab's many components. For production, always use an external PostgreSQL database and S3 object storage rather than the bundled options, as they provide proper backup and scaling capabilities.
