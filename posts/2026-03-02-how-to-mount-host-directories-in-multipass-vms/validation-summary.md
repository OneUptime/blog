# Validation Summary: How to Mount Host Directories in Multipass VMs

## Status
validated

## Post Type
Tutorial / How-to guide

## Technologies Covered
- Multipass (Canonical's VM manager)
- SSHFS (classic mount backend)
- 9P / SMB (native mount backends)
- Ubuntu 24.04 cloud images
- Bash scripting
- Node.js / npm (workflow example)

## Sources Consulted
- Multipass mount explanation: https://documentation.ubuntu.com/multipass/en/latest/explanation/mount/
- `multipass mount` CLI reference: https://documentation.ubuntu.com/multipass/en/latest/reference/command-line-interface/mount/
- `multipass umount` CLI reference: https://documentation.ubuntu.com/multipass/en/latest/reference/command-line-interface/umount/
- `multipass launch` CLI reference: https://documentation.ubuntu.com/multipass/en/latest/reference/command-line-interface/launch/
- `multipass info` CLI reference: https://documentation.ubuntu.com/multipass/en/latest/reference/command-line-interface/info/
- Canonical Multipass source (src/client/cli/cmd/mount.cpp): https://github.com/canonical/multipass
- multipass-sshfs snap: https://github.com/canonical/multipass-sshfs
- Mount persistence fix (1.12.0): https://github.com/canonical/multipass/issues/2986 and PR #3009

## Issues Found

1. **"Multipass uses ... SSHFS" was incomplete/outdated.** Multipass supports two mount types: `classic` (SSHFS, the default) and `native` (9P on QEMU, SMB on Hyper-V). Rewrote the "How Multipass Mounts Work" section to describe both types and mention the `--type` flag, and removed the bullet claiming "both read-write and read-only mounts" since `--readonly` is not a valid flag.

2. **`--readonly` flag does not exist on `multipass mount`.** Checked against the upstream source (`src/client/cli/cmd/mount.cpp`) — only `--type`, `--uid-map`, `--gid-map`, `--help`, `--verbose` are implemented. Rewrote the "Read-Only Mounts" section to describe the actual workarounds (host-side `chmod`, or guest-side `mount -o remount,ro`). Removed `--readonly` from the helper script at the bottom of the post.

3. **"Mount Disappears After VM Restart" claim was wrong.** Mounts added with either `multipass mount` or `multipass launch --mount` are persisted to the instance config and re-applied on start (the long-standing bug where this didn't happen was fixed in Multipass 1.12.0). Rewrote the section to describe how to recover when a mount fails to re-attach (e.g., host path moved), rather than claiming non-launch mounts are non-persistent.

4. **sshfs install command was wrong package.** Multipass uses the `multipass-sshfs` snap (auto-installed in the guest), not the Debian `sshfs` apt package. Updated the troubleshooting command from `sudo apt install -y sshfs` to `sudo snap install multipass-sshfs` and clarified when manual install is needed.

5. **Helper script cleanup.** Removed the `:ro` mount entries and `--readonly` branch in the helper script (consequent to issue #2). Simplified the loop and made it idempotent.

## Review Notes

- `multipass umount <vm>` (no path) does unmount all mounts on that VM — verified against docs.
- `--uid-map host:vm` and `--gid-map host:vm` syntax is correct.
- `multipass launch --mount <host>:<target>` is correct; the post no longer makes any specific version-introduction claim (which is good — Canonical's release notes don't pin a single version for this flag).
- `multipass info <vm> | grep IPv4` works because the default human-readable output has an `IPv4:` field. For scripted use, `--format json` would be more robust, but the grep approach is acceptable for a quick check.
- The native vs. classic mount distinction is worth a future expansion — on Linux/QEMU, native mounts via 9P can be considerably faster for some workloads.
- The author's advice to keep `node_modules` inside the VM rather than mounting it from the host remains good practice for classic (SSHFS) mounts and is generally recommended even for native mounts.
