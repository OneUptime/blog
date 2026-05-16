# Validation Summary: How to Migrate from CoreOS/Flatcar to Talos Linux

## Status
validated

## Post Type
Tutorial / Migration Guide

## Technologies Covered
- Talos Linux (v1.9)
- CoreOS Container Linux (discontinued) / Fedora CoreOS
- Flatcar Container Linux (Kinvolk fork of CoreOS)
- Ignition (CoreOS/Flatcar provisioning)
- Talos Machine Configuration (v1alpha1)
- Kubernetes
- kubectl
- talosctl
- etcd / etcdctl
- containerd / Docker
- systemd / networkd
- node_exporter (Prometheus)
- System Upgrade Controller (Rancher upstream)
- Nebraska / Omaha update protocol

## Sources Consulted
- Talos Linux Getting Started Guide (v1.9): https://www.talos.dev/v1.9/introduction/getting-started/
- Talos Configuration Reference (v1alpha1): https://www.talos.dev/v1.9/reference/configuration/v1alpha1/config/
- Talos CLI reference (`talosctl gen secrets`, `gen config`, `apply-config`, `upgrade`, `upgrade-k8s`, `machineconfig patch`): https://www.talos.dev/v1.9/reference/cli/
- Talos installer images: https://github.com/siderolabs/talos/pkgs/container/installer
- Talos install script: https://www.talos.dev/install
- Talos upgrade documentation: https://www.talos.dev/v1.9/talos-guides/upgrading-talos/
- System Upgrade Controller (Rancher upstream): https://github.com/rancher/system-upgrade-controller
- Flatcar Container Linux documentation: https://www.flatcar.org/docs/latest/
- Ignition specification: https://coreos.github.io/ignition/specs/
- Kubernetes `kubectl drain` reference (`--delete-emptydir-data`, `--ignore-daemonsets`): https://kubernetes.io/docs/reference/generated/kubectl/kubectl-commands#drain
- Cross-checked against repo-internal validated posts: `2026-03-03-migrate-from-k3s-to-talos-linux`, `2026-03-03-add-custom-kernel-modules-to-talos-linux`, `2026-03-03-set-machine-sysctls-in-talos-linux`, `2026-03-03-set-up-maintenance-windows-for-talos-linux`, `2026-03-03-manage-volumes-in-talos-linux`, `2026-03-03-apply-machine-configurations-talos-linux-nodes`.

## Issues Found
- **System Upgrade Controller URL was broken.** The post pointed `kubectl apply -f` at `https://raw.githubusercontent.com/siderolabs/talos/main/website/content/v1.9/talos-guides/upgrading-talos/system-upgrade-controller.yaml`, which is not a real manifest in the Talos repo (that directory contains markdown docs, not deployable YAML). Talos documentation directs users to the upstream Rancher project for the controller itself. Replaced with the canonical Rancher upstream manifest (`https://raw.githubusercontent.com/rancher/system-upgrade-controller/master/manifests/system-upgrade-controller.yaml`) and clarified that the controller is Rancher's general-purpose System Upgrade Controller (paired with a Plan that invokes `talosctl upgrade`), not a Talos-specific component. This matches the fix applied to the validated `set-up-maintenance-windows-for-talos-linux` post.

Other technical content was verified as correct:
- `talosctl gen secrets -o secrets.yaml` — `-o` is the valid short flag for `--output-file`.
- `talosctl gen config <name> <endpoint> --with-secrets <file> --output-dir <dir>` — correct.
- `talosctl machineconfig patch <config> --patch @<file> --output <out>` — correct; `@` prefix loads patch from file.
- `talosctl apply-config --insecure --nodes <ip> --file <yaml>` — correct (maintenance-mode application).
- `talosctl upgrade --nodes <ip> --image <installer>` — correct.
- `talosctl upgrade-k8s --to 1.31.0` — correct; Talos v1.9 supports Kubernetes 1.30–1.32.
- `talosctl dmesg`, `talosctl logs kubelet`, `talosctl version` with `--nodes` — correct.
- Talos installer image references (`ghcr.io/siderolabs/installer:v1.9.0`, `v1.9.1`) are valid published tags.
- Talos machine config schema: `machine.install.{disk,image}`, `machine.network.{hostname,interfaces[],nameservers}`, `interfaces[].{interface,dhcp,addresses,routes[].{network,gateway}}`, `machine.disks[].{device,partitions[].mountpoint}`, `machine.kubelet.extraMounts[].{destination,type,source,options}`, `machine.kernel.modules[].name`, and `machine.sysctls` (string-valued map) all match the v1alpha1 reference and are consistent with repo posts that exercise these fields individually.
- `kubectl drain --ignore-daemonsets --delete-emptydir-data` — current flag (`--delete-local-data` was deprecated in favor of `--delete-emptydir-data`).
- Historical claims about CoreOS Container Linux's discontinuation (post-Red Hat acquisition), Kinvolk's Flatcar fork, and Nebraska/Omaha being the CoreOS/Flatcar update protocol are accurate.
- The DaemonSet example for `node-exporter` (apiVersion, hostNetwork/hostPID, hostPath rootfs mount with `--path.rootfs=/host`) is syntactically valid Kubernetes and matches common node_exporter deployment patterns.

## Review Notes
- The Ignition path probe `cat /etc/ignition.json || cat /usr/share/oem/config.ign` is left intact. `/usr/share/oem/config.ign` is the canonical OEM location on Flatcar; `/etc/ignition.json` is not a standard location but exists on some platforms/installs, and the `||` fallback makes the snippet harmless.
- The post pins `ghcr.io/siderolabs/installer:v1.9.0`/`v1.9.1`. Readers should substitute the latest Talos patch release at the time of migration; the v1alpha1 machine config schema shown is compatible with current v1.9.x.
- The control-plane migration section is intentionally high-level (etcd member rotation, load balancer updates). Operators should additionally consult Talos's etcd disaster-recovery docs when cycling control-plane members one at a time.
- The post correctly notes that Talos does not support custom systemd units; readers needing host-level functionality should look at Talos system extensions (https://github.com/siderolabs/extensions) in addition to DaemonSets.
- `prom/node-exporter:latest` is shown for brevity — production deployments should pin a specific tag.
