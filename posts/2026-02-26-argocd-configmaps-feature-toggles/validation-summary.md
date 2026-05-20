# Validation Summary: How to Manage ConfigMaps for Feature Toggles with ArgoCD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Argo CD
- Argo CD ApplicationSet
- Kubernetes ConfigMaps
- Kubernetes Deployments
- Kustomize
- Helm
- GitHub Actions
- Python
- Git

## Sources Consulted
- Kubernetes ConfigMaps documentation: https://kubernetes.io/docs/concepts/configuration/configmap/
- Kubernetes task guide for configuring Pods with ConfigMaps: https://kubernetes.io/docs/tasks/configure-pod-container/configure-pod-configmap/
- Kubernetes Deployments documentation: https://kubernetes.io/docs/concepts/workloads/controllers/deployment/
- Argo CD automated sync policy documentation: https://argo-cd.readthedocs.io/en/stable/user-guide/auto_sync/
- Argo CD ApplicationSet specification reference: https://argo-cd.readthedocs.io/en/stable/operator-manual/applicationset/applicationset-specification/
- Argo CD sync phases and hooks documentation: https://argo-cd.readthedocs.io/en/latest/user-guide/sync-waves/
- Helm chart development tips for rolling deployments with checksum annotations: https://helm.sh/docs/howto/charts_tips_and_tricks/
- GitHub Actions workflow syntax documentation: https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax

## Issues Found
- The Deployment examples used `apiVersion: apps/v1` but omitted `spec.selector` and matching pod template labels. Kubernetes Deployment manifests require the selector to match the pod template labels, so I added `spec.selector.matchLabels` and matching `template.metadata.labels`.
- The ConfigMap volume update explanation said updates occur with a delay of up to a minute. Kubernetes documents the delay as kubelet sync period plus cache propagation delay, so I changed the wording to describe eventual updates without promising a one-minute upper bound.
- The Python example was labeled as file watching but did not actually watch or reload the file. I replaced it with a small reload-on-change implementation based on file modification time and removed unused imports.
- The PreSync validation Job would have validated the already-applied ConfigMap in the cluster, not the new ConfigMap manifest Argo CD was about to apply. I replaced it with a GitHub Actions CI validation workflow that parses ConfigMap YAML from Git and validates the embedded `toggles.json` before Argo CD syncs it.

## Review Notes
- ConfigMap volume updates do not work for `subPath` mounts; the post's examples mount the ConfigMap as a directory, so they are not affected.
- The checksum annotation approach is correct for Helm-rendered ConfigMaps, but it only changes when Helm renders the Deployment template with a changed checksum.
