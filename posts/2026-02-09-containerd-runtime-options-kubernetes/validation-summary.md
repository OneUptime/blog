# Validation Summary: How to Configure containerd Runtime Options for Kubernetes

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes
- containerd
- Container Runtime Interface (CRI)
- containerd TOML configuration
- RuntimeClass
- CNI
- container registry host configuration
- crictl
- systemd

## Sources Consulted
- containerd CRI configuration documentation - https://github.com/containerd/containerd/blob/main/docs/cri/config.md
- containerd registry host configuration documentation - https://containerd.io/docs/main/hosts/
- containerd operations and metrics documentation - https://containerd.io/docs/main/ops/
- Kubernetes container runtimes documentation - https://kubernetes.io/docs/setup/production-environment/container-runtimes/
- Kubernetes RuntimeClass API reference - https://kubernetes.io/docs/reference/kubernetes-api/node/runtime-class-v1/
- Kubernetes private registry image pull secrets documentation - https://kubernetes.io/docs/tasks/configure-pod-container/pull-image-private-registry/
- gVisor containerd configuration documentation - https://gvisor.dev/docs/user_guide/containerd/configuration/
- Kubernetes cri-tools crictl documentation - https://github.com/kubernetes-sigs/cri-tools/blob/master/docs/crictl.md

## Issues Found
- The post did not state that its `plugins."io.containerd.grpc.v1.cri"` snippets use containerd 1.x/version 2 plugin paths. Added a version caveat noting that containerd 2.x/version 3 uses split `io.containerd.cri.v1.images` and `io.containerd.cri.v1.runtime` plugin sections.
- The CRI plugin snippet incorrectly described `disable_tcp_service` as disabling the CRI plugin. It disables CRI serving over containerd's TCP gRPC server, so the comment was corrected.
- The CRI plugin snippet described `enable_selinux` as CRI stats collection. It is an SELinux option, so the comment was corrected.
- The CRI plugin snippet described `discard_unpacked_layers` as disabling snapshot garbage collection and set it to `true`. The option discards unpacked layer data after snapshot extraction, so the comment was corrected and the value was set to the documented default `false`.
- The kubelet cgroup verification command only checked process flags, which can miss kubelet configuration files. It was changed to inspect `/var/lib/kubelet/config.yaml`.
- The CNI `max_conf_num` comment incorrectly described concurrent CNI operations. It controls how many CNI config files containerd loads, so the comment was corrected.
- The registry section used deprecated `registry.mirrors`, `registry.configs`, and static password configuration while also setting `config_path`. It was replaced with the current `hosts.toml` registry host configuration pattern and a note to use Kubernetes image pull secrets for username/password authentication.
- The image pull configuration used invalid TOML table forms for `image_pull_progress_timeout` and `max_concurrent_downloads`. These were corrected to scalar CRI plugin fields.
- The image pull configuration described `disable_snapshot_annotations` as disabling layer unpacking. It controls whether snapshot annotations are passed to the snapshotter, so the comment was corrected.
- The configuration validation command implied `containerd config dump` simply checked syntax. It was updated to use `containerd --config /etc/containerd/config.toml config dump`, which renders the final config and fails on invalid config parsing.

## Review Notes
- The edited TOML snippets were parsed locally with Python `tomllib`; all TOML blocks parse successfully.
- The local review environment has containerd v2.2.3 installed, so CLI help and current default config output were checked locally. `crictl` and `kubelet` were not installed locally; their commands were checked against official Kubernetes/cri-tools documentation.
- The article still primarily targets containerd 1.x configuration. Future updates could add parallel containerd 2.x snippets throughout the article, but that would be a broader rewrite than required for this validation.
