# Validation Summary: How to Configure Log Rotation in Talos Linux

## Status
validated

## Post Type
Tutorial / How-to guide

## Technologies Covered
- Talos Linux (machine configuration, talosctl)
- Kubernetes (kubelet container log rotation)
- containerd (CRI plugin configuration)
- etcd (compaction settings)
- Prometheus (alerting rules via PrometheusRule CRD)

## Sources Consulted
- Kubernetes kubelet command-line reference: https://kubernetes.io/docs/reference/command-line-tools-reference/kubelet/
- Kubernetes KubeletConfiguration v1beta1: https://kubernetes.io/docs/reference/config-api/kubelet-config.v1beta1/
- kube-apiserver reference: https://kubernetes.io/docs/reference/command-line-tools-reference/kube-apiserver/
- Talos CLI reference: https://www.talos.dev/latest/reference/cli/
- Talos containerd configuration guide: https://www.talos.dev/latest/talos-guides/configuration/containerd/
- Talos logging guide: https://www.talos.dev/latest/talos-guides/configuration/logging/
- talosctl source — patch command: https://github.com/siderolabs/talos/blob/main/cmd/talosctl/cmd/talos/patch.go
- talosctl source — apply-config command: https://github.com/siderolabs/talos/blob/main/cmd/talosctl/cmd/talos/apply-config.go
- containerd 1.7 CRI config reference: https://github.com/containerd/containerd/blob/release/1.7/docs/cri/config.md

## Issues Found

1. **Incorrect talosctl command for applying a standalone patch.** The post used `talosctl apply-config --nodes ... --patch @file.yaml`. The `--patch` flag does not exist for `apply-config`; the source enforces `-f/--file` and offers `--config-patch` only as a modifier of a base file. The correct command for applying a strategic merge patch to running nodes is `talosctl patch machineconfig --nodes ... --patch @file.yaml`. Changed accordingly.

2. **Wrong containerd customization file path.** The post used `path: /var/cri/conf.d/20-customization.toml`. Talos loads CRI configuration drop-ins from `/etc/cri/conf.d/` and the convention is the `.part` extension (the files are concatenated into the final containerd config). Changed to `path: /etc/cri/conf.d/20-customization.part` to match the official Talos containerd guide.

## Review Notes

- The kubelet flags `container-log-max-size`, `container-log-max-files`, `image-gc-high-threshold`, `image-gc-low-threshold`, and `eviction-hard` used in `machine.kubelet.extraArgs` are technically still functional but are marked DEPRECATED by upstream Kubernetes in favor of the KubeletConfiguration object. In Talos, the modern, non-deprecated equivalent is `machine.kubelet.extraConfig` with camelCase keys (e.g., `containerLogMaxSize`, `imageGCHighThresholdPercent`, `evictionHard`). The post's `extraArgs` approach works today and was left in place to preserve the author's stylistic choice, but readers running future kubelet versions may see deprecation warnings.
- The containerd plugin name `[plugins."io.containerd.grpc.v1.cri"]` is correct for containerd 1.7.x (currently bundled with Talos). If/when Talos ships containerd 2.x, the plugin keys split (e.g., `[plugins."io.containerd.cri.v1.runtime"]`), and the snippet would need updating.
- `etcd-compaction-interval: "5m0s"` matches the kube-apiserver default and is harmless to set explicitly.
- The `talosctl usage <path>` command (alias of `du`) is real and shipping in current talosctl, though it is not always listed in the top-level CLI reference page.
