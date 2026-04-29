# Validation Summary: How to Migrate Portainer from Docker to Kubernetes

## Status
validated

## Post Type
Tutorial / Migration Guide

## Technologies Covered
- Portainer (CE and BE)
- Docker
- Kubernetes
- Helm 3
- kubectl
- PersistentVolumeClaim (PVC)
- Ingress / cert-manager / nginx ingress controller

## Sources Consulted
- Portainer Helm chart repository: https://github.com/portainer/k8s
- Portainer Helm chart values reference (chart v239.1.0)
- Portainer documentation: https://docs.portainer.io
- Helm repo index at https://portainer.github.io/k8s/
- Kubernetes documentation for `kubectl wait`, `kubectl cp`, `kubectl exec`, PVC `accessModes`, `storageClassName`
- Docker CLI reference for `docker run -v`, `docker stop`, `docker rm`, `docker volume rm`

## Issues Found

1. **Misleading Step 2 heading** — The original heading was "Step 2: Create a ConfigMap with the Backup", but the step actually creates a Namespace and a PersistentVolumeClaim. No ConfigMap is involved (and ConfigMaps would be unsuitable since they have a 1 MiB size limit). Updated the heading to "Step 2: Create a PVC for the Backup" so it accurately describes the contents.

2. **Incorrect pod naming convention in Step 6** — The original commands referenced `pod/portainer-0`, which is the naming convention for a StatefulSet. The official Portainer Helm chart (`portainer/portainer`) deploys a **Deployment** (`kind: Deployment`, `strategy: Recreate`), not a StatefulSet. Pod names from a Deployment follow the pattern `portainer-<replicaset-hash>-<random>`, so `portainer-0` would not exist. Replaced the references with `deployment portainer` and `deployment/portainer` so the verification commands actually work.

## Review Notes

- The Helm repo URL `https://portainer.github.io/k8s/` and chart name `portainer/portainer` are correct.
- The Helm values used (`service.type`, `persistence.existingClaim`, `tls.force`, `ingress.enabled`, `ingress.ingressClassName`, `ingress.hosts`, `ingress.tls`, `ingress.annotations`) all exist in the official chart.
- The container mount path `/data` matches both the Docker image and the Helm chart's PVC mount, so taring `/data` from the Docker volume and extracting it into the PVC at `/data` is a valid migration approach.
- The claim that Portainer CE is single-instance and BE supports HA is accurate; the chart's default `replicaCount: 1` and `strategy: Recreate` reinforce this.
- The "Resource Requirements" section is missing the `##` markdown heading prefix; this is a stylistic/formatting issue, not a technical error, so it was left untouched per the review scope.
- The post does not address potential Portainer version mismatches between the source (Docker) and target (Kubernetes) installations. Migrating data from a much newer Portainer version into an older one can fail; readers may want to align versions before migrating in production.
