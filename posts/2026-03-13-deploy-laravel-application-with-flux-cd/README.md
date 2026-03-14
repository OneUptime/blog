# How to Deploy a Laravel Application with Flux CD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, Kubernetes, GitOps, Laravel, PHP, FPM, NGINX, Deployments

Description: Deploy a PHP Laravel application to Kubernetes using Flux CD, with PHP-FPM and Nginx serving, database migrations, and queue workers.

---

## Introduction

Laravel is the most popular PHP framework, offering an expressive ORM (Eloquent), a queue system, scheduled tasks, and a rich ecosystem. Containerizing Laravel for Kubernetes requires pairing PHP-FPM (which processes PHP) with Nginx (which handles HTTP). This two-container pod pattern, or a single container combining both, is the standard approach.

Flux CD provides the GitOps workflow that ensures your Laravel deployment - including migrations, web pods, and queue workers - is always consistent with your Git repository. Every environment-specific configuration difference is captured as a Kustomize overlay, and Flux reconciles it automatically.

This guide covers the Laravel Dockerfile with PHP-FPM and Nginx, the Kubernetes manifest design for migrations and workers, and the complete Flux pipeline.

## Prerequisites

- A Laravel 11+ application
- PHP 8.3 with required extensions
- A Kubernetes cluster with Flux CD bootstrapped
- A container registry
- `kubectl` and `flux` CLIs installed

## Step 1: Containerize Laravel with PHP-FPM and Nginx

Use a single container that runs Nginx and PHP-FPM via supervisord, or two separate containers in a pod. The single-container approach is simpler for small teams.

```dockerfile
# Dockerfile - Laravel with PHP-FPM + Nginx + supervisord
FROM php:8.3-fpm-alpine AS base
WORKDIR /var/www/html

# Install system dependencies and PHP extensions
RUN apk add --no-cache nginx supervisor curl && \
    docker-php-ext-install pdo_mysql pdo_pgsql bcmath opcache pcntl

# Install Composer
COPY --from=composer:2.7 /usr/bin/composer /usr/bin/composer

FROM base AS builder
COPY composer.json composer.lock ./
RUN composer install --no-dev --optimize-autoloader --no-interaction
COPY . .
# Cache Laravel configuration and routes
RUN php artisan config:cache && \
    php artisan route:cache && \
    php artisan view:cache

FROM base AS runner
COPY --from=builder /var/www/html /var/www/html
COPY docker/nginx.conf /etc/nginx/nginx.conf
COPY docker/php-fpm.conf /usr/local/etc/php-fpm.d/www.conf
COPY docker/supervisord.conf /etc/supervisor/conf.d/supervisord.conf
RUN chown -R www-data:www-data /var/www/html/storage /var/www/html/bootstrap/cache
EXPOSE 80
CMD ["/usr/bin/supervisord", "-c", "/etc/supervisor/conf.d/supervisord.conf"]
```

```ini
# docker/supervisord.conf
[supervisord]
nodaemon=true
logfile=/dev/null
logfile_maxbytes=0

[program:nginx]
command=/usr/sbin/nginx -g "daemon off;"
stdout_logfile=/dev/fd/1
stdout_logfile_maxbytes=0
stderr_logfile=/dev/fd/2
stderr_logfile_maxbytes=0
autorestart=true

[program:php-fpm]
command=/usr/local/sbin/php-fpm --nodaemonize
stdout_logfile=/dev/fd/1
stdout_logfile_maxbytes=0
stderr_logfile=/dev/fd/2
stderr_logfile_maxbytes=0
autorestart=true
```

```nginx
# docker/nginx.conf (simplified)
events { worker_processes auto; }
http {
    server {
        listen 80;
        root /var/www/html/public;
        index index.php;
        location / { try_files $uri $uri/ /index.php?$query_string; }
        location ~ \.php$ {
            fastcgi_pass 127.0.0.1:9000;
            include fastcgi_params;
            fastcgi_param SCRIPT_FILENAME $realpath_root$fastcgi_script_name;
        }
    }
}
```

## Step 2: Write the Migration Job

```yaml
# deploy/migrate/migration-job.yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: laravel-migrate-v1-0-0
  namespace: my-laravel-app
spec:
  ttlSecondsAfterFinished: 300
  backoffLimit: 2
  template:
    spec:
      restartPolicy: Never
      containers:
        - name: migrate
          image: ghcr.io/your-org/my-laravel-app:1.0.0
          command: ["php", "artisan", "migrate", "--force"]
          env:
            - name: APP_ENV
              value: production
            - name: DB_CONNECTION
              value: pgsql
            - name: DATABASE_URL
              valueFrom:
                secretKeyRef:
                  name: laravel-secrets
                  key: DATABASE_URL
            - name: APP_KEY
              valueFrom:
                secretKeyRef:
                  name: laravel-secrets
                  key: APP_KEY
```

## Step 3: Write the Web Deployment and Queue Worker Manifests

```yaml
# deploy/app/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-laravel-app
  namespace: my-laravel-app
spec:
  replicas: 2
  selector:
    matchLabels:
      app: my-laravel-app
  template:
    metadata:
      labels:
        app: my-laravel-app
    spec:
      containers:
        - name: my-laravel-app
          image: ghcr.io/your-org/my-laravel-app:1.0.0  # {"$imagepolicy": "flux-system:my-laravel-app"}
          ports:
            - containerPort: 80
          envFrom:
            - secretRef:
                name: laravel-secrets
          env:
            - name: APP_ENV
              value: production
            - name: LOG_CHANNEL
              value: stderr
          resources:
            requests:
              cpu: "200m"
              memory: "256Mi"
            limits:
              cpu: "1000m"
              memory: "512Mi"
          livenessProbe:
            httpGet:
              path: /up
              port: 80
            initialDelaySeconds: 20
            periodSeconds: 20
          readinessProbe:
            httpGet:
              path: /up
              port: 80
            initialDelaySeconds: 10
            periodSeconds: 10
---
# deploy/app/queue-worker.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: laravel-queue-worker
  namespace: my-laravel-app
spec:
  replicas: 2
  selector:
    matchLabels:
      app: laravel-queue-worker
  template:
    metadata:
      labels:
        app: laravel-queue-worker
    spec:
      containers:
        - name: queue-worker
          image: ghcr.io/your-org/my-laravel-app:1.0.0  # Same image, different command
          command: ["php", "artisan", "queue:work", "--sleep=3", "--tries=3", "--max-time=3600"]
          envFrom:
            - secretRef:
                name: laravel-secrets
          env:
            - name: APP_ENV
              value: production
          resources:
            requests:
              cpu: "100m"
              memory: "128Mi"
            limits:
              cpu: "500m"
              memory: "256Mi"
---
# deploy/app/service.yaml
apiVersion: v1
kind: Service
metadata:
  name: my-laravel-app
  namespace: my-laravel-app
spec:
  selector:
    app: my-laravel-app
  ports:
    - port: 80
      targetPort: 80
```

## Step 4: Configure Flux with Ordered Kustomizations

```yaml
# clusters/my-cluster/apps/laravel/source.yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: GitRepository
metadata:
  name: my-laravel-app
  namespace: flux-system
spec:
  interval: 1m
  url: https://github.com/your-org/my-laravel-app
  ref:
    branch: main
---
# clusters/my-cluster/apps/laravel/kustomization-migrate.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: laravel-migrate
  namespace: flux-system
spec:
  interval: 5m
  sourceRef:
    kind: GitRepository
    name: my-laravel-app
  path: ./deploy/migrate
  prune: false
  healthChecks:
    - apiVersion: batch/v1
      kind: Job
      name: laravel-migrate-v1-0-0
      namespace: my-laravel-app
---
# clusters/my-cluster/apps/laravel/kustomization-app.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: laravel-app
  namespace: flux-system
spec:
  interval: 5m
  dependsOn:
    - name: laravel-migrate
  sourceRef:
    kind: GitRepository
    name: my-laravel-app
  path: ./deploy/app
  prune: true
  healthChecks:
    - apiVersion: apps/v1
      kind: Deployment
      name: my-laravel-app
      namespace: my-laravel-app
```

## Step 5: Verify the Deployment

```bash
# Monitor migration Job
kubectl logs -n my-laravel-app job/laravel-migrate-v1-0-0 -f

# Check all deployments
kubectl get deployments -n my-laravel-app

# Test web server
kubectl port-forward -n my-laravel-app svc/my-laravel-app 8080:80
curl http://localhost:8080/up
```

## Best Practices

- Use `--force` flag with `php artisan migrate` in production Job to bypass the confirmation prompt.
- Cache configuration, routes, and views during `docker build` (not at startup) to reduce cold start time.
- Set `LOG_CHANNEL=stderr` to send all Laravel logs to stdout/stderr for Kubernetes log collection.
- Use Laravel Horizon (backed by Redis) for queue management; it provides visibility into queue depth, job failures, and throughput.
- Store `APP_KEY` in a Kubernetes Secret and never rotate it without a coordinated deployment, as it is used to encrypt all application data.

## Conclusion

Laravel on Kubernetes with Flux CD provides a structured deployment pipeline for PHP applications. The supervisord-managed Nginx and PHP-FPM combination serves requests efficiently, the migration Job pattern ensures schema correctness before each release, and queue workers handle background processing - all reconciled continuously by Flux from your Git repository.
