# How to Deploy a Flask Application with Flux CD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, Kubernetes, GitOps, Flask, Python, Gunicorn, Deployment

Description: Deploy a Python Flask application to Kubernetes using Flux CD, with Gunicorn as the production WSGI server and GitOps-driven configuration management.

---

## Introduction

Flask is a lightweight Python web microframework that gives developers flexibility to compose exactly the stack they need. Its simplicity makes it a popular choice for REST APIs, webhook receivers, and microservices. Deploying Flask to Kubernetes is straightforward, but managing configuration, secrets, and rolling updates across environments benefits enormously from a GitOps approach.

Flux CD treats your Kubernetes manifests as the single source of truth. Changes to your Flask app's environment variables, resource limits, or replica count go through a Git pull request and are automatically applied by Flux. There is no manual `kubectl apply`, no configuration drift, and no undocumented changes.

This guide covers containerizing a Flask app with Gunicorn, writing production-ready Kubernetes manifests, and setting up the complete Flux pipeline.

## Prerequisites

- A Flask application (`app.py` or a package with an application factory)
- A Kubernetes cluster with Flux CD bootstrapped
- A container registry
- `kubectl` and `flux` CLIs

## Step 1: Containerize the Flask Application with Gunicorn

Never run Flask's built-in development server in production. Use Gunicorn or uWSGI as the WSGI server.

```dockerfile
# Dockerfile
FROM python:3.12-slim AS base
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1
WORKDIR /app

FROM base AS builder
RUN apt-get update && apt-get install -y --no-install-recommends gcc
COPY requirements.txt .
RUN pip install --no-cache-dir --prefix=/install -r requirements.txt

FROM base AS runner
COPY --from=builder /install /usr/local
COPY . .
# Create non-root user
RUN adduser --disabled-password --gecos '' flaskuser && chown -R flaskuser /app
USER flaskuser
EXPOSE 5000
# Start with Gunicorn: 4 sync workers, bind on all interfaces
CMD ["gunicorn", "app:create_app()", "--bind", "0.0.0.0:5000", "--workers", "4", "--timeout", "120"]
```

```bash
docker build -t ghcr.io/your-org/my-flask-app:1.0.0 .
docker push ghcr.io/your-org/my-flask-app:1.0.0
```

## Step 2: Add a Health Check Endpoint to Flask

```python
# app.py (simplified application factory)
from flask import Flask

def create_app():
    app = Flask(__name__)

    @app.route("/health")
    def health():
        return {"status": "ok"}, 200

    @app.route("/api/v1/greet")
    def greet():
        return {"message": "Hello from Flask!"}

    return app
```

## Step 3: Write Kubernetes Manifests

```yaml
# deploy/namespace.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: my-flask-app
---
# deploy/configmap.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: flask-config
  namespace: my-flask-app
data:
  FLASK_ENV: "production"
  LOG_LEVEL: "INFO"
  CORS_ORIGINS: "https://app.example.com"
---
# deploy/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-flask-app
  namespace: my-flask-app
spec:
  replicas: 2
  selector:
    matchLabels:
      app: my-flask-app
  template:
    metadata:
      labels:
        app: my-flask-app
    spec:
      containers:
        - name: my-flask-app
          image: ghcr.io/your-org/my-flask-app:1.0.0  # {"$imagepolicy": "flux-system:my-flask-app"}
          ports:
            - containerPort: 5000
          envFrom:
            # Load all keys from the ConfigMap as environment variables
            - configMapRef:
                name: flask-config
          env:
            - name: SECRET_KEY
              valueFrom:
                secretKeyRef:
                  name: flask-secrets
                  key: SECRET_KEY
          resources:
            requests:
              cpu: "100m"
              memory: "128Mi"
            limits:
              cpu: "500m"
              memory: "256Mi"
          livenessProbe:
            httpGet:
              path: /health
              port: 5000
            initialDelaySeconds: 10
            periodSeconds: 15
          readinessProbe:
            httpGet:
              path: /health
              port: 5000
            initialDelaySeconds: 5
            periodSeconds: 10
          # Graceful shutdown — give Gunicorn time to finish in-flight requests
          lifecycle:
            preStop:
              exec:
                command: ["/bin/sh", "-c", "sleep 5"]
      terminationGracePeriodSeconds: 30
---
# deploy/service.yaml
apiVersion: v1
kind: Service
metadata:
  name: my-flask-app
  namespace: my-flask-app
spec:
  selector:
    app: my-flask-app
  ports:
    - port: 80
      targetPort: 5000
---
# deploy/ingress.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: my-flask-app
  namespace: my-flask-app
spec:
  ingressClassName: nginx
  rules:
    - host: api.example.com
      http:
        paths:
          - path: /api
            pathType: Prefix
            backend:
              service:
                name: my-flask-app
                port:
                  number: 80
```

## Step 4: Configure Flux Sources and Kustomizations

```yaml
# clusters/my-cluster/apps/my-flask-app/source.yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: GitRepository
metadata:
  name: my-flask-app
  namespace: flux-system
spec:
  interval: 1m
  url: https://github.com/your-org/my-flask-app
  ref:
    branch: main
---
# clusters/my-cluster/apps/my-flask-app/kustomization.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: my-flask-app
  namespace: flux-system
spec:
  interval: 5m
  sourceRef:
    kind: GitRepository
    name: my-flask-app
  path: ./deploy
  prune: true
  healthChecks:
    - apiVersion: apps/v1
      kind: Deployment
      name: my-flask-app
      namespace: my-flask-app
```

## Step 5: Configure Image Automation

```yaml
# clusters/my-cluster/apps/my-flask-app/image-automation.yaml
apiVersion: image.toolkit.fluxcd.io/v1
kind: ImageRepository
metadata:
  name: my-flask-app
  namespace: flux-system
spec:
  image: ghcr.io/your-org/my-flask-app
  interval: 5m
  secretRef:
    name: ghcr-credentials
---
apiVersion: image.toolkit.fluxcd.io/v1
kind: ImagePolicy
metadata:
  name: my-flask-app
  namespace: flux-system
spec:
  imageRepositoryRef:
    name: my-flask-app
  policy:
    semver:
      range: ">=1.0.0"
---
apiVersion: image.toolkit.fluxcd.io/v1
kind: ImageUpdateAutomation
metadata:
  name: flux-image-updates
  namespace: flux-system
spec:
  interval: 5m
  sourceRef:
    kind: GitRepository
    name: my-flask-app
  git:
    checkout:
      ref:
        branch: main
    commit:
      author:
        email: fluxbot@your-org.com
        name: Flux Bot
      messageTemplate: "chore: update flask app to {{range .Updated.Images}}{{.}}{{end}}"
    push:
      branch: main
  update:
    path: ./deploy
    strategy: Setters
```

## Step 6: Verify and Troubleshoot

```bash
# Check all Flux objects
flux get all -n flux-system

# Tail Flask/Gunicorn logs
kubectl logs -n my-flask-app -l app=my-flask-app -f

# Test the health endpoint
kubectl port-forward -n my-flask-app svc/my-flask-app 5000:80
curl http://localhost:5000/health
```

## Best Practices

- Use Gunicorn's `--preload` flag to load the application code once and fork workers, reducing memory usage when each worker would otherwise load the code independently.
- Tune Gunicorn `--workers` to `(2 * CPU cores) + 1` as a starting point, then profile under load.
- Use `envFrom` with a ConfigMap for non-sensitive configuration and individual `secretKeyRef` for sensitive values to keep your Deployment manifest clean.
- Add the `preStop` lifecycle hook with a short sleep to ensure the load balancer has deregistered the pod before Gunicorn begins shutting down.
- Use Flask's application factory pattern (`create_app()`) to make the app easier to test and to support different configuration objects per environment.

## Conclusion

Flask's simplicity pairs well with Flux CD's declarative GitOps model. With Gunicorn handling production serving, Kubernetes managing health and scaling, and Flux ensuring the cluster always reflects your Git repository, your Flask microservice has a production-grade deployment pipeline that is easy to maintain and extend.
