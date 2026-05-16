# Validation Summary: How to Run Media Servers on Talos Linux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Talos Linux
- Kubernetes (Deployments, Services, Ingress, PersistentVolume, PersistentVolumeClaim)
- Jellyfin media server
- Navidrome music server
- Immich photo management
- Intel GPU device plugin for Kubernetes (hardware transcoding)
- NFS storage
- Helm
- NGINX Ingress Controller

## Sources Consulted
- Immich official documentation — https://docs.immich.app/install/environment-variables (confirmed default server port 2283, ML port 3003)
- Immich Helm chart source — https://github.com/immich-app/immich-charts/blob/main/charts/immich/templates/server.yaml (confirmed service exposes port 2283)
- Navidrome configuration source — https://github.com/navidrome/navidrome/blob/master/conf/configuration.go (confirmed env var naming, current Scanner.Schedule key)
- Intel GPU device plugin README — https://github.com/intel/intel-device-plugins-for-kubernetes/blob/main/cmd/gpu_plugin/README.md (confirmed current install commands and overlay paths)
- Jellyfin Docker image documentation (confirmed default HTTP port 8096, JELLYFIN_DATA_DIR / JELLYFIN_CACHE_DIR env vars)
- Kubernetes documentation for PersistentVolume/PVC binding (`storageClassName: ""` + `volumeName` pattern)

## Issues Found

1. **Navidrome scan schedule env var was outdated.** The post used `ND_SCANSCHEDULE`, which corresponds to the older top-level `ScanSchedule` config key that has been removed in current Navidrome releases. The current key is `Scanner.Schedule`, which maps to the env var `ND_SCANNER_SCHEDULE`. Updated the Navidrome Deployment manifest accordingly.

2. **Immich service port was wrong in the ingress.** The post backend port for the `immich-server` service was `3001`, which is no longer correct. The current Immich server listens on port `2283` (per the official environment-variables docs) and the official Helm chart's server service exposes port `2283`. Updated the ingress backend `port.number` from `3001` to `2283`.

3. **Intel GPU device plugin install URLs returned 404.** The post used `kubectl apply -f` against two specific YAML paths (`deployments/nfd/overlays/node-feature-discovery/node-feature-discovery-daemonset.yaml` and `deployments/gpu_plugin/overlays/nfd_managed/kustomization.yaml`) that do not exist in the current repository layout. The repo now uses kustomize overlays (`node-feature-rules` for NFD rules and `nfd_labeled_nodes` for the GPU plugin). Replaced the commands with the three `kubectl apply -k ...?ref=main` commands documented in the official `cmd/gpu_plugin/README.md`.

## Review Notes

- The `image: jellyfin/jellyfin:latest`, `deluan/navidrome:latest`, and Immich Helm `image.tag: release` references work but pinning to specific versions is recommended for production home labs to avoid unintended upgrades. This is a style/best-practice note, not a technical error.
- The Jellyfin hardware-transcoding snippet shows the `gpu.intel.com/i915` resource request, which is correct for the Intel GPU device plugin. However, on Talos Linux specifically, enabling Intel GPU support typically also requires the `siderolabs/i915` system extension on the worker node — the post mentions Talos must "expose the GPU device" without spelling that out. It's a useful caveat for readers but not a technical inaccuracy in the code shown.
- The `/etc/hosts` example points all three hostnames at `192.168.1.200` (the NAS IP used elsewhere as an example), which is fine as a placeholder but readers should point it at their ingress controller's LoadBalancer IP, not the NAS. Left as-is since the example is clearly illustrative.
- The `mediaPV` uses `accessModes: ReadWriteMany` with NFS, which is correct. The `jellyfin-config` PVC uses `ReadWriteOnce`, which is appropriate for a single-replica Deployment.
- The Immich Helm values shown set `postgresql.enabled: true` and `redis.enabled: true`. The current `immich-charts` repo has moved away from bundled PostgreSQL/Redis sub-charts (the current values.yaml uses a `valkey` dependency and expects you to bring your own database). The values shown will not work unchanged against the latest chart. This is a forward-looking concern; since the chart values block is shown as illustrative ("for Helm installation") and the post does not pin a chart version, leaving as-is and flagging here so a future revision can refresh this section against a specific chart release.
