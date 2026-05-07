# How to Configure Application Annotations in Portainer for Kubernetes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Kubernetes, Annotation, Ingress, Configuration

Description: Learn how to add and manage Kubernetes annotations on applications deployed through Portainer.

## What Are Kubernetes Annotations?

Annotations are key-value pairs attached to Kubernetes objects that store non-identifying metadata. Unlike labels (used for selection), annotations hold configuration hints, tool-specific settings, or documentation. Common uses:

- Ingress controller configuration (Nginx, Traefik)
- Prometheus scraping instructions
- Deployment strategy hints
- GitOps metadata

## Adding Annotations in Portainer

When creating or editing an application in Portainer:

1. Open the application form in Portainer.
2. Under **Base configuration**, find **Annotations**.
3. Click **Add annotation** and enter key-value pairs.
4. Save the changes to create or update the application.

## Common Annotation Examples

Apply each annotation to the Kubernetes object expected by the controller or tool.

### Nginx Ingress Annotations

```yaml
# Ingress metadata annotations

metadata:
  name: my-app-ingress
  annotations:
    # Nginx Ingress controller configuration
    nginx.ingress.kubernetes.io/rewrite-target: /
    nginx.ingress.kubernetes.io/proxy-body-size: "50m"
    nginx.ingress.kubernetes.io/ssl-redirect: "true"
    nginx.ingress.kubernetes.io/limit-rps: "100"
```

### Prometheus Scraping Annotations

```yaml
# Pod template annotations for Prometheus auto-discovery
spec:
  template:
    metadata:
      annotations:
        prometheus.io/scrape: "true"       # Tell Prometheus to scrape this pod
        prometheus.io/port: "8080"         # Port where metrics are exposed
        prometheus.io/path: "/metrics"     # Metrics endpoint path
```

### Deployment Change Tracking

```yaml
metadata:
  annotations:
    # Track who deployed and from which CI job
    example.com/deployed-by: "github-actions"
    example.com/git-commit: "abc123"
    example.com/deployed-at: "2026-03-20T10:30:00Z"
```

## Force Pod Restart via Annotation

You can trigger a rolling restart without changing the application logic by updating an annotation on the Pod template:

```bash
# Trigger a rolling restart by updating a Pod template annotation
kubectl patch deployment my-app \
  --namespace=production \
  -p "{\"spec\":{\"template\":{\"metadata\":{\"annotations\":{\"kubectl.kubernetes.io/restartedAt\":\"$(date -u +%Y-%m-%dT%H:%M:%SZ)\"}}}}}"

# Or use the dedicated restart command
kubectl rollout restart deployment/my-app --namespace=production
```

## Adding Annotations via CLI

```bash
# Add an annotation to a deployment
kubectl annotate deployment my-app \
  description="Primary web application" \
  --namespace=production

# Update an existing annotation
kubectl annotate deployment my-app \
  description="Updated web application" \
  --overwrite \
  --namespace=production

# Remove an annotation
kubectl annotate deployment my-app \
  description- \
  --namespace=production

# View all annotations
kubectl get deployment my-app -o json \
  --namespace=production | jq '.metadata.annotations'
```

## Ingress with Annotations Example

```yaml
# Ingress with Nginx-specific annotations
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: my-app-ingress
  annotations:
    nginx.ingress.kubernetes.io/ssl-redirect: "true"
    cert-manager.io/cluster-issuer: "letsencrypt-prod"
spec:
  tls:
    - hosts: [myapp.example.com]
      secretName: myapp-tls
  rules:
    - host: myapp.example.com
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: my-app
                port:
                  number: 80
```

## Conclusion

Annotations are a powerful metadata mechanism in Kubernetes. Portainer's forms and manifest editor let you add the necessary hints for ingress controllers, monitoring systems, and GitOps tooling without switching to the command line.
