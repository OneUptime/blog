# Validation Summary: How to Create ConfigMaps via Form in Portainer - A Practical Guide

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer
- Kubernetes
- ConfigMaps
- `kubectl`
- `jq`
- Kubernetes Deployment manifests

## Sources Consulted
- Portainer Documentation: Add a ConfigMap — https://docs.portainer.io/user/kubernetes/configurations/add
- Portainer Documentation: ConfigMaps & Secrets — https://docs.portainer.io/sts/user/kubernetes/configurations
- Portainer Documentation: Release Notes — https://docs.portainer.io/sts/release-notes
- Kubernetes Documentation: ConfigMaps — https://kubernetes.io/docs/concepts/configuration/configmap/
- Kubernetes Documentation: Configure a Pod to Use a ConfigMap — https://kubernetes.io/docs/tasks/configure-pod-container/configure-pod-configmap/
- Kubernetes Documentation: Deployments — https://kubernetes.io/docs/concepts/workloads/controllers/deployment/
- Kubernetes Documentation: `kubectl rollout restart` — https://kubernetes.io/docs/reference/kubectl/generated/kubectl_rollout/kubectl_rollout_restart/
- Kubernetes Documentation: `kubectl rollout status` — https://kubernetes.io/docs/reference/kubectl/generated/kubectl_rollout/kubectl_rollout_status/

## Issues Found
- The Portainer navigation described a namespace dropdown and `+ Add ConfigMap`, but the current Portainer documentation shows `ConfigMaps & Secrets` -> `ConfigMaps` -> `Add with form`, with the namespace selected in the form. I updated Steps 1 and 2 to match the current documented workflow.
- The multi-line ConfigMap example used pseudo-form text in a code block labeled as `nginx`, which was not valid nginx syntax and did not match Portainer's documented advanced YAML mode. I replaced those examples with valid YAML block-scalar examples.
- The Deployment example omitted required `apps/v1` Deployment fields: `.spec.selector` and matching pod template labels. I added `selector.matchLabels` and `template.metadata.labels` so the manifest is valid.
- The ConfigMap update note was incomplete. I clarified that ConfigMaps consumed through `env` or `envFrom` do not update automatically in running pods, while mounted ConfigMaps update eventually except when mounted with `subPath`.
- The `jq` command for finding pods that use the ConfigMap only covered `envFrom` and direct `configMap` volumes. I expanded it to also detect `configMapKeyRef`, `initContainers`, and projected volumes so the command better matches its description.
- The delete instructions referred to a delete icon, while current Portainer documentation documents selecting the ConfigMap and using `Remove`. I updated that wording.

## Review Notes
- Portainer UI wording can vary slightly by release. As of April 24, 2026, the official docs use `Add with form`, `Advanced mode`, and `Remove`.
- `kubectl` was not installed in this workspace, so CLI verification was done against the official Kubernetes generated command reference rather than local `--help` output.
- The post remains technically relevant and salvageable after these corrections.
