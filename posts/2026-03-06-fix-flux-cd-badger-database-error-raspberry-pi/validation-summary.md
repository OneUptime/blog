# Validation Summary: How to Fix Flux CD Badger Database Error on Raspberry Pi

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Flux CD source-controller
- Kubernetes Deployments, Pods, PVCs, and emptyDir volumes
- Kustomize patches
- Raspberry Pi and ARM Kubernetes nodes
- K3s
- kubectl and Flux CLI

## Sources Consulted
- Flux source-controller documentation: https://fluxcd.io/flux/components/source/
- Flux source-controller controller options: https://fluxcd.io/flux/components/source/options/
- Flux bootstrap customization and persistent artifact storage examples: https://v2-0.docs.fluxcd.io/flux/cheatsheets/bootstrap/
- Flux bootstrap GitHub CLI reference: https://fluxcd.io/flux/cmd/flux_bootstrap_github/
- Flux controller release documentation: https://fluxcd.io/flux/releases/controllers/
- fluxcd/source-controller source code: https://github.com/fluxcd/source-controller
- Kubernetes emptyDir volume documentation: https://kubernetes.io/docs/concepts/storage/volumes/#emptydir
- Kubernetes kubectl logs reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_logs/
- Kubernetes node-pressure eviction documentation: https://kubernetes.io/docs/concepts/scheduling-eviction/node-pressure-eviction/
- K3s server CLI documentation: https://docs.k3s.io/cli/server

## Issues Found
- The post incorrectly stated that Flux CD source-controller uses an internal Badger database for cached artifacts. Current Flux source-controller writes artifacts to filesystem storage under `/data` via `--storage-path`; no Badger dependency is present in the upstream source-controller code. I changed the post to discuss source-controller artifact storage instead of Badger.
- The listed Badger-specific errors were not accurate for current Flux source-controller. I replaced them with source-controller storage-related errors and conditions such as `StorageOperationFailed`, failed artifact directory creation, failed artifact locking, and artifacts disappearing from storage.
- The `kubectl` pod selectors used `app=source-controller`, which does not match current Flux manifests. I changed them to `app.kubernetes.io/name=source-controller`.
- The tmpfs patch used new volume names while mounting the same `/tmp` and `/data` paths, which could conflict with the existing Flux deployment volume mounts. I changed the patch to replace the existing `tmp` and `data` volumes used by current Flux manifests.
- The persistent storage cleanup command used a non-standard PVC name, `source-controller-data`. I changed it to `gotk-pvc`, matching the Flux bootstrap persistent artifact storage example.
- Filesystem guidance referred to Badger memory mapping requirements. I updated it to describe Linux-native filesystem expectations for Kubernetes storage and source-controller artifact writes.

## Review Notes
The resulting post is technically valid as a Flux source-controller artifact storage troubleshooting guide. The directory slug and validation summary retain the original Badger wording, but the post content was corrected because current Flux source-controller does not use Badger.
