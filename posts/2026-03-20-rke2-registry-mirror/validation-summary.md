# Validation Summary: How to Configure RKE2 Registry Mirror

## Status
validated

## Post Type
Tutorial / configuration guide

## Technologies Covered
- RKE2
- Kubernetes
- containerd
- Container registry mirrors
- Harbor proxy cache
- Docker Hub and mirror.gcr.io
- crictl

## Sources Consulted
- RKE2 Private Registry Configuration: https://docs.rke2.io/install/private_registry
- RKE2 Server Configuration Reference: https://docs.rke2.io/reference/server_config
- RKE2 CLI Tools: https://docs.rke2.io/reference/cli_tools
- RKE2 Logging: https://docs.rke2.io/reference/logging
- RKE2 Air-Gap Install: https://docs.rke2.io/install/airgap
- Harbor Configure Proxy Cache: https://goharbor.io/docs/2.11.0/administration/configure-proxy-cache/
- Harbor Access Metrics: https://goharbor.io/docs/2.3.0/administration/metrics/
- Docker Registry Mirror documentation: https://docs.docker.com/docker-hub/image-library/mirror/
- Google Artifact Registry mirror.gcr.io documentation: https://docs.cloud.google.com/artifact-registry/docs/pull-cached-dockerhub-images
- Kubernetes kubectl run reference: https://kubernetes.io/docs/reference/generated/kubectl/kubectl-commands
- Kubernetes registry.k8s.io migration notice: https://kubernetes.io/blog/2023/02/06/k8s-gcr-io-freeze-announcement/

## Issues Found
- Clarified that a registry mirror can be either a copied registry endpoint or a proxy cache. The original wording implied every mirror automatically fetches and caches upstream images.
- Removed the explicit Docker Hub fallback endpoint from the Docker Hub mirror example. RKE2/containerd already tries the registry's implicit default endpoint last unless fallback is disabled.
- Corrected the Quay and Kubernetes registry comments so `quay.io` is not described as the Kubernetes registry, and `registry.k8s.io` is presented as the current Kubernetes registry.
- Fixed the Harbor proxy cache example. Harbor proxy projects are pulled with the project name as an image path prefix, so the RKE2 mirror needs the Harbor registry endpoint plus a rewrite to prefix `dockerhub/`.
- Corrected rewrite wording and the `gcr.io/google_containers` comment so it matches the actual rewrite target.
- Updated the test commands to use RKE2's `crictl.yaml` and containerd log file path instead of treating `journalctl -u rke2-server` as the containerd log.
- Added `disable-default-registry-endpoint: true` for air-gapped operation so containerd does not fall back to upstream default registry endpoints.
- Replaced the cache hit-rate monitoring commands. `crictl stats` reports container resource stats, Kubernetes events do not show mirror endpoints, and Harbor's general statistics API is not a cache hit-rate source. The updated section checks Harbor metrics, node images, and recent pull events with accurate wording.

## Review Notes
The article is valid after the fixes. RKE2's `disable-default-registry-endpoint` option is version-gated in older RKE2 releases, so operators running very old clusters should check their RKE2 release before using that setting.
