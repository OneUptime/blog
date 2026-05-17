# Validation Summary: How to Install Ubuntu Server on VirtualBox for Local Testing

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- VirtualBox 7.x (hypervisor)
- VirtualBox Extension Pack
- Ubuntu Server 24.04 LTS
- VBoxManage CLI
- VirtualBox Guest Additions
- VirtualBox networking modes (NAT, Bridged, Host-only, Internal)
- VirtualBox shared folders (vboxsf)
- Snapshots and VM cloning
- Homebrew (macOS package manager)
- APT (Debian/Ubuntu package manager)

## Sources Consulted
- VirtualBox official downloads page (https://www.virtualbox.org/wiki/Downloads) — current version is 7.2.x
- Oracle VirtualBox APT repository (https://download.virtualbox.org/virtualbox/debian) — verified available packages (`virtualbox-7.0`, `virtualbox-7.1`, `virtualbox-7.2`)
- Homebrew Cask API (https://formulae.brew.sh/api/cask.json) — verified available casks for VirtualBox
- VBoxManage manual (https://www.virtualbox.org/manual/ch08.html) — verified CLI syntax for `modifyvm --natpf1`, `snapshot`, `clonevm`, `startvm --type headless`, `controlvm acpipowerbutton/poweroff`, `extpack install`
- Ubuntu Server installation documentation — verified default network interface names (`enp0s3`, `enp0s8`) for VirtualBox NAT and Host-only adapters
- VirtualBox Guest Additions documentation — verified package names (`virtualbox-guest-utils`) and shared folder mount paths (`/media/sf_<name>`)

## Issues Found

1. **Outdated APT package name (`virtualbox-7.0`)** — As of 2026-05, the current VirtualBox version is 7.2.x. The Oracle APT repository ships `virtualbox-7.0`, `virtualbox-7.1`, and `virtualbox-7.2` packages side-by-side. Changed `sudo apt install virtualbox-7.0` to `sudo apt install virtualbox-7.2` so new users install the current supported version.

2. **Non-existent Homebrew cask `virtualbox-extension-pack`** — Verified against the Homebrew Cask API: only `virtualbox`, `virtualbox@6`, and `virtualbox@beta` casks exist. There is no `virtualbox-extension-pack` cask (a GitHub search across the entire `Homebrew/homebrew-cask` repo returned zero matches). The line `brew install --cask virtualbox-extension-pack` would fail with "Cask not found". Replaced with instructions to download the `.vbox-extpack` file from virtualbox.org and install it via `VBoxManage extpack install` or by double-clicking the file in the GUI.

## Review Notes
- The `VBoxManage --natpf1 "ssh,tcp,,2222,,22"` port-forwarding syntax is correct (`name,proto,hostip,hostport,guestip,guestport` with empty IP fields meaning "all interfaces").
- The default Ubuntu Server network interface names `enp0s3` (NAT) and `enp0s8` (Host-only) are correct for VirtualBox's default PCI slot assignments.
- The Oracle VirtualBox GPG key URL (`oracle_vbox_2016.asc`) is still the current signing key used by the APT repository as of 2026.
- The post correctly notes that VirtualBox 7.x removed the separate "Acceleration" tab — the "Enable VT-x/AMD-V" wording is slightly dated terminology (in 7.x the checkbox under Processor is "Enable Nested VT-x/AMD-V" for nested virtualization), but the practical advice to enable hardware virtualization in BIOS/UEFI remains correct, so left as-is.
- `virtualbox-guest-utils` from Ubuntu's repositories is correct; users wanting full DKMS-built modules can also install `virtualbox-guest-dkms`, but on modern kernels the `vboxguest`/`vboxsf` modules are available out of the box.
- The `--options Link` (capitalized) in the linked-clone example works because VBoxManage accepts the value case-insensitively, though the official manual uses lowercase `link`.
