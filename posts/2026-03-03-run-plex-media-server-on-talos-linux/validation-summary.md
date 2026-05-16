# Validation Summary: How to Run Plex Media Server on Talos Linux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Talos Linux
- Kubernetes (Deployments, Services, PVs/PVCs, Namespaces)
- Plex Media Server (`plexinc/pms-docker`)
- NFS persistent storage
- MetalLB (LoadBalancer annotations)
- Longhorn storage class (referenced)
- Intel GPU device plugin for Kubernetes (Quick Sync hardware transcoding)
- Tautulli (Plex monitoring)
- Kustomize (`kubectl apply -k`)

## Sources Consulted
- Plex official Docker image documentation: https://github.com/plexinc/pms-docker
- Intel device plugins for Kubernetes repository (overlays listing via GitHub API): https://github.com/intel/intel-device-plugins-for-kubernetes/tree/main/deployments/gpu_plugin/overlays
- Plex network ports documentation (referenced; Plex's `support.plex.tv` returned 403 to the fetcher but ports were cross-checked against the pms-docker README)
- Kustomize/`kubectl apply -k` GitHub URL syntax (requires `?ref=<branch>`)
- Kubernetes API reference for PersistentVolume, PersistentVolumeClaim, Deployment, Service, and `emptyDir` (`medium: Memory`)

## Issues Found
1. **Intel device plugin overlay path was wrong.** The post used `overlays/nfd_managed`, which does not exist in the `intel/intel-device-plugins-for-kubernetes` repository. The valid overlays are `allowlist-arc`, `health`, `levelzero`, `monitoring_shared-dev_nfd`, `nfd_labeled_nodes`, `wsl`, and `xpumd`. Changed to `nfd_labeled_nodes`, which is the appropriate overlay for an NFD-labeled deployment.
2. **Kustomize GitHub URL was missing `?ref=`.** `kubectl apply -k` requires a Git ref query parameter for GitHub URLs. Added `?ref=main` and single-quoted the URL so the shell does not interpret `?`.
3. **Namespace ordering bug in the apply sequence.** The `media` Namespace was declared inside `plex-deployment.yaml`, but the earlier `plex-media-pv.yaml` and `plex-config-pvc.yaml` both contain PVCs in that namespace. Applied in the documented order, those two PVC applies would fail because the namespace does not yet exist. Removed the Namespace block from `plex-deployment.yaml` and added an explicit `kubectl create namespace media` as the first apply step.
4. **Tautulli deployment referenced an undefined PVC.** The Tautulli Deployment mounted `claimName: tautulli-config` without that PVC being defined anywhere in the post; the pod would stay `Pending`. Added a matching `PersistentVolumeClaim` (5Gi, `longhorn` storage class, RWO) ahead of the Deployment in the same manifest.

## Review Notes
- **GDM acronym ("G'Day Mate"):** Plex's GDM (network discovery) acronym is colloquially expanded as both "G'Day Mate" and "Good Day Mate" in community discussions. Plex has not authoritatively defined it, so the wording was left as-is.
- **`hostPath` on Talos Linux:** The hardware-transcoding example mounts `/dev/dri` via `hostPath` with `securityContext: privileged: false`. This works on Talos but assumes the cluster's Pod Security admission profile allows `hostPath`; on a `restricted`-profile namespace it will be rejected. The Intel device plugin path (now corrected) is the cleaner recommendation the post already promotes.
- **`plexinc/pms-docker:latest` tag:** Using `:latest` is fine for a home-lab tutorial but pinning to a specific Plex version tag would make the deployment more reproducible. Not changed since the post is intentionally introductory.
- **MetalLB annotation:** `metallb.universe.tf/loadBalancerIPs` is still supported but, in MetalLB 0.13+, the recommended approach is the `IPAddressPool` CRD with `spec.loadBalancerIP` or pool selection. The annotation form remains valid, so no change was made.
- **`/data` vs `/media` mount:** The official `plexinc/pms-docker` documentation uses `/data` as the conventional media mount path; the post uses `/media`. Plex doesn't care — library paths are configured in the UI — so this is a stylistic choice, not an error.
- **Section header "Monitoring Plex" mentions Prometheus** but the example actually deploys Tautulli (which is not Prometheus-based). Mild content-vs-heading mismatch but not a technical inaccuracy in the YAML itself; left unchanged per the "don't restructure" guidance.
