# How to Deploy a Django Application with Flux CD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, Kubernetes, GitOps, Django, Python, PostgreSQL, Migration

Description: Deploy a Django application with PostgreSQL to Kubernetes using Flux CD, including database migrations via Kubernetes Jobs and secret management.

---

## Introduction

Django is a batteries-included Python web framework that powers everything from content platforms to APIs. Deploying Django to Kubernetes involves a few more moving parts than a stateless Node.js service: you need a database, you need to run `manage.py migrate` before or during deployments, and you need to serve static files separately from the Django process. Getting these pieces right in a GitOps workflow requires some deliberate design.

Flux CD handles the orchestration by letting you declare the entire deployment - Django web server, Celery workers, migration Jobs, and ConfigMaps - as manifests in Git. Flux's `dependsOn` feature ensures migration Jobs complete before traffic is shifted to new application pods, preventing requests from hitting an incompatible schema.

This guide covers the Django Dockerfile, the migration Job pattern, PostgreSQL connection management via Secrets, and the full Flux pipeline.

## Prerequisites

- A Django application with a `requirements.txt` or `pyproject.toml`
- A running PostgreSQL database (or Cloud SQL, RDS) accessible from the cluster
- A Kubernetes cluster with Flux CD bootstrapped
- A container registry for images
- `kubectl` and `flux` CLIs installed

## Step 1: Containerize the Django Application

```dockerfile
# Dockerfile
FROM python:3.12-slim AS base
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1
WORKDIR /app

FROM base AS builder
RUN apt-get update && apt-get install -y --no-install-recommends gcc libpq-dev
COPY requirements.txt .
RUN pip install --no-cache-dir --prefix=/install -r requirements.txt

FROM base AS runner
RUN apt-get update && apt-get install -y --no-install-recommends libpq5 && \
    rm -rf /var/lib/apt/lists/*
COPY --from=builder /install /usr/local
COPY . .
# Collect static files during build
RUN python manage.py collectstatic --noinput
RUN adduser --disabled-password --gecos '' appuser && chown -R appuser /app
USER appuser
EXPOSE 8000
# Use gunicorn for production
CMD ["gunicorn", "myproject.wsgi:application", "--bind", "0.0.0.0:8000", "--workers", "4"]
```

## Step 2: Write Kubernetes Secrets for Database Credentials

```bash
# Create the secret imperatively (or use External Secrets Operator)
kubectl create secret generic django-db-secret \
  --namespace my-django-app \
  --from-literal=DATABASE_URL="postgresql://django:password@postgres-host:5432/django_db" \
  --from-literal=SECRET_KEY="your-django-secret-key-here"
```

## Step 3: Write the Migration Job Manifest

```yaml
# deploy/migration-job.yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: django-migrate-v1-0-0    # Version-stamp the Job name for each release
  namespace: my-django-app
spec:
  ttlSecondsAfterFinished: 300   # Clean up the Job pod 5 minutes after completion
  backoffLimit: 3                # Retry up to 3 times on failure
  template:
    spec:
      restartPolicy: Never
      containers:
        - name: migrate
          image: ghcr.io/your-org/my-django-app:1.0.0
          command: ["python", "manage.py", "migrate", "--noinput"]
          env:
            - name: DATABASE_URL
              valueFrom:
                secretKeyRef:
                  name: django-db-secret
                  key: DATABASE_URL
            - name: DJANGO_SETTINGS_MODULE
              value: myproject.settings.production
```

## Step 4: Write the Deployment and Service Manifests

```yaml
# deploy/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-django-app
  namespace: my-django-app
spec:
  replicas: 2
  selector:
    matchLabels:
      app: my-django-app
  template:
    metadata:
      labels:
        app: my-django-app
    spec:
      containers:
        - name: my-django-app
          image: ghcr.io/your-org/my-django-app:1.0.0  # {"$imagepolicy": "flux-system:my-django-app"}
          ports:
            - containerPort: 8000
          env:
            - name: DATABASE_URL
              valueFrom:
                secretKeyRef:
                  name: django-db-secret
                  key: DATABASE_URL
            - name: SECRET_KEY
              valueFrom:
                secretKeyRef:
                  name: django-db-secret
                  key: SECRET_KEY
            - name: DJANGO_SETTINGS_MODULE
              value: myproject.settings.production
            - name: ALLOWED_HOSTS
              value: "app.example.com"
          resources:
            requests:
              cpu: "200m"
              memory: "256Mi"
            limits:
              cpu: "1000m"
              memory: "512Mi"
          livenessProbe:
            httpGet:
              path: /health/
              port: 8000
            initialDelaySeconds: 20
            periodSeconds: 20
          readinessProbe:
            httpGet:
              path: /health/
              port: 8000
            initialDelaySeconds: 10
            periodSeconds: 10
---
# deploy/service.yaml
apiVersion: v1
kind: Service
metadata:
  name: my-django-app
  namespace: my-django-app
spec:
  selector:
    app: my-django-app
  ports:
    - port: 80
      targetPort: 8000
```

## Step 5: Configure Flux with Ordered Reconciliation

Use two separate Flux Kustomizations: one for the migration Job, and one for the application Deployment that depends on it.

```yaml
# clusters/my-cluster/apps/django/source.yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: GitRepository
metadata:
  name: my-django-app
  namespace: flux-system
spec:
  interval: 1m
  url: https://github.com/your-org/my-django-app
  ref:
    branch: main
---
# clusters/my-cluster/apps/django/kustomization-migrate.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: django-migrate
  namespace: flux-system
spec:
  interval: 5m
  sourceRef:
    kind: GitRepository
    name: my-django-app
  path: ./deploy/migrate
  prune: false   # Never delete completed migration Jobs
  healthChecks:
    - apiVersion: batch/v1
      kind: Job
      name: django-migrate-v1-0-0
      namespace: my-django-app
---
# clusters/my-cluster/apps/django/kustomization-app.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: django-app
  namespace: flux-system
spec:
  interval: 5m
  dependsOn:
    - name: django-migrate    # Only deploy the app after migrations succeed
  sourceRef:
    kind: GitRepository
    name: my-django-app
  path: ./deploy/app
  prune: true
  healthChecks:
    - apiVersion: apps/v1
      kind: Deployment
      name: my-django-app
      namespace: my-django-app
```

## Step 6: Verify the Deployment

```bash
# Watch migrations run
kubectl logs -n my-django-app job/django-migrate-v1-0-0 -f

# Check Flux Kustomizations
flux get kustomizations

# Verify the web pods are healthy
kubectl get pods -n my-django-app
kubectl logs -n my-django-app -l app=my-django-app
```

## Best Practices

- Version-stamp migration Job names (e.g., `django-migrate-v1-0-0`) so Flux creates a new Job for each release rather than trying to update an immutable resource.
- Use the External Secrets Operator to sync `DATABASE_URL` and `SECRET_KEY` from a secrets manager (GCP Secret Manager, AWS Secrets Manager) rather than creating Kubernetes secrets manually.
- Serve static files (`STATIC_ROOT`) from a separate Nginx sidecar or a CDN - do not serve them through gunicorn.
- Set `DEBUG=False` and `ALLOWED_HOSTS` explicitly in production settings and inject them via ConfigMap.
- Use `WaitForJobCompletion` style health checks in Flux to block the application Kustomization until migrations finish.

## Conclusion

Deploying Django with Flux CD provides a robust, ordered deployment pipeline where database migrations always run before the new application code is served. The GitOps model gives you full auditability over both schema changes and application changes, and Flux's dependency management ensures correctness across the entire rollout.
