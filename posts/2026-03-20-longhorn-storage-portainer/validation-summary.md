# Validation Summary: How to Deploy Longhorn Storage and Manage via Portainer

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Longhorn
- Portainer
- Kubernetes
- Persistent Volumes and PersistentVolumeClaims
- Kubernetes Ingress
- `kubectl`

## Sources Consulted
- Longhorn install with kubectl: https://longhorn.io/docs/latest/deploy/install/install-with-kubectl/
- Longhorn installation requirements: https://longhorn.io/docs/latest/deploy/install/
- Longhorn access UI: https://longhorn.io/docs/latest/deploy/accessing-the-ui/
- Longhorn official deployment manifest: https://raw.githubusercontent.com/longhorn/longhorn/v1.11.1/deploy/longhorn.yaml
- Portainer add a new application using code: https://docs.portainer.io/sts/user/kubernetes/applications/manifest
- Portainer create an application from a Manifest: https://docs.portainer.io/user/kubernetes/applications/manifest/create
- Portainer Kubernetes volumes: https://docs.portainer.io/sts/user/kubernetes/volumes
- Kubernetes change the default StorageClass: https://kubernetes.io/docs/tasks/administer-cluster/change-default-storage-class/

## Issues Found
- The post pinned Longhorn to `v1.6.0` and used the older `environment_check.sh` script. I updated the guide to Longhorn `v1.11.1` and replaced the readiness check with the current `longhornctl check preflight` workflow from Longhorn docs.
- The Portainer workflow described `Stacks > Add Stack`, which does not match current Portainer Kubernetes documentation. I updated the steps to `Applications > Create from code` with a manifest URL and the `Use namespace(s) specified from manifest` option.
- The post implied Longhorn needed to be made the default StorageClass after install. The official `longhorn.yaml` already creates the `longhorn` StorageClass with the default-class annotation, so I corrected the step to verify or fix the default only if needed and replaced the cluster-specific `local-path` example with a placeholder for the actual existing default class.
- The Longhorn UI section omitted that authentication is not enabled by default for manifest-based installs and used a generic `nginx.ingress.kubernetes.io/proxy-body-size: "0"` value. I added the authentication caveat and aligned the body-size annotation with Longhorn's published ingress guidance.
- The sample workload used `myapp:latest`, which is a placeholder and not runnable as written. I replaced it with a runnable `busybox:1.36` example that writes to the mounted PVC.
- The Portainer management section referenced `Cluster > Storage`, but current Portainer documentation exposes storage-class information under `Volumes` and its `Storage` tab. I updated the navigation text accordingly.

## Review Notes
- The optional namespace manifest is redundant because the official Longhorn deployment manifest already includes the `longhorn-system` namespace, but leaving it in the post is harmless.
- Longhorn documentation currently states that version `1.11.1` requires Kubernetes `v1.25` or later.
