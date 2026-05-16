# Validation Summary: How to Install Multus CNI on Talos Linux

## Status
validated

## Post Type
Tutorial / step-by-step installation guide

## Technologies Covered
- Talos Linux (immutable Kubernetes-focused OS)
- Multus CNI (meta-CNI plugin, k8snetworkplumbingwg)
- Kubernetes (DaemonSet, NetworkAttachmentDefinition CRD, Pod annotations)
- Standard CNI plugins (macvlan, bridge, static IPAM, host-local IPAM)
- talosctl / kubectl CLI tooling

## Sources Consulted
- Sidero Labs official Multus on Talos guide: https://docs.siderolabs.com/kubernetes-guides/cni/multus
- Multus CNI upstream repo and thick DaemonSet manifest: https://github.com/k8snetworkplumbingwg/multus-cni and https://raw.githubusercontent.com/k8snetworkplumbingwg/multus-cni/master/deployments/multus-daemonset-thick.yml
- Multus CNI releases (verified v4.x is current): https://github.com/k8snetworkplumbingwg/multus-cni/releases
- Sidero extensions catalog (verified no `cni-plugins` extension exists): https://github.com/siderolabs/extensions
- Talos discussion #11047 — "The proper way to install CNI plugins": https://github.com/siderolabs/talos/discussions/11047
- Talos discussion #7583 — basic CNI plugins bundled status: https://github.com/siderolabs/talos/discussions/7583

## Issues Found

1. **Fabricated Talos system extension.** Step 1 referenced `ghcr.io/siderolabs/cni-plugins:v1.4.0` as a way to add CNI plugins. This extension does not exist in the official `siderolabs/extensions` catalog. Since Talos v1.8, the standard reference CNI plugins (`macvlan`, `bridge`, `host-device`, `host-local`, `static`, `loopback`, `ipvlan`, `tuning`, etc.) are bundled with Talos itself, and the older `siderolabs/install-cni` image has been deprecated.
   - **Fix:** Rewrote Step 1 to explain that the standard plugins are bundled in Talos v1.8+, show how to verify with `talosctl list /opt/cni/bin/`, and note that genuinely missing plugins (e.g. SR-IOV) require a custom system extension rather than a non-existent published one.

2. **Deprecated/invalid kubelet flags in the Talos machine config patch.** The original patch set `cni-bin-dir` and `cni-conf-dir` via `machine.kubelet.extraArgs`. These kubelet flags are deprecated in modern Kubernetes, and Talos does not require them — the default CNI paths (`/opt/cni/bin`, `/etc/cni/net.d`) already match the standard.
   - **Fix:** Removed the patch entirely (along with the bogus extension), since no machine config change is actually needed for a stock Multus install on a modern Talos cluster.

3. **Invented custom DaemonSet with wrong entrypoint.** The "or install with a custom configuration" block defined a DaemonSet that invoked `/thick-entrypoint.sh` with `--multus-conf-file=auto` style args. That entrypoint does not exist in the Multus thick image. The real thick image entrypoint is `/usr/src/multus-cni/bin/multus-daemon` and configuration is supplied through a mounted ConfigMap, not CLI flags. The custom manifest also omitted the required `install-multus-binary` init container, the ConfigMap, the daemon socket volume, and the `host-run-netns` mount — so applying it would not produce a working Multus deployment.
   - **Fix:** Replaced the hand-rolled DaemonSet with the recommended Talos workflow: apply the upstream thick manifest, then apply the single Talos-specific patch that retargets the `host-run-netns` hostPath from `/run/netns` to `/var/run/netns`. This matches the procedure documented by Sidero Labs.

4. **Missing the Talos-specific `host-run-netns` patch.** The original post did not mention the `/run/netns` → `/var/run/netns/` hostPath change, which is the one mandatory Talos-specific tweak. Without it, pods using Multus-attached networks fail with sandbox/netns errors.
   - **Fix:** Added an explicit explanation and both a `kubectl patch` example and an inline edit example for the volume.

## Review Notes

- The NetworkAttachmentDefinition examples (macvlan, bridge, static IPAM), the `k8s.v1.cni.cncf.io/networks` pod annotation formats (both the shorthand and the JSON-array-with-custom-interface variants), the `cniVersion: "0.3.1"` choice, and the verification commands (`ip addr show`, `ping -I net1 …`, the `network-status` annotation read) are all standard and correct.
- The thick manifest URL pins to `master`, which is upstream's recommended install path but does mean future breaking changes upstream could affect copy/paste users. A future revision could call out pinning to a specific tagged release (latest is v4.2.x as of review).
- `cniVersion: "0.3.1"` is still widely used and compatible, but newer Multus / CNI spec versions (0.4.0, 1.0.0, 1.1.0) support additional features such as `CHECK`/`STATUS`. Not an error, just an opportunity for a future update.
- The `busybox:1.36` image is fine for `ip` and `ping` verification, but BusyBox's `ping` `-I` flag behavior depends on the build; readers debugging in their own clusters may need to swap to a fuller image (e.g. `nicolaka/netshoot`) if they hit issues. Not a correctness problem in the post.
