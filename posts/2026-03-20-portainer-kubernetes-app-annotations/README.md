# How to Configure Application Annotations in Portainer for Kubernetes - App

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Kubernetes, Annotation, Configuration, DevOps

Description: Learn how to add and manage Kubernetes annotations on applications in Portainer for metadata, tools integration, and advanced configuration.

## Introduction

Kubernetes annotations are key-value metadata attached to resources for tooling integration, documentation, and advanced configuration. Unlike labels, annotations are not used for selection but can contain arbitrary data used by controllers, operators, and external tools. Portainer allows adding annotations when deploying applications. This guide covers annotation usage patterns.

## Prerequisites

- Portainer with Kubernetes environment
- An application to annotate

## Annotations vs Labels

| Feature | Labels | Annotations |
|---------|--------|-------------|
| Selection/filtering | Yes | No |
| Max value size | 63 chars | Can be large |
| Use case | Grouping, selector | Metadata, tooling |
| Example | `app: myapp` | `description: "..."` |

## Step 1: Add Annotations via Portainer Form

When creating/editing an application:

1. Find the **Annotations** section
2. Add key-value pairs:

```text
Key: description
Value: Production API service for order processing

Key: contact
Value: backend-team@company.com

Key: version
Value: v2.0.0
```

## Step 2: Configure Annotations via YAML

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-api
  namespace: production
  annotations:
    # Documentation annotations
    description: "Production API service for order processing"
    contact: "backend-team@company.com"
    documentation: "https://wiki.company.com/api-docs"

    # Deployment metadata
    kubernetes.io/change-cause: "Deploy v2.0.0: Add payment processing"

    # CI/CD metadata
    ci.pipeline: "github-actions"
    ci.commit: "abc123def456"
    ci.build: "github-actions-123"
    ci.branch: "main"

spec:
  template:
    metadata:
      annotations:
        # Pod-level annotations (different from deployment annotations)
        prometheus.io/scrape: "true"      # Common Prometheus scrape convention
        prometheus.io/port: "9090"
        prometheus.io/path: "/metrics"

        # Sidecar injection (for example, Istio)
        sidecar.istio.io/inject: "true"

        # Vault secrets injection
        vault.hashicorp.com/agent-inject: "true"
        vault.hashicorp.com/role: "my-api"
        vault.hashicorp.com/agent-inject-secret-db: "secret/data/production/db"
```

## Step 3: Common Annotation Patterns

### Prometheus Metrics Scraping

```yaml
# Pod template annotations

metadata:
  annotations:
    prometheus.io/scrape: "true"    # Common convention used by Prometheus relabeling
    prometheus.io/path: "/metrics"  # Metrics endpoint path
    prometheus.io/port: "8080"      # Metrics port
    prometheus.io/scheme: "http"    # HTTP or HTTPS
```

### Nginx Ingress Configuration

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  annotations:
    nginx.ingress.kubernetes.io/rewrite-target: /
    nginx.ingress.kubernetes.io/ssl-redirect: "true"
    nginx.ingress.kubernetes.io/proxy-body-size: "50m"
    nginx.ingress.kubernetes.io/proxy-read-timeout: "300"
    nginx.ingress.kubernetes.io/limit-rps: "100"
    nginx.ingress.kubernetes.io/limit-burst-multiplier: "5"
    nginx.ingress.kubernetes.io/enable-cors: "true"
    nginx.ingress.kubernetes.io/cors-allow-origin: "https://app.example.com"
    cert-manager.io/cluster-issuer: letsencrypt-prod
```

### Cluster Autoscaler

```yaml
spec:
  template:
    metadata:
      annotations:
        # Safe to evict during node scale-down
        cluster-autoscaler.kubernetes.io/safe-to-evict: "true"
```

### Custom Tooling Metadata

```yaml
metadata:
  annotations:
    example.com/runbook: "https://wiki.company.com/runbooks/my-api"
    example.com/team: "platform"
```

### Logging Pipeline Metadata

```yaml
metadata:
  annotations:
    logging.example.com/parser: "json"
    logging.example.com/tag: "production.api"
```

### Linkerd Service Mesh

```yaml
spec:
  template:
    metadata:
      annotations:
        linkerd.io/inject: "enabled"
        config.linkerd.io/proxy-cpu-request: "100m"
        config.linkerd.io/proxy-memory-request: "20Mi"
```

## Step 4: Record Deployment History

Use annotations to track deployment history:

```bash
# Set a change cause annotation
kubectl annotate deployment my-api -n production \
  kubernetes.io/change-cause="Deploy v2.0.0: Add payment processing" \
  --overwrite

# View rollout history with causes
kubectl rollout history deployment/my-api -n production
# REVISION  CHANGE-CAUSE
# 1         Deploy v1.0.0: Initial release
# 2         Deploy v1.1.0: Add caching
# 3         Deploy v2.0.0: Add payment processing
```

## Step 5: View Annotations

```bash
# View all annotations on a resource
kubectl describe deployment my-api -n production | grep -A20 "Annotations:"

# Get specific annotation value
kubectl get deployment my-api -n production \
  -o jsonpath='{.metadata.annotations.description}'

# Get all annotations as JSON
kubectl get deployment my-api -n production \
  -o jsonpath-as-json='{.metadata.annotations}' | python3 -m json.tool
```

## Step 6: Update Annotations

```bash
# Add or update an annotation
kubectl annotate deployment my-api -n production \
  version="v2.1.0" \
  --overwrite

# Remove an annotation (add trailing dash)
kubectl annotate deployment my-api -n production \
  description-
```

In Portainer: edit the application, modify the annotations section, and save.

## Step 7: Annotations on Other Resources

Annotations can be applied to any Kubernetes resource:

```yaml
# Service annotations
apiVersion: v1
kind: Service
metadata:
  annotations:
    service.beta.kubernetes.io/aws-load-balancer-type: nlb
    external-dns.alpha.kubernetes.io/hostname: api.example.com
    external-dns.alpha.kubernetes.io/ttl: "60"

# Pod annotations for Velero file-system backup
apiVersion: v1
kind: Pod
metadata:
  annotations:
    backup.velero.io/backup-volumes: "data"
```

## Conclusion

Annotations are a powerful mechanism for attaching metadata and configuration to Kubernetes resources. The most impactful uses are enabling Prometheus metrics scraping, configuring Ingress controllers, integrating with service meshes, and tracking deployment history. Portainer's annotation support lets you set these values through the form UI or YAML editor, ensuring your workloads integrate properly with the broader Kubernetes ecosystem.
