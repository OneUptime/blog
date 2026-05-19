# Validation Summary: How to Install MicroK8s on Ubuntu for Development

## Status
validated

## Post Type
Tutorial / Installation guide

## Technologies Covered
- MicroK8s (Canonical's lightweight Kubernetes distribution)
- Ubuntu (Linux distribution)
- snap (package manager)
- Kubernetes (kubectl, CoreDNS, Dashboard, Ingress, MetalLB, hostpath-storage, registry add-ons)
- Docker (local registry interaction)
- systemd (kubelet service management)

## Sources Consulted
- MicroK8s official documentation: https://microk8s.io/docs (redirects to https://canonical.com/microk8s/docs)
- MicroK8s Dashboard addon docs: https://canonical.com/microk8s/docs/addon-dashboard
- MicroK8s Ingress addon docs: https://canonical.com/microk8s/docs/addon-ingress
- MicroK8s install documentation and addon reference
- Kubernetes documentation regarding `LegacyServiceAccountTokenNoAutoGeneration` (default since Kubernetes 1.24)
- Snap classic confinement and channel conventions

## Issues Found
1. **Outdated Dashboard token retrieval command**: The original post used the legacy approach of grepping for `default-token` secrets in the `kube-system` namespace:
   ```bash
   microk8s kubectl -n kube-system describe secret \
     $(microk8s kubectl -n kube-system get secret | grep default-token | awk '{print $1}')
   ```
   This no longer works on Kubernetes 1.24 and newer because default service account token secrets are no longer auto-generated (`LegacyServiceAccountTokenNoAutoGeneration` became default in 1.24). Since the post explicitly references channels `1.29/stable` and `1.30/stable`, the legacy command would fail for the reader. Replaced with the currently recommended command from the MicroK8s docs:
   ```bash
   microk8s kubectl create token default
   ```

## Review Notes
- All snap install commands (`sudo snap install microk8s --classic`, `--channel=1.29/stable`, etc.) are correct.
- The `usermod -aG microk8s $USER` + `newgrp microk8s` workflow is accurate.
- `microk8s status --wait-ready`, `microk8s inspect`, `microk8s stop/start`, `microk8s reset`, `microk8s add-node`, `microk8s join` commands are all valid and current.
- The addon names used (`dns`, `dashboard`, `hostpath-storage`, `ingress`, `metallb`, `registry`) are correct. Notably the post correctly uses `hostpath-storage` rather than the deprecated `storage` alias.
- The ingress namespace is `ingress` — confirmed against the MicroK8s ingress addon docs.
- The local registry port `localhost:32000` and MetalLB enable syntax (`metallb:<range>`) are correct.
- The kubelet args path `/var/snap/microk8s/current/args/kubelet` and the systemd unit `snap.microk8s.daemon-kubelet` are accurate for snap-installed MicroK8s.
- The join port `25000` is the default MicroK8s cluster-agent port — correct.
- The nginx image tag `nginx:1.25` is a valid published tag on Docker Hub at the time of writing (current stable is later, but `1.25` still resolves and functions for the tutorial).
- The default-route URL for the dashboard proxy (`http://localhost:8001/api/v1/namespaces/kube-system/services/https:kubernetes-dashboard:/proxy/`) is the correct kube-apiserver proxy URL format.
- Minor caveat (not fixed, as it's not strictly wrong): the dashboard URL technically requires authenticated proxy access — readers may need to use the same token output for browser login when prompted.
