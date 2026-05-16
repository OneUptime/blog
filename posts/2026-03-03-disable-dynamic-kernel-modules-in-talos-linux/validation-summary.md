# Validation Summary: How to Disable Dynamic Kernel Modules in Talos Linux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Talos Linux
- Linux kernel module loading (`insmod`, `modprobe`)
- Linux kernel security primitives (`modules_disabled`, `module.sig_enforce`, kernel lockdown LSM, `CAP_SYS_MODULE`)
- `talosctl` CLI (`read`, `dmesg`)
- Talos Image Factory (`factory.talos.dev`)
- Talos system extensions (`siderolabs/extensions`)
- CNI plugins (Cilium, Calico, Flannel, Weave)
- Comparison with Flatcar Container Linux and Bottlerocket

## Sources Consulted
- Sidero Labs official docs — process capabilities (v1.7 and v1.9): https://docs.siderolabs.com/talos/v1.9/learn-more/process-capabilities/
- Sidero Labs official docs — boot assets: https://docs.siderolabs.com/talos/v1.7/platform-specific-installations/boot-assets/
- Talos Image Factory: https://factory.talos.dev/
- Image Factory API reference: https://github.com/siderolabs/image-factory/blob/main/docs/api.md
- Official Talos system extensions repository: https://github.com/siderolabs/extensions
- Talos source code via GitHub code search (`siderolabs/talos`) — verified `module.sig_enforce=1`, `lockdown=confidentiality`, and `cap_sys_module` restriction; verified absence of any `kernel.modules_disabled` sysctl in the codebase
- `talosctl read` CLI reference: https://docs.siderolabs.com/talos/v1.9/reference/cli/

## Issues Found
1. **Incorrect mechanism described for restricting module loading.** The post originally claimed that Talos sets `/proc/sys/kernel/modules_disabled` to 1 and provided a verification command for that sysctl. Searching the `siderolabs/talos` source code returns zero results for `modules_disabled`, and the official process-capabilities documentation explicitly describes a different mechanism: revoking `CAP_SYS_MODULE` plus enforcing kernel module signatures with a throwaway build-time key. Talos also boots with `lockdown=confidentiality` and `module.sig_enforce=1` on the kernel command line. I rewrote the "Verifying Module Loading Restrictions" section to describe the real mechanism, replace the bogus `modules_disabled` check with `talosctl read /sys/kernel/security/lockdown` and a `grep module.sig_enforce` on `/proc/cmdline`, and corrected the explanatory paragraph that followed. The "On Talos, these attacks are not possible" comment block was updated similarly so it no longer cites `modules_disabled=1`.

2. **Inaccurate Talos system extension names.** The post listed extensions using shortened identifiers that do not match the names published in `siderolabs/extensions`. Corrected:
   - `siderolabs/nvidia-open` → `siderolabs/nvidia-open-gpu-kernel-modules-lts` (two occurrences: the comment listing common extensions, and both schematic YAML examples)
   - `siderolabs/nvidia-container-toolkit` → `siderolabs/nvidia-container-toolkit-lts`
   - `siderolabs/gasket` → `siderolabs/gasket-driver`
   - `siderolabs/usb-modem` → `siderolabs/usb-modem-drivers`

3. **WireGuard described as an optional extension.** The post listed WireGuard under networking modules with the qualifier "(if the extension is installed)". WireGuard has been in the mainline Linux kernel since 5.6 and Talos's kernel ships with it; there is no separate `wireguard` extension in `siderolabs/extensions`. Updated the parenthetical to reflect that WireGuard is upstream.

## Review Notes
- The example installer reference `factory.talos.dev/installer/<schematic-id>:v1.7.0` will date quickly — by 2026-05-16, Talos is several minor versions past 1.7. The version is illustrative and the URL format is correct, so I left it as written; an author refresh in the future should bump the version pin.
- The post's tier-list of categories ("Storage modules", etc.) is illustrative rather than exhaustive — the exact set of in-tree modules depends on the Talos kernel config for a given release. The wording already acknowledges this ("The exact list depends on the Talos version..."), so no change was needed.
- The Image Factory `POST /schematics` content type accepts both `application/x-yaml` and `application/yaml`; the post's example using `application/x-yaml` works.
- The claim that NVIDIA GPU support requires both the kernel-module extension and the container-toolkit extension is accurate, and pairing the `-lts` variants (as now written) is the conventional choice; users on the production NVIDIA driver branch would substitute `-production` for both.
