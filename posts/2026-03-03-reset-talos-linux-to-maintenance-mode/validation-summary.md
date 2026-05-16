# Validation Summary: How to Reset Talos Linux to Maintenance Mode

## Status
validated

## Post Type
Tutorial / Operations guide

## Technologies Covered
- Talos Linux (maintenance mode, `talosctl reset`, `talosctl apply-config`, machine configuration lifecycle)
- `talosctl` CLI (`reset`, `apply-config`, `gen config`, `get machinestatus/addresses/links`, `etcd remove-member`, `version`, `disks`)
- Kubernetes (`kubectl drain`, `kubectl delete node`)
- Talos apid on port 50000 and the insecure (maintenance) API
- Bash scripting for fleet automation
- nmap for network scanning

## Sources Consulted
- Talos CLI reference: https://www.talos.dev/v1.8/reference/cli/
- Talos resetting a machine: https://www.talos.dev/v1.8/talos-guides/install/bare-metal-platforms/iso/ and lifecycle-management docs
- Talos source constants (`ApidPort = 50000`): https://pkg.go.dev/github.com/siderolabs/talos/pkg/machinery/constants
- Talos GitHub discussion #9193 (resetting to maintenance mode): https://github.com/siderolabs/talos/discussions/9193
- Talos QEMU provisioner / `talosctl cluster` scope: https://www.talos.dev/v1.11/talos-guides/install/local-platforms/qemu/

## Issues Found
- **"Discovering Nodes" section incorrectly recommended `talosctl cluster show` for discovering maintenance-mode nodes on a network.** `talosctl cluster show` only reports on clusters created locally via `talosctl cluster create` (Docker/QEMU provisioners) — it reads local provisioner state and does not scan the network. I rewrote the paragraph to make clear there is no built-in discovery command and to suggest checking the DHCP lease table or scanning the subnet with `nmap -p 50000`, which was already shown.

## Review Notes
- `talosctl reset --system-labels-to-wipe STATE` is verified: wiping STATE removes the machine config and reboots into maintenance mode while leaving EPHEMERAL intact. The flag is a string slice and can be passed multiple times, so the `STATE` + `EPHEMERAL` example in the "Changing Node Role" section is valid.
- The default `talosctl reset` (no `--system-labels-to-wipe`) wipes both STATE and EPHEMERAL and reboots into maintenance mode — the "Method 2: Full Reset" description is accurate.
- Port 50000 / apid claim is confirmed against the Talos `constants` package.
- `talosctl get machinestatus|addresses|links --insecure` are valid resource queries against a maintenance-mode node.
- `talosctl etcd remove-member <member-id>` accepts a positional argument; modern Talos releases also accept a member hostname. Either form is correct.
- Booting from a Talos ISO always enters maintenance mode because the ISO is stateless — accurate as written. (Note: if Talos is already installed to disk and the BIOS boots from disk rather than the ISO, it will boot the installed config; this is implicit in "Boot from ISO".)
- Minor future improvement (not a defect): in newer Talos versions the `--wipe-mode` flag (`all`, `system-disk`, `user-disks`) is the more idiomatic way to control what is wiped; `--system-labels-to-wipe` still works but is being de-emphasized in docs. The post's usage remains correct for current releases.
