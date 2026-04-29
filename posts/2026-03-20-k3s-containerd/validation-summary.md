# Validation Summary: How to Configure K3s to Use containerd

## Status
validated

## Post Type
Guide

## Technologies Covered
- K3s
- containerd
- Kubernetes RuntimeClass
- crictl
- ctr
- gVisor

## Sources Consulted
- K3s Advanced Options / Configuration: https://docs.k3s.io/advanced
- K3s CLI Tools: https://docs.k3s.io/cli
- K3s agent CLI reference: https://docs.k3s.io/cli/agent
- K3s Import Images: https://docs.k3s.io/add-ons/import-images
- K3s FAQ: https://docs.k3s.io/faq
- K3s Environment Variables: https://docs.k3s.io/reference/env-variables
- K3s v1.32.X release notes: https://docs.k3s.io/release-notes/v1.32.X
- Kubernetes RuntimeClass: https://kubernetes.io/docs/concepts/containers/runtime-class/
- containerd CRI config guide: https://github.com/containerd/containerd/blob/main/docs/cri/config.md
- containerd config reference: https://github.com/containerd/containerd/blob/main/docs/man/containerd-config.toml.5.md
- containerd snapshotters reference: https://github.com/containerd/containerd/blob/main/docs/snapshotters/README.md
- gVisor containerd quick start: https://gvisor.dev/docs/user_guide/containerd/quick_start/
- K3s containerd template source: https://github.com/k3s-io/k3s/blob/master/pkg/agent/templates/templates.go
- K3s embedded ctr defaults: https://github.com/k3s-io/k3s/blob/master/pkg/ctr/main.go

## Issues Found
- The introduction described containerd as "the default for Kubernetes" and said the post covered external containerd installations. I corrected this to the narrower, accurate claim that containerd is the default runtime in K3s and that the post is about configuring the embedded runtime.
- The embedded containerd binary path used `/var/lib/rancher/k3s/data/<version>/bin/containerd`. Current K3s uses a `current` symlink under `/var/lib/rancher/k3s/data`, so I updated the example path to `/var/lib/rancher/k3s/data/current/bin/containerd`.
- The template section used a legacy `config.toml.tmpl` version 2 example and copied an incomplete rendered template. I replaced it with the current K3s-documented `config-v3.toml.tmpl` plus `{{ template "base" . }}` approach, and noted that older containerd 1.7-based K3s releases still use `config.toml.tmpl`.
- The snapshotter section had two correctness problems: it used a filesystem recommendation tied to NVMe instead of the actual Btrfs requirement, and it appended a second `snapshotter` key to the same YAML file with `tee -a`. I changed the wording to the Btrfs filesystem requirement and changed the command to overwrite the file instead of creating duplicate YAML keys.
- The runtime class example used containerd 1.x plugin keys and an outdated template pattern. I updated it to the current containerd 2.x/K3s v3 plugin path, documented the gVisor shim prerequisite, and aligned the RuntimeClass handler with the configured runtime name.
- The GC tuning comments were inaccurate for `deletion_threshold`, `mutation_threshold`, `schedule_delay`, and `startup_delay`. I corrected the comments to match containerd's config reference and moved the example to `config-v3.toml.tmpl`.
- The `crictl` and image-loading examples preferred standalone `crictl`, while K3s reliably ships embedded `k3s crictl`. I updated the post to use the embedded command by default and kept standalone `crictl` as an optional configured path.
- The monitoring example used `http://localhost:1338/metrics`, which is not the supported K3s monitoring path in this context. I replaced it with supported inspection commands for cgroup usage, containerd logs, and containerd events.
- Several configuration sections changed files without restarting K3s afterward. I added restart commands because these changes do not take effect until the service is restarted.

## Review Notes
Current K3s releases use containerd 2.x, so `config-v3.toml.tmpl` and the newer plugin keys are the important version-specific details for this post. Readers working with older K3s releases that still bundle containerd 1.7 should translate the examples back to `config.toml.tmpl` and the older `io.containerd.grpc.v1.cri` paths.
