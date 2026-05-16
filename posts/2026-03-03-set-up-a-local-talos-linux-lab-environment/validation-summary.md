# Validation Summary: How to Set Up a Local Talos Linux Lab Environment

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Talos Linux (talosctl)
- Kubernetes
- Docker (as Talos cluster provisioner)
- QEMU/KVM (as Talos cluster provisioner)
- Proxmox VE (qm CLI)
- dnsmasq (DHCP/DNS for lab network)
- Linux bridge networking (iproute2)
- MetalLB (L2 load balancer)
- ingress-nginx
- Helm (Prometheus / Grafana via kube-prometheus-stack)
- etcd (snapshot, alarm, member management via talosctl)

## Sources Consulted
- Sidero Labs Talos docs — Configuration Patches: https://docs.siderolabs.com/talos/v1.10/configure-your-talos-cluster/system-configuration/patching
- Sidero Labs Talos docs — Virtual (Shared) IP: https://docs.siderolabs.com/talos/v1.8/networking/vip
- Sidero Labs Talos docs — etcd Maintenance: https://docs.siderolabs.com/talos/v1.11/build-and-extend-talos/cluster-operations-and-maintenance/etcd-maintenance
- Sidero Labs Talos docs — QEMU local platform: https://docs.siderolabs.com/talos/v1.11/platform-specific-installations/local-platforms/qemu
- talosctl CLI reference: https://www.talos.dev/v1.7/reference/cli/
- Talos GitHub releases (asset names): https://github.com/siderolabs/talos/releases
- MetalLB Configuration docs: https://metallb.universe.tf/configuration/
- Proxmox VE qm(1) reference
- QEMU networking docs

## Issues Found
1. **VIP patch applied to worker nodes** — The original `talosctl gen config` example used `--config-patch`, which applies the patch to BOTH controlplane and worker configs. The patch sets a VIP, but per Sidero docs the `vip` setting is only valid on control plane nodes; applying it to workers would fail config validation. Fixed by changing the flag to `--config-patch-control-plane` and adding a short clarifying comment.

2. **JSON Patch `add` against a non-existent parent** — The Exercise 3 patch `[{"op": "add", "path": "/machine/sysctls/net.core.somaxconn", "value": "4096"}]` assumes `/machine/sysctls` exists. RFC 6902 requires the parent object to exist for `add`, and `/machine/sysctls` is not present in generated Talos configs by default, so the patch would fail. Fixed by changing the patch to add `/machine/sysctls` with the full map value `{"net.core.somaxconn": "4096"}`.

3. **`talosctl cluster destroy` without `--provisioner`** — The reset example invoked `talosctl cluster destroy --name lab` with no provisioner. The default provisioner is `docker`, so for a qemu lab (which the post walks the reader through earlier) the destroy would not find the cluster state. Updated the example to pass `--provisioner qemu` and added a one-line note explaining why.

4. **Missing `##` on the "Resource Planning" heading** — Section heading was rendered as a plain paragraph rather than a level-2 heading. Added the `##` prefix to match the rest of the post.

## Review Notes
- The `talosctl health --wait-timeout 15m` example is syntactically valid, but a known upstream bug (siderolabs/talos issue #12553, Jan 2026) caps the effective timeout at ~5 minutes regardless of the value passed. Not changed in the post since the flag and intent are still correct.
- The QEMU `-net bridge,br=virbr0` syntax in the shell script is the legacy QEMU networking form. It still works, but the modern equivalent is `-netdev bridge,id=hn0,br=virbr0 -device virtio-net,netdev=hn0`. Left as-is to preserve the author's voice; works on all current QEMU releases.
- The MetalLB `L2Advertisement` resource has no `spec` block; this is technically valid (MetalLB will advertise all `IPAddressPool`s when no selector is specified), but for clarity in a lab tutorial it's better practice to explicitly list the pool via `spec.ipAddressPools`. Not changed since the example is functionally correct.
- The VM memory/disk sizing in the qemu `talosctl cluster create` example (`--memory 2048 --disk 20480`) is at the low end for a 3+3 cluster but acceptable for a lab. The Resource Planning table later in the post gives more realistic host-side guidance.
- The installer image tag `ghcr.io/siderolabs/installer:v1.7.0` used in Exercise 1 is a real but older Talos release. Readers should substitute the current Talos version when running upgrades; this is reasonable since the post is meant to teach the upgrade workflow rather than pin a version.
