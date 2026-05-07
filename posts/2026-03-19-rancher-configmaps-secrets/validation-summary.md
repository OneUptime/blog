# Validation Summary: How to Mount ConfigMaps and Secrets in Rancher Workloads

## Status
validated

## Post Type
Guide

## Technologies Covered
- Rancher Manager
- Kubernetes
- ConfigMaps
- Secrets
- Deployments
- `kubectl`

## Sources Consulted
- Kubernetes: ConfigMaps concept docs: https://kubernetes.io/docs/concepts/configuration/configmap/
- Kubernetes: Configure a Pod to Use a ConfigMap: https://kubernetes.io/docs/tasks/configure-pod-container/configure-pod-configmap/
- Kubernetes: Secrets concept docs: https://kubernetes.io/docs/concepts/configuration/secret/
- Kubernetes: Projected Volumes: https://kubernetes.io/docs/concepts/storage/projected-volumes/
- Kubernetes: Volumes: https://kubernetes.io/docs/concepts/storage/volumes/
- Kubernetes: `kubectl rollout restart`: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_rollout/kubectl_rollout_restart/
- Kubernetes: `kubectl exec`: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_exec/
- SUSE Rancher Manager v2.14: ConfigMaps: https://documentation.suse.com/cloudnative/rancher-manager/v2.14/en/cluster-admin/kubernetes-resources/configmaps.html
- SUSE Rancher Manager v2.14: Secrets: https://documentation.suse.com/en-us/cloudnative/rancher-manager/v2.14/en/security/secrets-hub.html
- SUSE Rancher Manager v2.14: Deploying Workloads: https://documentation.suse.com/cloudnative/rancher-manager/v2.14/en/cluster-admin/kubernetes-resources/workloads-and-pods/deploy-workloads.html

## Issues Found
- The Rancher ConfigMap navigation path was outdated. I changed `Storage > ConfigMaps` to `More Resources > Core > ConfigMaps` to match current Rancher Manager documentation.
- The Secret explanation overstated the security properties of Secrets. I changed it to clarify that Secrets are intended for sensitive data, that `data` values are base64-encoded, and that RBAC plus encryption at rest are still important because base64 is not encryption.
- The UI instructions implied Secret mounts are only optionally read-only. I corrected this to reflect Kubernetes behavior: Secret volumes are mounted read-only.
- The projected-volume example referenced a `db-password` key that was not present in the Secret defined earlier in the post. I changed it to `db-config.yaml` so the example is internally consistent.
- The automatic-update section claimed changes propagate within up to a minute. I corrected this to the Kubernetes-documented behavior: updates are eventually consistent and can take up to the kubelet sync period plus cache propagation delay.
- The caveat about applications picking up file changes was too narrow. I changed it to say applications must re-read the files, watch for changes, or be restarted.

## Review Notes
Kubernetes documents ConfigMap and Secret volume updates as eventually consistent rather than immediate, and exact timing depends on kubelet configuration and cache strategy. Rancher UI labels can vary slightly by release, so readers on older Rancher versions may see minor navigation differences even though the Kubernetes YAML behavior remains the same.
