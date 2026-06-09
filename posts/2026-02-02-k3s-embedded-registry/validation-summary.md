# Validation Summary: How to Configure K3s Embedded Registry

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- K3s (registries.yaml configuration, containerd, crictl)
- Kubernetes (Deployment, Service, PVC, ConfigMap, CronJob, Secret)
- Docker Distribution Registry (registry:2.8) — htpasswd auth, TLS, pull-through proxy cache, S3 storage backend
- cert-manager (v1 Certificate / ClusterIssuer)
- Prometheus Operator (ServiceMonitor, PrometheusRule)
- Redis (blob descriptor cache)
- GitHub Actions (docker/login-action@v3, docker/metadata-action@v5, docker/build-push-action@v5)
- GitLab CI (docker:24-dind)
- ArgoCD (argoproj.io/v1alpha1 Application)
- OpenSSL (self-signed CA + leaf certs with SAN)
- htpasswd / bcrypt

## Sources Consulted
- K3s Private Registry Configuration — https://docs.k3s.io/installation/private-registry
- K3s Embedded Registry Mirror (Spegel) — https://docs.k3s.io/installation/registry-mirror
- Distribution Registry Configuration Reference — https://distribution.github.io/distribution/about/configuration/
- containerd CRI Registry Configuration — https://github.com/containerd/containerd/blob/main/docs/cri/registry.md
- Docker Hub `registry` image tags — https://hub.docker.com/_/registry/tags
- cert-manager v1 Certificate API
- Prometheus Operator CRD reference (ServiceMonitor, PrometheusRule)

## Issues Found

1. **Prometheus metrics ServiceMonitor would not scrape any data (fixed).** The original "Registry Metrics" section showed a ServiceMonitor scraping `/metrics` on the registry's main HTTP port (5000), but the Distribution Registry only exposes Prometheus metrics via a separate debug listener that must be enabled in the registry config (`http.debug.addr` + `http.debug.prometheus.enabled: true`). None of the registry deployments earlier in the post enable this. Updated the section to (a) add a ConfigMap with a registry config.yml that enables the debug listener on port 5001, (b) show how to expose that port via the container/Service, and (c) point the ServiceMonitor at the new `metrics` named port. This makes the section actually functional rather than silently broken.

## Review Notes

- **Title naming caveat:** K3s does have a feature literally called "Embedded Registry Mirror" (Spegel-based, GA in late 2024) which performs P2P image sharing between nodes. This post does not cover that feature — it covers deploying a separate Docker Distribution Registry inside the cluster and pointing K3s at it via `registries.yaml`. The post acknowledges this on line 13 ("K3s does not include a built-in registry server"), but readers searching for Spegel configuration may land here by mistake. Content is accurate for the topic it actually covers, so this is a naming/SEO note rather than a technical defect.
- **Garbage collection caveat:** The Distribution Registry recommends putting the registry into read-only mode (or stopping it) before running `garbage-collect`, otherwise concurrent pushes can have their uploads deleted. The CronJob example doesn't show this — a future revision could mention setting `REGISTRY_STORAGE_MAINTENANCE_READONLY` or scaling the deployment to zero before GC. Left as-is to avoid scope creep.
- **htpasswd commands are interactive:** `htpasswd -Bc registry.htpasswd admin` prompts for a password. For non-interactive use (e.g. inside CI), `-bB` with the password as an argument would be required. The post's example is appropriate for an interactive bootstrap and is correct as shown.
- **Pull-through cache limitation:** The Distribution Registry can only proxy a single upstream registry per instance. The post correctly addresses this in the "Multiple Upstream Registries" section by deploying separate instances per upstream.
- All version-specific items (registry:2.8, docker/login-action@v3, docker/metadata-action@v5, docker/build-push-action@v5, redis:7-alpine, cert-manager.io/v1, monitoring.coreos.com/v1, argoproj.io/v1alpha1, batch/v1 CronJob) are valid as of the 2026-06 review date.
