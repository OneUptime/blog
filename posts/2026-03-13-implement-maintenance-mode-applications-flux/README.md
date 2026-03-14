# How to Implement Maintenance Mode for Applications with Flux CD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, Kubernetes, GitOps, Day 2 Operations, Maintenance Mode, Traffic Management

Description: Switch applications into maintenance mode using Flux CD by redirecting traffic to a maintenance page through GitOps-managed Ingress and deployment configurations.

---

## Introduction

Maintenance mode is a controlled state where an application is temporarily taken offline for planned maintenance, data migrations, or emergency fixes while presenting a user-friendly maintenance page to visitors. Implementing maintenance mode through GitOps ensures the state transition is auditable, reproducible, and quickly reversible.

Flux CD makes maintenance mode particularly clean: the transition is a Git commit that changes Ingress routing rules to point at a static maintenance page deployment, and the reversion is another Git commit. The entire lifecycle is in version control, the maintenance page is always available as a pre-deployed component, and the transition takes only as long as Flux's reconciliation interval.

In this guide you will build a maintenance mode implementation with a pre-deployed maintenance page, Ingress-based traffic switching, and Kustomize overlays for clean Git-based state management.

## Prerequisites

- Flux CD v2 managing Ingress resources in your cluster
- An Ingress controller (nginx or Traefik) installed
- kubectl and Flux CLI installed
- A maintenance page (static HTML served by nginx)

## Step 1: Create the Maintenance Page Deployment

The maintenance page should always be running, ready to accept traffic when activated.

```yaml
# infrastructure/maintenance-mode/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: maintenance-page
  namespace: platform-system
  labels:
    app: maintenance-page
spec:
  replicas: 2
  selector:
    matchLabels:
      app: maintenance-page
  template:
    metadata:
      labels:
        app: maintenance-page
    spec:
      containers:
        - name: nginx
          image: nginx:1.25-alpine
          ports:
            - containerPort: 80
          volumeMounts:
            - name: maintenance-html
              mountPath: /usr/share/nginx/html
          resources:
            requests:
              cpu: 10m
              memory: 16Mi
            limits:
              cpu: 100m
              memory: 64Mi
      volumes:
        - name: maintenance-html
          configMap:
            name: maintenance-page-content
---
apiVersion: v1
kind: Service
metadata:
  name: maintenance-page
  namespace: platform-system
spec:
  selector:
    app: maintenance-page
  ports:
    - port: 80
      targetPort: 80
```

```yaml
# infrastructure/maintenance-mode/content.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: maintenance-page-content
  namespace: platform-system
data:
  index.html: |
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Scheduled Maintenance</title>
      <style>
        body { font-family: system-ui; text-align: center; padding: 4rem; background: #f8f9fa; }
        h1 { color: #343a40; }
        p { color: #6c757d; max-width: 500px; margin: 1rem auto; }
        .badge { background: #ffc107; padding: 0.5rem 1rem; border-radius: 4px; }
      </style>
    </head>
    <body>
      <h1>Scheduled Maintenance</h1>
      <span class="badge">We'll be back shortly</span>
      <p>We're performing scheduled maintenance to improve your experience.
         Please check back in a few minutes.</p>
      <p>For urgent matters, contact <a href="mailto:support@acme.com">support@acme.com</a></p>
    </body>
    </html>
```

## Step 2: Create Normal and Maintenance Ingress Overlays

Use Kustomize overlays to manage the two states of Ingress configuration.

```plaintext
deploy/
├── base/
│   └── ingress.yaml         # Base Ingress (normal operation)
├── overlays/
│   ├── normal/
│   │   └── kustomization.yaml   # Normal mode overlay
│   └── maintenance/
│       ├── kustomization.yaml   # Maintenance mode overlay
│       └── ingress-patch.yaml   # Patches Ingress to point at maintenance page
```

```yaml
# deploy/base/ingress.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: my-service
  namespace: team-alpha
  annotations:
    nginx.ingress.kubernetes.io/proxy-read-timeout: "60"
spec:
  ingressClassName: nginx
  rules:
    - host: my-service.acme.example.com
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: my-service
                port:
                  number: 8080
```

```yaml
# deploy/overlays/maintenance/ingress-patch.yaml
# Redirects all traffic to the maintenance page
- op: replace
  path: /spec/rules/0/http/paths/0/backend
  value:
    service:
      name: maintenance-page
      namespace: platform-system
      port:
        number: 80
- op: add
  path: /metadata/annotations/nginx.ingress.kubernetes.io~1custom-http-errors
  value: "503"
- op: add
  path: /metadata/annotations/nginx.ingress.kubernetes.io~1default-backend
  value: platform-system/maintenance-page
```

```yaml
# deploy/overlays/maintenance/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - ../../base
patches:
  - path: ingress-patch.yaml
    target:
      kind: Ingress
      name: my-service
```

## Step 3: Configure Flux Kustomizations for Each State

```yaml
# tenants/overlays/team-alpha/kustomization-my-service.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: my-service
  namespace: team-alpha
spec:
  interval: 2m
  prune: true
  sourceRef:
    kind: GitRepository
    name: team-alpha-apps
  # Switch between overlays to enable/disable maintenance mode:
  # Normal: path: ./deploy/overlays/normal
  # Maintenance: path: ./deploy/overlays/maintenance
  path: ./deploy/overlays/normal
```

## Step 4: Activate and Deactivate Maintenance Mode

```bash
# Activate maintenance mode (change the path in the Kustomization)
kubectl patch kustomization my-service -n team-alpha \
  --type=merge \
  -p '{"spec":{"path":"./deploy/overlays/maintenance"}}'

# Or do it the GitOps way - edit the Kustomization path in the platform repo:
# path: ./deploy/overlays/maintenance
# Commit, push, and Flux reconciles within its interval

# Verify maintenance mode is active
curl -s -o /dev/null -w "%{http_code}" https://my-service.acme.example.com
# Should return 200 (maintenance page, not the app)

# Deactivate maintenance mode
kubectl patch kustomization my-service -n team-alpha \
  --type=merge \
  -p '{"spec":{"path":"./deploy/overlays/normal"}}'

# Wait for Flux to reconcile and verify app is back
flux get kustomization my-service -n team-alpha --watch
```

## Step 5: Automate with a Maintenance Window Script

```bash
#!/bin/bash
# scripts/maintenance-mode.sh

ACTION=$1       # enable or disable
SERVICE=$2      # e.g., my-service
NAMESPACE=$3    # e.g., team-alpha

case $ACTION in
  enable)
    echo "Enabling maintenance mode for $SERVICE in $NAMESPACE..."
    kubectl patch kustomization $SERVICE -n $NAMESPACE \
      --type=merge \
      -p '{"spec":{"path":"./deploy/overlays/maintenance"}}'
    flux reconcile kustomization $SERVICE -n $NAMESPACE
    echo "Maintenance mode active at: $(date -u +%Y-%m-%dT%H:%M:%SZ)"
    ;;
  disable)
    echo "Disabling maintenance mode for $SERVICE in $NAMESPACE..."
    kubectl patch kustomization $SERVICE -n $NAMESPACE \
      --type=merge \
      -p '{"spec":{"path":"./deploy/overlays/normal"}}'
    flux reconcile kustomization $SERVICE -n $NAMESPACE
    echo "Normal operation restored at: $(date -u +%Y-%m-%dT%H:%M:%SZ)"
    ;;
  *)
    echo "Usage: $0 {enable|disable} <service> <namespace>"
    exit 1
    ;;
esac
```

## Best Practices

- Keep the maintenance page deployment always running - it should be cheap (10m CPU, 16Mi memory) and always ready
- Test the maintenance mode activation in staging before using it in production
- Send proactive user notifications before enabling maintenance mode when possible
- Set a maximum maintenance window duration and alert if it exceeds the limit
- Monitor the maintenance page service health separately - a failed maintenance page during maintenance is the worst outcome
- Use the GitOps-native approach (commit the path change) rather than kubectl patches for planned maintenance

## Conclusion

Flux CD's Kustomize overlay system makes maintenance mode a clean, auditable, and reversible operation. By maintaining a pre-deployed maintenance page and two Ingress overlays, switching between normal and maintenance states is a single commit or a single kubectl patch. The transition is fast (within Flux's reconciliation interval), the maintenance page is always ready, and the full history of when maintenance mode was activated and deactivated is preserved in Git.
