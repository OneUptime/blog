# Validation Summary: How to Configure Containerd Runtime in Talos Linux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Talos Linux (machine configuration, `machine.files`)
- containerd (CRI plugin configuration, runtimes, snapshotters, image decryption, stream server)
- runc (default OCI runtime)
- gVisor (`io.containerd.runsc.v1`)
- Kata Containers (`io.containerd.kata.v2`)
- Kubernetes `RuntimeClass` (`node.k8s.io/v1`)
- talosctl CLI (`apply-config`, `service`, `logs`, `read`, `containers`)

## Sources Consulted
- Talos Linux containerd configuration docs: https://docs.siderolabs.com/talos/v1.12/configure-your-talos-cluster/images-container-runtime/containerd
- Talos v1.10 containerd configuration docs: https://docs.siderolabs.com/talos/v1.10/configure-your-talos-cluster/images-container-runtime/containerd
- Talos v1.7 containerd configuration docs: https://docs.siderolabs.com/talos/v1.7/configure-your-talos-cluster/images-container-runtime/containerd
- Talos machinery constants package (`CRIContainerdConfig`, `EtcCRIConfdPath`, `CRICustomizationConfigPart`): https://pkg.go.dev/github.com/siderolabs/talos/pkg/machinery/constants
- Talos CLI reference: https://docs.siderolabs.com/talos/v1.12/reference/cli
- Kubernetes RuntimeClass docs: https://kubernetes.io/docs/concepts/containers/runtime-class/
- containerd config reference: https://containerd.io/docs/main/man/containerd-config.toml.5/

## Issues Found
1. **Incorrect configuration fragment directory.** The post used `/var/cri/conf.d/` for containerd configuration drop-ins, but the authoritative Talos constant `EtcCRIConfdPath` and the official docs specify `/etc/cri/conf.d/`. Updated every `machine.files` `path:` entry and the descriptive prose accordingly.
2. **Incorrect file extension for fragments.** The post used the `.toml` extension on every fragment (e.g., `20-custom.toml`, `20-runtime.toml`). Talos merges drop-ins matching the `.part` extension (per the `CRICustomizationConfigPart` constant `cri/conf.d/20-customization.part` and the docs example `20-customization.part`). Renamed each fragment to use `.part` (e.g., `20-custom.part`, `20-runtime.part`, `20-gvisor.part`, `20-kata.part`, `20-snapshotter.part`, `20-decryption.part`, `20-streaming.part`, `20-plugins.part`, `20-performance.part`) and updated the matching `talosctl read` example.
3. **Wrong merged-config path.** The "Read the merged containerd configuration" example pointed at `/etc/containerd/config.toml`, but Talos writes the merged CRI containerd config to `/etc/cri/containerd.toml` (per the `CRIContainerdConfig` constant). Updated the `talosctl read` command to the correct path.
4. **Clarifying note added.** Added a short sentence explaining the `.part` extension convention so readers don't repeat the original mistake.

## Review Notes
- The containerd TOML fragments (runtime registration for runc/gVisor/Kata, snapshotter selection, `image_decryption.key_model`, stream server keys, tracing `sampling_ratio`, `max_concurrent_downloads`, `discard_unpacked_layers`, `privileged_without_host_devices`) follow the documented `io.containerd.grpc.v1.cri` v2 plugin schema and are accurate.
- The gVisor RuntimeClass uses `handler: gvisor`, which correctly matches the runtime name declared in the containerd fragment (`runtimes.gvisor`). The upstream gVisor docs often use `runsc` as the runtime/handler name, but either is valid as long as the two strings match.
- `talosctl service containerd` (status), `talosctl logs containerd --tail 100`, `talosctl read`, `talosctl containers`, and `talosctl apply-config --nodes ... --file ...` are all valid current commands and flags.
- The post notes that gVisor requires a system extension; this is correct — Sidero publishes the gVisor extension via the system-extensions catalog, and `runsc` is not present in stock Talos.
- The "snapshotter = btrfs" note is technically valid as a containerd snapshotter choice, but in Talos the root filesystem is fixed and the btrfs snapshotter is only useful for specific data directories; left as-is because the post phrases it as a conditional example.
