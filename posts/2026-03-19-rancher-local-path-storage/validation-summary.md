# Validation Summary: How to Configure Local Path Storage in Rancher

## Status
validated

## Post Type
Guide

## Technologies Covered
- Rancher
- K3s
- Kubernetes
- Local Path Provisioner
- Persistent Volumes and PersistentVolumeClaims
- StorageClass
- StatefulSet
- `kubectl`
- Helm

## Sources Consulted
- Rancher Local Path Provisioner README: https://github.com/rancher/local-path-provisioner
- Rancher Local Path Provisioner releases: https://github.com/rancher/local-path-provisioner/releases
- Upstream standalone manifest: https://raw.githubusercontent.com/rancher/local-path-provisioner/master/deploy/local-path-storage.yaml
- Upstream Helm chart README: https://raw.githubusercontent.com/rancher/local-path-provisioner/master/deploy/chart/local-path-provisioner/README.md
- Upstream Helm chart values: https://raw.githubusercontent.com/rancher/local-path-provisioner/master/deploy/chart/local-path-provisioner/values.yaml
- K3s storage documentation: https://docs.k3s.io/add-ons/storage
- K3s server CLI reference: https://docs.k3s.io/cli/server
- K3s packaged local storage manifest: https://raw.githubusercontent.com/k3s-io/k3s/main/manifests/local-storage.yaml
- Kubernetes StorageClass documentation: https://kubernetes.io/docs/concepts/storage/storage-classes/
- Kubernetes PersistentVolume documentation: https://kubernetes.io/docs/concepts/storage/persistent-volumes/
- Kubernetes StatefulSet documentation: https://kubernetes.io/docs/concepts/workloads/controllers/statefulset/

## Issues Found
- The standalone install command pinned `local-path-provisioner` to `v0.0.26`, which is outdated. I updated it to `v0.0.35`, matching the current upstream release documented by the project.
- The Helm installation instructions were incorrect. `https://github.com/rancher/local-path-provisioner/releases` is not a Helm repository, so I replaced that flow with the official chart installation method from the upstream repo: clone the repository and install `./deploy/chart/local-path-provisioner/`.
- The post stated that Local Path Provisioner creates only `hostPath` volumes. The upstream documentation says it can create either `hostPath`- or `local`-based persistent volumes depending on configuration, so I corrected that description.
- The post stated that Local Path Provisioner supports `ReadWriteOnce` only. The upstream documentation says `sharedFileSystemPath` supports `ReadWriteOnce`, `ReadOnlyMany`, and `ReadWriteMany`, so I corrected the access-mode explanation.
- The storage-path guidance assumed only the upstream standalone defaults (`local-path-storage` namespace and `/opt/local-path-provisioner`). K3s packages the provisioner differently, using the `kube-system` namespace and a path controlled by `--default-local-storage-path`, so I added those K3s-specific notes.
- The StatefulSet example omitted the requirement that `serviceName` must reference an existing headless Service. I added a note to make that dependency explicit.
- The node-affinity example reused `local-pvc`, which earlier steps bind before the affinity example is introduced. That can make the pod unschedulable on the pinned node, so I changed the example to use a new PVC name and clarified that the claim must still be unbound when the first consumer is scheduled.

## Review Notes
- The post now accurately distinguishes between the upstream standalone deployment and the K3s-packaged deployment, which differ in namespace, default path, and default volume type behavior.
- The workload examples are syntactically valid, but pinning demo container image tags more narrowly than `latest` would improve long-term reproducibility.
