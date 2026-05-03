# Validation Summary: How to Deploy Apache Pulsar on Rancher

## Status
validated

## Post Type
Tutorial / Deployment Guide

## Technologies Covered
- Apache Pulsar (distributed messaging/streaming platform)
- Apache BookKeeper (storage layer)
- Apache ZooKeeper (coordination)
- Rancher / Kubernetes
- Helm (chart-based deployment)
- Longhorn StorageClass
- OpenSSL (TLS certificate generation)
- kubectl

## Sources Consulted
- Apache Pulsar Helm deployment documentation: https://pulsar.apache.org/docs/3.0.x/helm-deploy/
- Apache Pulsar Helm chart repository: https://github.com/apache/pulsar-helm-chart
- Pulsar Helm chart values.yaml structure (zookeeper.volumes, bookkeeper.volumes, broker.resources, proxy.service, initialize flag)
- pulsar-admin CLI reference (tenants, namespaces, topics, brokers healthcheck)
- kubectl CLI documentation (create secret tls, create namespace, exec)
- Helm 3 CLI documentation (`helm repo add`, `helm install --timeout`)

## Issues Found
1. **Namespace ordering bug in Step 2 / Step 4** — The original post created the TLS secret with `kubectl create secret tls pulsar-tls -n messaging` in Step 2, but the `messaging` namespace was not created until Step 4 (`kubectl create namespace messaging`). Following the steps in order would fail because kubectl rejects creating resources in a non-existent namespace. **Fix:** Moved `kubectl create namespace messaging` to the start of Step 2 (before the secret is created) and removed the duplicate namespace creation from Step 4.

## Review Notes
- The Helm repository URL `https://pulsar.apache.org/charts` is correct and matches the official Apache Pulsar documentation.
- The values file structure (`zookeeper.volumes.data`, `bookkeeper.volumes.journal`, `bookkeeper.volumes.ledgers`, `broker.resources`, `proxy.service.type`, top-level `initialize`) all match the official chart's schema.
- All `pulsar-admin` subcommands shown (`tenants create`, `namespaces create`, `topics create`, `brokers healthcheck`) are valid.
- The `openssl req -x509 -newkey rsa:4096 -nodes` command syntax is valid.
- The broker resource requests (`memory: 1Gi`, `cpu: 500m`) are syntactically valid but may be undersized for production Pulsar workloads — production deployments typically need at least 2–4Gi heap plus direct memory. This is a tuning concern, not a correctness issue, and the limits (4Gi / 2 CPU) provide headroom.
- The post does not configure JWT/auth credentials. For real production deployments, the official chart recommends running the `prepare_helm_release.sh` script to generate JWT super-user credentials. Adding a note about this would improve the post but is out of scope for technical correctness.
- The pod name `pulsar-broker-0` assumes the Helm release name is `pulsar` (which matches the `helm install pulsar apache/pulsar` command shown), so the StatefulSet pod naming is correct.
