# Validation Summary: How to Deploy a Laravel Application with Flux CD

## Status
validated

## Post Type
Tutorial / deployment guide

## Technologies Covered
- Laravel 11+
- PHP 8.3 and PHP-FPM
- Nginx
- Docker / container images
- Kubernetes Deployments, Services, Jobs, probes, and Secrets
- Flux CD GitRepository and Kustomization resources
- GitOps deployment workflows

## Sources Consulted
- Laravel 11 deployment documentation: https://laravel.com/docs/11.x/deployment
- Laravel 11 queue worker documentation: https://laravel.com/docs/11.x/queues
- Laravel 11 routing and health route documentation: https://laravel.com/docs/11.x/routing
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux Kustomize API reference v1: https://fluxcd.io/flux/components/kustomize/api/v1/
- Flux GitRepository documentation: https://fluxcd.io/flux/components/source/gitrepositories/
- Kubernetes Job documentation: https://kubernetes.io/docs/concepts/workloads/controllers/job/
- Kubernetes TTL-after-finished Job documentation: https://kubernetes.io/docs/concepts/workloads/controllers/ttlafterfinished/
- Nginx core module documentation: https://nginx.org/en/docs/ngx_core_module.html
- Docker official PHP image repository / helper scripts: https://github.com/docker-library/php

## Issues Found
- The Dockerfile installed `pdo_pgsql` without PostgreSQL development headers. A local check against `php:8.3-fpm-alpine` failed with `Cannot find libpq-fe.h`, so `postgresql-dev` was added to the `apk add` line.
- The Nginx sample placed `worker_processes auto;` inside the `events` block. Nginx documents `worker_processes` as a main-context directive, and a local `nginx -t` check failed with the original placement. The directive was moved to the main context and `worker_connections` was placed inside `events`.
- The Dockerfile ran `php artisan config:cache` during image build while the Kubernetes manifests inject runtime secrets and environment variables. Laravel documents that cached configuration is generated during deployment and that `.env` is not loaded after caching, so the Dockerfile now caches only routes and views at build time. The best-practices note now says to run `config:cache` only after production environment variables are available.
- The migration Job used `ttlSecondsAfterFinished: 300` while Flux continuously reconciles the same Job manifest. Kubernetes deletes finished Jobs after the TTL expires, which would allow Flux to recreate and rerun the migration Job on later reconciliations. The TTL field was removed so the completed, versioned migration Job remains available for Flux health checking until a new migration Job name is introduced for a new release.

## Review Notes
- The Flux `GitRepository`, `Kustomization`, `dependsOn`, `healthChecks`, and `prune` fields match the current Flux v1 API documentation.
- The Laravel `/up` health endpoint, `migrate --force`, and `queue:work --sleep=3 --tries=3 --max-time=3600` examples align with Laravel 11 documentation.
- The post does not define the required Namespace, Secret, Ingress, ImageRepository, ImagePolicy, or ImageUpdateAutomation resources. That is acceptable for a focused deployment guide, but a future expansion could include them for a fully copy-pasteable production setup.
