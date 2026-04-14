# Validation Summary: How to Use the dapr init Command

## Status
validated

## Post Type
Tutorial / CLI Reference Guide

## Technologies Covered
- Dapr (Distributed Application Runtime)
- Dapr CLI (`dapr init` command)
- Docker (container runtime for self-hosted mode)
- Kubernetes (cluster deployment)
- Redis (state store and pub/sub)
- Zipkin (distributed tracing)

## Sources Consulted
- Dapr CLI Reference — `dapr init`: https://docs.dapr.io/reference/cli/dapr-init/
- Dapr Self-Hosted Installation Guide: https://docs.dapr.io/getting-started/install-dapr-selfhost/
- Dapr Kubernetes Deployment Guide: https://docs.dapr.io/operations/hosting/kubernetes/kubernetes-deploy/

## Issues Found

### 1. Incomplete self-hosted installation list
**What was wrong:** The list of components installed by `dapr init` in self-hosted mode omitted the placement service container (for actor support) and the scheduler service container (for job scheduling). Both are started as Docker containers by default.
**What was changed:** Added "A placement service container for actor support" and "A scheduler service container for job scheduling" to the bullet list.
**Why:** The official self-hosted installation docs confirm that `dapr init` starts four containers (Redis, Zipkin, placement, scheduler) plus the sidecar binary and default component files.

### 2. Incorrect Kubernetes pod list
**What was wrong:** The expected `kubectl get pods` output included `dapr-dashboard` which is NOT installed by default with `dapr init -k`. The dashboard requires a separate install (via `dapr dashboard -k` or the `dapr/dapr-dashboard` Helm chart). Additionally, the `dapr-scheduler-server` pod was missing from the list.
**What was changed:** Removed the `dapr-dashboard` pod entry and added `dapr-scheduler-server-0` to the expected output.
**Why:** The official Kubernetes deployment docs list five default control plane pods: dapr-operator, dapr-sidecar-injector, dapr-placement-server, dapr-sentry, and dapr-scheduler-server.

### 3. Incomplete slim mode description
**What was wrong:** The description said slim mode skips only Redis and Zipkin containers, but it also skips the placement and scheduler containers. It also failed to mention that default configuration files are not created.
**What was changed:** Updated to clarify that slim mode skips all Docker containers (Redis, Zipkin, placement, scheduler) and does not create default configuration files.
**Why:** The official docs state that slim mode installs only the CLI binaries with no containers and no default config files.

## Review Notes
- The post uses Dapr version 1.13.0 as an example. This is a valid released version but is not the latest (1.17.x as of the docs consulted). This is acceptable since it is used illustratively, but readers should be aware that newer versions are available.
- The post does not mention the `--container-runtime` flag for Podman support, which could be useful for readers who cannot use Docker. This is not an error, just a potential future enhancement.
- The `--dev` flag for Kubernetes mode (which installs Redis, Zipkin, and the dashboard for development) is not mentioned. This could be a helpful addition in a future update.
