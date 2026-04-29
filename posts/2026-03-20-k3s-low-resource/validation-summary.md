# Validation Summary: How to Configure K3s for Low-Resource Environments

## Status
validated

## Post Type
Guide / Tutorial

## Technologies Covered
- K3s
- Kubernetes
- containerd
- SQLite
- etcd
- systemd

## Sources Consulted
- K3s Requirements: https://docs.k3s.io/installation/requirements
- K3s Resource Profiling: https://docs.k3s.io/reference/resource-profiling
- K3s Configuration Options: https://docs.k3s.io/installation/configuration
- K3s Server CLI: https://docs.k3s.io/cli/server
- K3s Networking Services: https://docs.k3s.io/networking/networking-services
- K3s Cluster Datastore: https://docs.k3s.io/datastore
- K3s High Availability Embedded etcd: https://docs.k3s.io/datastore/ha-embedded
- K3s Advanced Options / Configuration: https://docs.k3s.io/advanced
- containerd CRI Plugin Config Guide: https://github.com/containerd/containerd/blob/main/docs/cri/config.md
- Kubernetes Reserve Compute Resources for System Daemons: https://kubernetes.io/docs/tasks/administer-cluster/reserve-compute-resources/
- Kubernetes Node-pressure Eviction: https://kubernetes.io/docs/concepts/scheduling-eviction/node-pressure-eviction/
- Kubernetes kube-apiserver CLI reference: https://kubernetes.io/docs/reference/command-line-tools-reference/kube-apiserver/
- Kubernetes kube-controller-manager CLI reference: https://kubernetes.io/docs/reference/command-line-tools-reference/kube-controller-manager/
- Kubernetes kubectl top reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_top/
- Kubernetes Swap Memory Management: https://kubernetes.io/docs/concepts/cluster-administration/swap-memory-management/
- Kubernetes Linux Node Swap Behaviors: https://kubernetes.io/docs/reference/node/swap-behavior/
- Kubernetes Feature Gates reference: https://kubernetes.io/docs/reference/command-line-tools-reference/feature-gates/

## Issues Found
- The opening RAM/CPU claim and the minimum-requirements table understated current K3s server requirements. I updated them to match current K3s requirements guidance and current K3s resource-profiling data.
- The install command in Step 1 was shell-invalid because the line-continuation backslashes were followed by inline comments. I rewrote the command so it is valid shell and kept the disablement guidance in surrounding comments.
- The CoreDNS note implied host DNS was enough. I corrected this to reflect that disabling CoreDNS requires another cluster DNS provider.
- The `metrics-server` guidance conflicted with the later `kubectl top` commands. I clarified that `kubectl top` requires `metrics-server`.
- The `eviction-hard` example overrode only one eviction threshold. In Kubernetes, changing one threshold without the others resets the unspecified defaults to zero, so I updated the example to specify the full threshold set.
- The `kube-apiserver-arg` example used `default-watch-cache-size=0` as if it disabled the watch cache. I replaced it with the current documented `watch-cache=false` flag.
- The SQLite section made a stronger efficiency claim than the official docs support. I changed it to the documented behavior: K3s defaults to SQLite for single-server setups when no other datastore is configured.
- The containerd template example was outdated for current K3s releases and omitted the required K3s base template. I updated it to use `config-v3.toml.tmpl`, `{{ template "base" . }}`, and current containerd 2.x plugin paths.
- The swap example used incorrect kubelet CLI-style settings, including `memory-swap=0`. I replaced it with the current kubelet configuration using `failSwapOn: false` and `memorySwap.swapBehavior: LimitedSwap`.
- The final best-practices note conflated crash restart behavior with power-loss recovery. I changed it to the technically accurate systemd boot-enable guidance documented by K3s.

## Review Notes
- Current K3s releases use containerd 2.x. Older releases can still use the legacy `config.toml.tmpl`, but `config-v3.toml.tmpl` is the current path for containerd 2.x.
- `watch-cache=false` can reduce memory use on very small clusters, but it trades memory savings for API read performance.
- Swap support was introduced in Kubernetes 1.28, enabled by default starting in Kubernetes 1.30, and reached GA in Kubernetes 1.34.
