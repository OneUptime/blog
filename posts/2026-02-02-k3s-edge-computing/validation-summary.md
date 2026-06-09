# Validation Summary: How to Use K3s for Edge Computing

## Status
validated

## Post Type
Tutorial / Practical Guide

## Technologies Covered
- K3s (lightweight Kubernetes distribution)
- Kubernetes (kubelet, kube-controller-manager, kube-apiserver flags, ResourceQuota, Deployment, DaemonSet)
- containerd / crictl / ctr
- OpenTelemetry Collector (file_storage extension, sending_queue, otlphttp exporter)
- system-upgrade-controller (Plan CRD)
- Docker (image save/load for airgap distribution)
- Bash scripting / systemd
- Container registry (registry:2)

## Sources Consulted
- K3s official documentation - https://docs.k3s.io/
- K3s airgap installation guide - https://docs.k3s.io/installation/airgap
- K3s GitHub releases (v1.28.4+k3s2 release assets) - https://github.com/k3s-io/k3s/releases
- OpenTelemetry Collector exporterhelper README (sending_queue / persistent storage configuration) - https://github.com/open-telemetry/opentelemetry-collector/blob/main/exporter/exporterhelper/README.md
- system-upgrade-controller README and types.go (DrainSpec struct) - https://github.com/rancher/system-upgrade-controller
- Kubernetes documentation for kubelet eviction thresholds and resource reservations

## Issues Found

1. **Incorrect K3s binary URL in the upgrade script** — The script used `https://github.com/k3s-io/k3s/releases/download/${NEW_VERSION}/k3s-${ARCH}` with `ARCH="amd64"`, which resolves to `k3s-amd64` and returns a 404. K3s release assets are named `k3s` for amd64 (no suffix), `k3s-arm64` for arm64, and `k3s-armhf` for armv7. Replaced the hardcoded suffix with a `case` block that maps `ARCH` to the correct release asset name.

2. **Incorrect K3s binary URL in the airgap packaging script** — The script declared an `ARCH` variable but the binary download URL was hardcoded to `k3s` (amd64-only), so changing `ARCH` to `arm64` would still pull the wrong binary. Added the same `case` block mapping so the script downloads the correct binary for the selected architecture.

3. **Invalid OpenTelemetry Collector configuration field** — The `otlphttp` exporter used `sending_queue.persistent_storage_enabled: true`, which is not a valid field. According to the OpenTelemetry exporterhelper docs, persistent queueing is enabled by setting `sending_queue.storage` to the name of a storage extension (e.g., `file_storage`). The blog already defined a `file_storage` extension, so changed the field to `storage: file_storage` to correctly wire the persistent queue.

## Review Notes

- The `pod-eviction-timeout` kube-controller-manager flag is deprecated in upstream Kubernetes and slated for removal in future releases. It is still accepted by K3s v1.28.x but readers should be aware it may emit a deprecation warning or be removed in newer K3s versions. Left as-is since it remains functional in the version range the post targets.
- The airgap install script runs `sudo gunzip /var/lib/rancher/k3s/agent/images/*.gz`. K3s can read `.tar.gz` airgap image tarballs directly, so the gunzip step is unnecessary but not harmful. Left as-is.
- The example `kubectl get nodes` output shows the `control-plane,master` role label. The `node-role.kubernetes.io/master` label is deprecated in upstream Kubernetes but K3s v1.28.x still applies it for backwards compatibility, so the example output is accurate for the version cited.
- The system-upgrade-controller Plan example uses `drain.deleteEmptyDirData`. The DrainSpec Go struct uses `DeleteEmptydirData` (single capital), but the controller historically accepts both spellings in YAML and the JSON tag canonicalizes the field. Left as-is.
- The post references `https://oneuptime.com/otlp` and `https://oneuptime.com/api/telemetry` as illustrative OneUptime ingestion endpoints; treat these as placeholders for the reader's actual OneUptime project endpoint.
