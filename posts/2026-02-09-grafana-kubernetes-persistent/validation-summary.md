# Validation Summary: How to Deploy Grafana on Kubernetes with Persistent Storage

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes Deployments, StatefulSets, Services, Ingress, PersistentVolumeClaims, CronJobs, RBAC, ConfigMaps, and Secrets
- Grafana Docker deployment and configuration
- Grafana SQLite and PostgreSQL database configuration
- Grafana plugin installation
- kubectl commands
- Prometheus Operator alerting rules

## Sources Consulted
- Grafana Docker installation documentation: https://grafana.com/docs/grafana/latest/setup-grafana/installation/docker/
- Grafana Docker configuration documentation: https://grafana.com/docs/grafana/latest/setup-grafana/configure-docker/
- Grafana configuration documentation: https://grafana.com/docs/grafana/latest/setup-grafana/configure-grafana/
- Grafana high availability documentation: https://grafana.com/docs/grafana/latest/setup-grafana/set-up-for-high-availability/
- Grafana plugin installation documentation: https://grafana.com/docs/grafana/latest/administration/plugin-management/plugin-install/
- Grafana service account token documentation: https://grafana.com/docs/grafana/latest/administration/service-accounts/
- Grafana dashboard HTTP API documentation: https://grafana.com/docs/grafana/latest/http_api/dashboard/
- Kubernetes PersistentVolume and PersistentVolumeClaim documentation: https://kubernetes.io/docs/concepts/storage/persistent-volumes/
- Kubernetes StatefulSet documentation: https://kubernetes.io/docs/concepts/workloads/controllers/statefulset/
- Kubernetes Ingress API documentation: https://kubernetes.io/docs/reference/kubernetes-api/networking/ingress-v1/
- Kubernetes CronJob API documentation: https://kubernetes.io/docs/reference/kubernetes-api/batch/cron-job-v1/
- kubectl exec reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_exec/
- Prometheus Operator API reference: https://prometheus-operator.dev/docs/api-reference/api/

## Issues Found
- The introduction said persistent volumes store Grafana configuration files, but the deployment stores Grafana data on a PVC and configuration in ConfigMaps and Secrets. Updated the explanation to match the manifests.
- The examples used `grafana/grafana:10.2.0`, which is outdated for a 2026 tutorial. Updated the image tag to `grafana/grafana:13.0.1`.
- The Deployment used `GF_INSTALL_PLUGINS` and installed deprecated Grafana pie chart and worldmap plugins. Updated the example to use `GF_PLUGINS_PREINSTALL` with `grafana-clock-panel`.
- The high availability example mounted a single undeclared `grafana-plugins` PVC across two replicas, which would not work reliably with `ReadWriteOnce` storage and was missing the PVC definition. Removed the shared plugins PVC from the HA snippet and added guidance to preinstall plugins consistently across replicas.
- The backup CronJob used `bitnami/kubectl:latest` while running `sqlite3` and `aws`, tools that are not provided by a kubectl-only image. Changed the image reference to a custom image name and stated the required tools explicitly.
- The migration commands used deprecated Grafana API key terminology. Updated them to use service account tokens.
- One migration command selected a pod without the `monitoring` namespace. Added `-n monitoring`.
- The rollout restart command used an older resource/name style. Updated it to `deployment/grafana`.
- The storage alert example used a ConfigMap containing Prometheus rules, which is not automatically consumed as an alerting rule. Updated it to a `PrometheusRule` resource and clarified that it applies when using Prometheus Operator.

## Review Notes
- `kubectl` is not installed in the local environment, so command syntax was checked against official references and YAML snippets were parsed locally with PyYAML rather than applied to a cluster.
- The backup example still requires the reader to build or provide the referenced custom image and configure AWS credentials for the CronJob.
