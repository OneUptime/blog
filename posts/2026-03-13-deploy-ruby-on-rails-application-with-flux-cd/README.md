# How to Deploy a Ruby on Rails Application with Flux CD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, Kubernetes, GitOps, Ruby on Rails, Ruby, PostgreSQL, Migrations

Description: Deploy a Ruby on Rails application with database migrations to Kubernetes using Flux CD, handling asset precompilation and the migration Job pattern.

---

## Introduction

Ruby on Rails is a full-stack web framework known for its convention-over-configuration philosophy and developer productivity. Deploying Rails to Kubernetes involves several steps beyond a simple stateless API: asset precompilation, database migrations, and a production WSGI server like Puma. Getting these right in a GitOps workflow requires deliberate ordering and configuration.

Flux CD's dependency management is a natural fit for the Rails deployment lifecycle. You can declare a migration Job, a Kustomization for the Rails web server, and a Kustomization for background Sidekiq workers, with explicit `dependsOn` relationships that ensure migrations run first, then the web server, then the workers.

This guide covers the Rails multi-stage Dockerfile with asset precompilation, the migration Job pattern, and the full Flux pipeline.

## Prerequisites

- A Rails 7+ application using PostgreSQL
- Puma as the application server (Rails default)
- A Kubernetes cluster with Flux CD bootstrapped
- A container registry
- `kubectl` and `flux` CLIs installed

## Step 1: Containerize the Rails Application

```dockerfile
# Dockerfile
FROM ruby:3.3-slim AS base
ENV RAILS_ENV=production \
    BUNDLE_WITHOUT=development:test \
    BUNDLE_DEPLOYMENT=1 \
    RAILS_SERVE_STATIC_FILES=true
WORKDIR /rails

FROM base AS builder
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential git libpq-dev nodejs npm
# Install Yarn for JavaScript asset bundling (optional if using importmaps)
RUN npm install -g yarn
COPY Gemfile Gemfile.lock ./
RUN bundle install
COPY . .
# Precompile assets at build time — SECRET_KEY_BASE is a placeholder
RUN SECRET_KEY_BASE_DUMMY=1 rails assets:precompile

FROM base AS runner
RUN apt-get update && apt-get install -y --no-install-recommends libpq5 && \
    rm -rf /var/lib/apt/lists/*
COPY --from=builder /usr/local/bundle /usr/local/bundle
COPY --from=builder /rails /rails
RUN useradd --no-create-home rails && chown -R rails /rails
USER rails
EXPOSE 3000
CMD ["bundle", "exec", "puma", "-C", "config/puma.rb"]
```

```ruby
# config/puma.rb — production Puma config
workers ENV.fetch("WEB_CONCURRENCY", 2).to_i
threads_count = ENV.fetch("RAILS_MAX_THREADS", 5).to_i
threads threads_count, threads_count
bind "tcp://0.0.0.0:#{ENV.fetch("PORT", 3000)}"
environment ENV.fetch("RAILS_ENV", "production")
# Preload the app for Copy-on-Write benefits with multiple workers
preload_app!
```

```bash
docker build -t ghcr.io/your-org/my-rails-app:1.0.0 .
docker push ghcr.io/your-org/my-rails-app:1.0.0
```

## Step 2: Write the Migration Job

```yaml
# deploy/migrate/migration-job.yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: rails-migrate-v1-0-0     # Version-stamp for each release
  namespace: my-rails-app
spec:
  ttlSecondsAfterFinished: 300
  backoffLimit: 2
  template:
    spec:
      restartPolicy: Never
      containers:
        - name: migrate
          image: ghcr.io/your-org/my-rails-app:1.0.0
          command: ["bundle", "exec", "rails", "db:migrate"]
          env:
            - name: RAILS_ENV
              value: production
            - name: DATABASE_URL
              valueFrom:
                secretKeyRef:
                  name: rails-secrets
                  key: DATABASE_URL
            - name: SECRET_KEY_BASE
              valueFrom:
                secretKeyRef:
                  name: rails-secrets
                  key: SECRET_KEY_BASE
```

## Step 3: Write the Web Deployment Manifests

```yaml
# deploy/app/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-rails-app
  namespace: my-rails-app
spec:
  replicas: 2
  selector:
    matchLabels:
      app: my-rails-app
  template:
    metadata:
      labels:
        app: my-rails-app
    spec:
      containers:
        - name: my-rails-app
          image: ghcr.io/your-org/my-rails-app:1.0.0  # {"$imagepolicy": "flux-system:my-rails-app"}
          ports:
            - containerPort: 3000
          env:
            - name: RAILS_ENV
              value: production
            - name: RAILS_LOG_TO_STDOUT
              value: "1"
            - name: WEB_CONCURRENCY
              value: "2"
            - name: RAILS_MAX_THREADS
              value: "5"
            - name: DATABASE_URL
              valueFrom:
                secretKeyRef:
                  name: rails-secrets
                  key: DATABASE_URL
            - name: SECRET_KEY_BASE
              valueFrom:
                secretKeyRef:
                  name: rails-secrets
                  key: SECRET_KEY_BASE
            - name: REDIS_URL
              valueFrom:
                secretKeyRef:
                  name: rails-secrets
                  key: REDIS_URL
          resources:
            requests:
              cpu: "200m"
              memory: "512Mi"   # Rails/Puma can be memory-intensive
            limits:
              cpu: "1000m"
              memory: "1Gi"
          livenessProbe:
            httpGet:
              path: /up          # Rails 7.1+ default health controller
              port: 3000
            initialDelaySeconds: 30
            periodSeconds: 20
          readinessProbe:
            httpGet:
              path: /up
              port: 3000
            initialDelaySeconds: 15
            periodSeconds: 10
---
# deploy/app/service.yaml
apiVersion: v1
kind: Service
metadata:
  name: my-rails-app
  namespace: my-rails-app
spec:
  selector:
    app: my-rails-app
  ports:
    - port: 80
      targetPort: 3000
```

## Step 4: Configure Flux with Ordered Kustomizations

```yaml
# clusters/my-cluster/apps/rails/source.yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: GitRepository
metadata:
  name: my-rails-app
  namespace: flux-system
spec:
  interval: 1m
  url: https://github.com/your-org/my-rails-app
  ref:
    branch: main
---
# clusters/my-cluster/apps/rails/kustomization-migrate.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: rails-migrate
  namespace: flux-system
spec:
  interval: 5m
  sourceRef:
    kind: GitRepository
    name: my-rails-app
  path: ./deploy/migrate
  prune: false    # Never delete completed migration Jobs
  healthChecks:
    - apiVersion: batch/v1
      kind: Job
      name: rails-migrate-v1-0-0
      namespace: my-rails-app
---
# clusters/my-cluster/apps/rails/kustomization-app.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: rails-app
  namespace: flux-system
spec:
  interval: 5m
  dependsOn:
    - name: rails-migrate   # Web deployment waits for migrations
  sourceRef:
    kind: GitRepository
    name: my-rails-app
  path: ./deploy/app
  prune: true
  healthChecks:
    - apiVersion: apps/v1
      kind: Deployment
      name: my-rails-app
      namespace: my-rails-app
```

## Step 5: Verify the Deployment

```bash
# Watch migration Job
kubectl logs -n my-rails-app job/rails-migrate-v1-0-0 -f

# Check web deployment
flux get kustomizations
kubectl get pods -n my-rails-app

# Test the /up health endpoint
kubectl port-forward -n my-rails-app svc/my-rails-app 3000:80
curl http://localhost:3000/up
```

## Best Practices

- Set `RAILS_LOG_TO_STDOUT=1` so Puma and Rails write logs to stdout, where Kubernetes can capture them with `kubectl logs`.
- Use Rails credentials or a secrets manager for `SECRET_KEY_BASE` and database passwords rather than storing them in plaintext ConfigMaps.
- Precompile assets during `docker build` (as shown), not at container startup — startup precompilation blocks the readiness probe and slows deployments.
- Use `db:migrate` (not `db:reset` or `db:schema:load`) in the migration Job to safely apply incremental schema changes.
- Version-stamp migration Job names so Flux creates a new Job for each release, allowing health checks to verify the correct migration Job completed.

## Conclusion

Ruby on Rails on Kubernetes with Flux CD requires careful orchestration of migrations, asset serving, and application deployment. Flux's `dependsOn` feature ensures correctness, and the GitOps model provides full auditability over schema changes, configuration updates, and application deployments. The result is a reliable, repeatable Rails deployment pipeline.
