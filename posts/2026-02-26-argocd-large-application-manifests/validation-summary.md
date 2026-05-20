# Validation Summary: How to Handle Large Application Manifests Over 1MB in ArgoCD

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Argo CD
- Kubernetes
- etcd
- Helm
- kubectl
- ConfigMaps and Secrets
- Server-side apply

## Sources Consulted
- etcd system limits: https://etcd.io/docs/v3.6/dev-guide/limit/
- Kubernetes ConfigMap documentation: https://kubernetes.io/docs/concepts/configuration/configmap/
- Kubernetes Secret documentation: https://kubernetes.io/docs/concepts/configuration/secret/
- Kubernetes Deployment documentation: https://kubernetes.io/docs/concepts/workloads/controllers/deployment/
- Argo CD Helm documentation: https://argo-cd.readthedocs.io/en/latest/user-guide/helm/
- Argo CD sync options documentation: https://argo-cd.readthedocs.io/en/latest/user-guide/sync-options/
- Helm upgrade command documentation: https://helm.sh/docs/helm/helm_upgrade/

## Issues Found
- The post described the limit as a hard 1MB etcd limit. Updated the wording to distinguish etcd's default 1.5MiB maximum request size from Kubernetes object-specific limits such as ConfigMap and Secret 1MiB limits.
- The Deployment examples used `apps/v1` but omitted the required `spec.selector` and matching pod template labels. Added selectors and labels so the examples are valid Deployment manifests.
- The Helm section implied an Argo CD Application `helm.parameters` value could limit Helm release history. Argo CD renders charts with `helm template` and does not manage Helm release Secrets for Argo CD-managed apps. Replaced that snippet with a standalone Helm `helm upgrade --history-max` example.
- The compression section said both ConfigMaps and Secrets use `binaryData`. ConfigMaps support `binaryData`; Secrets use `data` or `stringData`. Updated the text accordingly.

## Review Notes
The Argo CD `ServerSideApply=true` sync option is current and technically accurate. The monitoring commands are approximate because `kubectl get -o json | wc -c` measures the JSON representation returned by the API rather than the exact persisted etcd protobuf size, but this is acceptable as a practical warning signal.
