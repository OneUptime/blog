# Validation Summary: How to Optimize Container Startup Time on Talos Linux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Talos Linux (machine configuration, registries, kubelet, disks)
- containerd (CRI plugin, overlayfs snapshotter, runc runtime)
- Kubernetes (DaemonSet, PriorityClass, Pod probes, topologySpreadConstraints, init containers)
- kubelet (image-pull related flags)
- Docker / OCI image build patterns (multi-stage builds, scratch, alpine, slim)
- kubectl (run, wait, describe)

## Sources Consulted
- [Talos Linux Containerd docs (v1.10)](https://docs.siderolabs.com/talos/v1.10/configure-your-talos-cluster/images-container-runtime/containerd) — verified the correct drop-in path `/etc/cri/conf.d/20-customization.part`.
- [Talos Linux Registries configuration docs](https://www.talos.dev/v1.10/talos-guides/configuration/containers/registry/) — verified `machine.registries.mirrors` and `machine.registries.config` structure including the `tls.clientIdentity.crt`/`key` fields.
- [KEP-3673: Kubelet limit of Parallel Image Pulls](https://github.com/kubernetes/enhancements/blob/master/keps/sig-node/3673-kubelet-parallel-image-pull-limit/README.md) — verified `serializeImagePulls` and `maxParallelImagePulls` semantics.
- [Kubernetes Images docs](https://kubernetes.io/docs/concepts/containers/images/) — confirmed parallel image pull behaviour and registry rate limiting.
- [Kubernetes PriorityClass docs](https://kubernetes.io/docs/concepts/scheduling-eviction/pod-priority-preemption/) — confirmed `scheduling.k8s.io/v1` API and field structure.
- [Kubernetes startup/liveness/readiness probe docs](https://kubernetes.io/docs/tasks/configure-pod-container/configure-liveness-readiness-startup-probes/) — confirmed probe fields and that `failureThreshold * periodSeconds` defines total time.
- [Kubernetes Topology Spread Constraints docs](https://kubernetes.io/docs/concepts/scheduling-eviction/topology-spread-constraints/) — confirmed `maxSkew`, `topologyKey`, `whenUnsatisfiable` usage.
- [containerd CRI configuration docs](https://github.com/containerd/containerd/blob/main/docs/cri/config.md) — confirmed `snapshotter`, `disable_snapshot_annotations`, `runtime_type`, `SystemdCgroup`.
- [containerd issue #4984: image pull progress deadline](https://github.com/containerd/containerd/issues/4984) — confirmed `--image-pull-progress-deadline` kubelet flag is dockershim-only and is ineffective with containerd.

## Issues Found

1. **Wrong containerd drop-in path for Talos.** The post wrote the customization TOML to `/etc/containerd/conf.d/performance.toml`, but Talos's base containerd configuration only merges drop-ins from `/etc/cri/conf.d/`, and the canonical filename is `20-customization.part`. Changed the `path:` to `/etc/cri/conf.d/20-customization.part` so the config is actually loaded.

2. **Ineffective kubelet flag `image-pull-progress-deadline`.** This flag was tied to the dockershim image puller and has no effect when the container runtime is containerd (which is what Talos uses). Leaving it in `extraArgs` is misleading because readers will assume it controls containerd's pull behaviour. Removed the flag from the kubelet `extraArgs` example. Image pull progress timeouts for containerd belong in the containerd CRI plugin config, not the kubelet flags.

## Review Notes

- The TOML snippet uses the containerd v1 plugin namespace (`io.containerd.grpc.v1.cri.*`). Talos v1.10 ships containerd 2.x, which split this into `io.containerd.cri.v1.runtime` and `io.containerd.cri.v1.images`. The legacy namespace still works in containerd 2.x with a deprecation warning, so the example remains functional; consider migrating to the new namespaces in a future revision.
- `registry-qps` and `registry-burst` are valid kubelet flags but are officially marked deprecated in favour of setting `registryPullQPS` / `registryBurst` via a KubeletConfiguration file. They still work today, so no change made.
- `registry.k8s.io/pause:3.9` is functional; the current upstream is 3.10. Not an error, just slightly behind the latest.
- The `machine.disks` example mounts `/var/lib/containerd` on a dedicated device. This assumes `/dev/nvme0n1` is a secondary disk (not the install/system disk). On Talos the EPHEMERAL partition normally backs `/var`, so users applying this to the boot disk would conflict with the Talos-managed layout. Worth a callout in a future revision.
- `kubectl run ... --restart=Never` still works but is no longer the preferred imperative form; `kubectl run` now defaults to creating a Pod. Not incorrect.
