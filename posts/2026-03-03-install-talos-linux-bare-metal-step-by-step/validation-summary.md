# Validation Summary: How to Install Talos Linux on Bare Metal Step by Step

## Status
validated

## Post Type
Tutorial / Step-by-step Installation Guide

## Technologies Covered
- Talos Linux
- talosctl (CLI)
- Kubernetes
- kubectl
- etcd, CoreDNS, kube-proxy (core Kubernetes components)
- dd (USB imaging)
- Homebrew (talosctl install on macOS)
- Cilium / Flannel (CNI plugins, mentioned in conclusion)
- Rook-Ceph / Longhorn (storage, mentioned in conclusion)

## Sources Consulted
- Talos Linux GitHub releases page asset list: https://github.com/siderolabs/talos/releases (verified via `gh release view --repo siderolabs/talos`)
- Talos Linux v1.12 talosctl installation docs: https://docs.siderolabs.com/talos/v1.12/getting-started/talosctl
- Talos Linux v1.12 CLI reference (for `talosctl gen config` flags): https://docs.siderolabs.com/talos/v1.12/reference/cli
- Talos Image Factory: https://factory.talos.dev

## Issues Found
- **Incorrect ISO filename in Step 1 download URL.** The post referenced `talos-amd64.iso`, but the actual Talos Linux GitHub release asset for the bare metal x86_64 ISO is named `metal-amd64.iso`. Verified by listing the release assets directly. Fixed the `curl -LO` URL in Step 1 and the two subsequent `dd if=...` references in Step 2 (Linux and macOS variants) to use `metal-amd64.iso`.

## Review Notes
- The `curl -sL https://talos.dev/install | sh` script is valid but is documented as an *alternative*; the official primary install recommendation is now Homebrew (`brew install siderolabs/tap/talosctl`) for both macOS and Linux. The post already shows both, so this is fine.
- The `--config-patch-control-plane` flag is correct and current per the v1.12 CLI reference.
- The `--insecure` flag with `talosctl apply-config` for maintenance-mode nodes is correct.
- `bs=4m` (lowercase) on macOS vs `bs=4M` (uppercase) on Linux is intentional and correct — BSD `dd` (macOS) uses lowercase suffixes while GNU `dd` (Linux) uses uppercase.
- Talos ships with Flannel as the default CNI, so the wording "if one is not already configured" in the "What Comes Next" section is appropriately hedged.
- No version pinning in the post — using `releases/latest/download/...` will always grab the newest release, which keeps the guide evergreen but means readers should be aware their `talosctl` version should match the Talos version they install.
