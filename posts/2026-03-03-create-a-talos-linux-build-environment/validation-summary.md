# Validation Summary: How to Create a Talos Linux Build Environment

## Status
validated

## Post Type
Tutorial / Setup Guide

## Technologies Covered
- Talos Linux (siderolabs/talos)
- Docker (engine and daemon configuration)
- Go (toolchain installation)
- talosctl (CLI)
- crane (go-containerregistry)
- kubectl
- Helm
- QEMU / libvirt / OVMF
- multiarch/qemu-user-static (cross-platform builds)
- VS Code (Go extension) / GoLand
- Ubuntu apt packaging

## Sources Consulted
- Talos main Makefile: https://raw.githubusercontent.com/siderolabs/talos/main/Makefile (verified Makefile targets `talosctl`, `initramfs`, `kernel`, `installer`; verified env vars `TAG`, `REGISTRY`, `ARCH`, `PLATFORM`; verified `GO_VERSION ?= 1.26`)
- talosctl installation docs: https://docs.siderolabs.com/talos/v1.10/getting-started/talosctl (verified `curl -sL https://talos.dev/install | sh`)
- Go downloads: https://go.dev/dl/ (verified current stable Go 1.26.3)
- Docker install script: https://get.docker.com (verified official)
- kubectl install: https://dl.k8s.io/release/stable.txt (verified canonical pattern)
- Helm install: https://raw.githubusercontent.com/helm/helm/main/scripts/get-helm-3 (verified official)
- siderolabs/talos GitHub repo URL

## Issues Found
- **Outdated Go version**: The post pinned `GO_VERSION=1.22.0`. The current main Talos branch sets `GO_VERSION ?= 1.26` in its Makefile, and the latest Go stable release is 1.26.3. Building current Talos with Go 1.22 would fail because of module language-version requirements. Updated to `GO_VERSION=1.26.3` to match what Talos main and the upstream Go release stream require.

## Review Notes
- The Docker `default-address-pools` entry `172.17.0.0/12` is not a canonically-aligned CIDR (a /12 starting on 172.16.0.0 would be canonical), but Docker normalizes the address internally so the daemon still starts. Worth noting it overlaps with Docker's default bridge subnet (`172.17.0.0/16`); operators may want to choose a non-overlapping pool such as `172.20.0.0/16` in production setups. Left as written since it does not break the daemon.
- `make kernel` actually builds the Linux kernel package; for most Talos contributors the prebuilt kernel from `siderolabs/pkgs` is pulled automatically, so end users rarely need to invoke `make kernel` themselves. The post's claim that it "takes the longest" is accurate when it is run.
- The `go install github.com/siderolabs/talos/cmd/talosctl@latest` path is valid, but Talos's officially recommended install method is the `talos.dev/install` script or Homebrew. The post correctly presents `go install` only as an alternative for developers.
- talosctl version should match the Talos cluster version; the post does not mention this, but this is a usage detail rather than a technical inaccuracy in the build setup itself.
- The `qemu-system-x86`, `libvirt-daemon-system`, `libvirt-clients`, and `ovmf` package names are correct for Ubuntu 22.04+.
