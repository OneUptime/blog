# Validation Summary: How to Attach ConfigMaps to Applications in Portainer - A Practical Guide

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer
- Kubernetes
- ConfigMap
- `kubectl`
- YAML manifests

## Sources Consulted
- Portainer Docs: Add a ConfigMap - https://docs.portainer.io/user/kubernetes/configurations/add
- Portainer Docs: Add a new application using a form - https://docs.portainer.io/sts/user/kubernetes/applications/add
- Kubernetes Docs: ConfigMaps - https://kubernetes.io/docs/concepts/configuration/configmap/
- Kubernetes Docs: Configure a Pod to Use a ConfigMap - https://kubernetes.io/docs/tasks/configure-pod-container/configure-pod-configmap/
- Kubernetes Docs: Volumes - https://kubernetes.io/docs/concepts/storage/volumes/
- Kubernetes Docs: `kubectl exec` - https://kubernetes.io/docs/reference/kubectl/generated/kubectl_exec/
- Kubernetes Docs: `kubectl rollout restart` - https://kubernetes.io/docs/reference/kubectl/generated/kubectl_rollout/kubectl_rollout_restart/

## Issues Found
- The Portainer navigation and button labels in Step 1 were outdated. I changed `ConfigMaps` / `+ Add ConfigMap` to the current `ConfigMaps & Secrets` flow with the `ConfigMaps` tab and `Add with form`.
- The Portainer application workflow in Steps 2 and 3 was inaccurate. I changed it to use the application's `ConfigMaps` section, where Portainer exposes all keys as environment variables by default and uses `Override` to switch individual keys to filesystem mounts.
- The YAML example for mounting a single file had an incorrect `subPath`. I changed `subPath: app-settings.json` to `subPath: settings.json` because `subPath` must match the path inside the mounted volume, and the `items.path` was `settings.json`.
- The verification commands used `kubectl exec -it` for non-interactive checks. I removed `-it` because these examples are not interactive and do not require a TTY.
- The update behavior note was too broad. I corrected it to reflect that mounted ConfigMaps update eventually based on kubelet sync and cache behavior, environment-variable consumers need a pod restart, and `subPath` mounts do not receive live ConfigMap updates.
- The restart example was normalized to `kubectl rollout restart deployment/myapp -n production` to match the official `kubectl` reference style.

## Review Notes
- Mounting a ConfigMap over an existing directory hides files already present in that directory inside the container image. The post's examples are still valid, but this is a useful operational caveat for future revisions.
- Portainer UI labels can differ slightly across older releases; the corrected steps align with current Portainer documentation.
