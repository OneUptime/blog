# Validation Summary: How to Attach ConfigMaps to Applications in Portainer

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Portainer
- Kubernetes
- ConfigMaps
- `kubectl`
- YAML manifests

## Sources Consulted
- Portainer ConfigMaps & Secrets documentation: https://docs.portainer.io/user/kubernetes/configurations
- Portainer Add a ConfigMap documentation: https://docs.portainer.io/user/kubernetes/configurations/add
- Portainer Add a new application using a form documentation: https://docs.portainer.io/2.27/user/kubernetes/applications/add
- Kubernetes ConfigMaps concept documentation: https://kubernetes.io/docs/concepts/configuration/configmap/
- Kubernetes Configure a Pod to Use a ConfigMap task: https://kubernetes.io/docs/tasks/configure-pod-container/configure-pod-configmap/
- Kubernetes Updating Configuration via a ConfigMap tutorial: https://kubernetes.io/docs/tutorials/configuration/updating-configuration-via-a-configmap/
- Kubernetes `kubectl create configmap` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_create/kubectl_create_configmap/
- Kubernetes `kubectl rollout restart` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_rollout/kubectl_rollout_restart

## Issues Found
1. **Portainer UI steps did not match the current documentation.** The post referred to `ConfigMaps` / `Configs & Secrets`, `Add ConfigMap`, and a generic "select ConfigMap as the source" attachment flow. Updated these instructions to match Portainer's documented UI: `ConfigMaps & Secrets`, the `ConfigMaps` tab, `Add with form`, the application `ConfigMaps` section, and the `Override` behavior for filesystem mounts.
2. **The single-key example used incorrect terminology.** The comment said a ConfigMap key was "mounted" as an environment variable. Environment variables are injected, not mounted, so the comment was corrected to "Load a single key from a ConfigMap as an env var."
3. **The ConfigMap update guidance overstated restart requirements and understated refresh timing.** The original text implied pods always need a restart after a ConfigMap update and said mounted files update within `~60 seconds`. Updated it to reflect Kubernetes behavior: environment-variable consumers require a restart, while mounted ConfigMap volumes update automatically but may take up to about two minutes with default kubelet settings.
4. **The directory-based `kubectl create configmap` comment was slightly overbroad.** Updated "All files in directory become keys" to "All regular files in the directory become keys," matching the `kubectl create configmap` reference.

## Review Notes
- The YAML examples using `configMapKeyRef`, `envFrom.configMapRef`, and a `configMap` volume are technically correct and use current Kubernetes APIs.
- Mounted ConfigMap updates do not propagate through a `subPath` volume mount. The post's example does not use `subPath`, so no change was required.
- The rollout restart example assumes the workload is a Deployment. The same pattern also works for other rollout-managed resources such as StatefulSets and DaemonSets by changing the resource type.
