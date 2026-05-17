# Validation Summary: How to Install Ubuntu Server 24.04 LTS Step by Step

## Status
validated

## Post Type
Tutorial / Step-by-step installation guide

## Technologies Covered
- Ubuntu Server 24.04 LTS (Noble Numbat)
- Subiquity installer
- `dd` (Linux/macOS ISO writing)
- Rufus / balenaEtcher (Windows ISO writing)
- GRUB bootloader
- UEFI / Secure Boot
- Netplan (network configuration)
- LVM (Logical Volume Manager)
- GPT partitioning, ext4, fat32, swap
- OpenSSH server, `ssh-import-id` (GitHub/Launchpad key import)
- Snap packages (Docker, MicroK8s, Nextcloud)
- APT package management
- systemd / `systemctl`
- `timedatectl`
- UFW (Uncomplicated Firewall)
- `unattended-upgrades`

## Sources Consulted
- Ubuntu 24.04 LTS Noble Numbat release notes — https://discourse.ubuntu.com/t/ubuntu-24-04-lts-noble-numbat-release-notes/39890
- Ubuntu Server system requirements — https://ubuntu.com/server/docs/system-requirements
- Ubuntu Pro / ESM — https://ubuntu.com/security/esm
- Subiquity screen-by-screen walkthrough — https://canonical-subiquity.readthedocs-hosted.com/en/latest/tutorial/screen-by-screen.html
- Ubuntu Noble download index (current point release) — https://releases.ubuntu.com/noble/
- AutomaticSecurityUpdates — https://help.ubuntu.com/community/AutomaticSecurityUpdates
- UFW application profiles — Ubuntu Server documentation

## Issues Found
- **ISO filename was outdated.** The `dd` example used `ubuntu-24.04-live-server-amd64.iso`, which does not match the actual filename users download today. Canonical now ships point releases (current is 24.04.4) and `ubuntu.com/download/server` serves `ubuntu-24.04.4-live-server-amd64.iso`. Updated the example to reference `ubuntu-24.04.4-live-server-amd64.iso` and added an inline comment telling readers to substitute the point release they downloaded.

## Review Notes
- The stated minimum requirements (2 GB RAM, 20 GB disk) are stricter than Canonical's documented bare minimums (~1 GB RAM, ~5 GB disk) but are a sensible practical recommendation for a real-world server — left as-is.
- On Ubuntu 24.04, `ssh.service` is socket-activated via `ssh.socket` by default. `sudo systemctl status ssh` still works correctly, but for restarts/reloads users may need to interact with `ssh.socket`. Not corrected since the post only uses `status`, which behaves as documented.
- The featured snaps list (Docker, MicroK8s, Nextcloud) varies by installer version; the post already qualifies with "and others", so no change needed.
- `unattended-upgrades` is typically pre-installed on Ubuntu Server, so `apt install` is a safe no-op rather than strictly required — accurate as written.
- `lsb_release` requires the `lsb-release` package, which is installed by default on Ubuntu Server 24.04, so the command works out of the box.
