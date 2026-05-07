# Validation Summary: How to Choose Between Podman and containerd

## Status
validated

## Post Type
Guide

## Technologies Covered
- Podman
- containerd
- Kubernetes Container Runtime Interface (CRI)
- runc and crun
- nerdctl
- BuildKit
- Netavark and CNI networking
- OCI container images
- systemd and Quadlet

## Sources Consulted
- Podman kube play documentation: https://docs.podman.io/en/latest/markdown/podman-kube-play.1.html
- Podman kube generate documentation: https://docs.podman.io/en/v5.8.0/markdown/podman-kube-generate.1.html
- Podman generate documentation: https://docs.podman.io/en/latest/markdown/podman-generate.1.html
- Podman volume option documentation: https://docs.podman.io/en/v4.4/markdown/options/volume.html
- Podman inspect documentation: https://docs.podman.io/en/latest/markdown/podman-container-inspect.1.html
- containerd getting started documentation: https://containerd.io/docs/getting-started/
- containerd rootless documentation: https://containerd.io/docs/2.1/rootless/
- containerd CRI plugin configuration guide: https://github.com/containerd/containerd/blob/main/docs/cri/config.md
- Kubernetes Container Runtime Interface documentation: https://kubernetes.io/docs/concepts/containers/cri/
- Kubernetes container runtimes documentation: https://kubernetes.io/docs/setup/production-environment/container-runtimes/
- nerdctl documentation: https://github.com/containerd/nerdctl
- Local `ctr` v2.2.3 help output for `ctr run` and `ctr images pull`

## Issues Found
- The architecture overview said Podman runs containers as direct child processes. That was too imprecise for detached containers, where Podman uses `conmon` to monitor container processes. Updated the wording to describe Podman as daemonless with `conmon` monitoring.
- The Kubernetes integration section stated that Kubernetes uses containerd as its default runtime. Kubernetes requires a CRI-compatible runtime but does not itself define containerd as a universal default. Updated the claim to say many Kubernetes distributions use containerd through CRI.
- The containerd configuration block was marked as YAML even though it is TOML. Changed the code fence to `toml`.
- The containerd CRI configuration used containerd 1.x plugin keys. Those keys are still supported, but containerd 2.x uses different keys. Added a version note to the snippet so the example is accurate.
- The Podman Kubernetes examples used older alias forms, `podman generate kube` and `podman play kube`. Current Podman documentation presents `podman kube generate` and `podman kube play`, with `podman play kube` documented as an alias. Updated the examples to the current command form.
- The pod support section said containerd has no native pod concept at the CLI level. Current `ctr` includes sandbox commands, so the statement was too broad. Updated it to say containerd does not provide a Podman-style pod workflow at the CLI level and that Kubernetes pods are managed through CRI.

## Review Notes
The post is technically sound after the corrections. The containerd configuration example remains version-specific; future updates may want to include a separate containerd 2.x snippet if the article targets current containerd deployments explicitly.
