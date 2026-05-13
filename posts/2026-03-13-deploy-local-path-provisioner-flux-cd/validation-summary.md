# Validation Summary: How to Deploy local-path-provisioner with Flux CD

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Flux CD
- Kubernetes
- HelmRelease and HelmRepository custom resources
- local-path-provisioner
- Kubernetes StorageClass, PersistentVolume, and PersistentVolumeClaim resources
- kubectl

## Sources Consulted
- Rancher local-path-provisioner README: https://github.com/rancher/local-path-provisioner
- Rancher local-path-provisioner v0.0.36 Helm chart values and templates: https://github.com/rancher/local-path-provisioner/tree/v0.0.36/deploy/chart/local-path-provisioner
- Flux HelmRelease v2 API reference: https://fluxcd.io/flux/components/helm/api/v2/
- Flux Kustomization v1 API reference: https://fluxcd.io/flux/components/kustomize/api/v1/
- Kubernetes StorageClass documentation: https://kubernetes.io/docs/concepts/storage/storage-classes/
- K3s storage documentation: https://docs.k3s.io/add-ons/storage

## Issues Found
- The post pinned local-path-provisioner v0.0.28 even though upstream stable documentation now references v0.0.36. Updated the GitRepository tag and Helm chart version to v0.0.36.
- The HelmRelease was placed in the `local-path-storage` namespace without creating that namespace first. Moved the HelmRelease to `flux-system`, added `targetNamespace: local-path-storage`, and enabled `install.createNamespace`.
- The Helm chart generates a provisioner name unless `storageClass.provisionerName` is set. Added `provisionerName: rancher.io/local-path` so the chart-created StorageClass and the additional StorageClasses use the same provisioner.
- The `pathPattern` example used invalid template variables. Replaced it with the documented local-path-provisioner variables: `{{ .PVC.Namespace }}/{{ .PVC.Name }}/{{ .PVName }}`.
- The `nodePathMap` examples used `DEFAULT`, but the chart and upstream configuration use `DEFAULT_PATH_FOR_NON_LISTED_NODES`. Updated both examples.
- The custom ConfigMap example would conflict with the Helm chart-managed `local-path-config` ConfigMap. Replaced it with the equivalent Helm values structure for `nodePathMap` and `configmap`.
- The GitRepository alternative said it would deploy manifests directly, but a GitRepository only sources them for another Flux object to apply. Clarified the wording.

## Review Notes
- The YAML snippets were parsed locally after edits.
- `helm` and `kubectl` were not installed in the local environment, so CLI behavior was checked against official documentation and upstream manifests rather than executed.
