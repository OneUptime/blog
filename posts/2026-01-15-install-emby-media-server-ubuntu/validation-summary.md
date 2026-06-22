# Validation Summary: How to Install Emby Media Server on Ubuntu

## Status
validated

## Post Type
Tutorial / Installation and configuration guide

## Technologies Covered
- Emby Media Server (Linux/Ubuntu deb package)
- Ubuntu 20.04/22.04/24.04 LTS
- APT package management and repository configuration
- systemd service management
- UFW firewall
- VAAPI / Intel Quick Sync, NVIDIA NVENC, AMD Mesa hardware transcoding
- ffmpeg
- NGINX reverse proxy + Certbot/Let's Encrypt
- HDHomeRun / Live TV / DVR
- Bash scripting and cron (backup automation)

## Sources Consulted
- Emby APT repository setup (official): https://emby.media/support/articles/misc/downloads/Emby-Pkg-APT.html
- Emby Package Repository docs: https://emby.media/support/articles/misc/downloads/Emby-Package-Repository.html
- Emby Server for Linux: https://emby.media/linux-server.html
- Emby Log Files docs: https://github.com/EmbySupport/Emby.Docs/blob/master/Log-Files.md
- NVIDIA Container Toolkit install guide: https://docs.nvidia.com/datacenter/cloud-native/container-toolkit/latest/install-guide.html

## Issues Found
1. **Incorrect/outdated Emby apt repository and GPG key (showstopper).** The post used `https://download.emby.media/linux/gpg/keys/emby.gpg` for the key and `deb ... https://download.emby.media/linux/repos/apt/ubuntu $(lsb_release -cs) main` for the source. The official Emby apt repository is hosted at `https://pkg.emby.media/apt/`, the public key is at `https://pkg.emby.media/keys/emby-public.gpg`, and the repository is distribution-agnostic using the `stable` suite (not a per-release codename). The original commands would fail (`apt update` could not reach the repo). Rewrote Step 1 to follow the official documented procedure: install the key into `/etc/apt/keyrings/emby-public.gpg` and download the official `emby.sources` deb822 source file into `/etc/apt/sources.list.d/`.

2. **Wrong NVIDIA package for Docker GPU passthrough.** The NVIDIA section installed `nvidia-cuda-toolkit` while the comment said "Install NVIDIA container toolkit for Docker deployments." `nvidia-cuda-toolkit` is the CUDA compiler toolkit, not the container runtime. Changed the package to `nvidia-container-toolkit` and added a note that it comes from NVIDIA's own repository, which must be added first.

3. **Incorrect Emby log file path (4 occurrences).** The post referenced `/var/log/emby-server.log`. Emby's Linux deb install writes logs to its data directory; the current log file is `embyserver.txt` under `/var/lib/emby/logs/`. Replaced all four references with `/var/lib/emby/logs/embyserver.txt` so the `tail`/`grep` commands actually target a real file.

## Review Notes
- The `journalctl -u emby-server` commands for log inspection are reliable regardless of the on-disk log path and remain accurate.
- Ports are correct: 8096 (HTTP), 8920 (HTTPS), 1900/udp (SSDP/DLNA), 7359/udp (Emby client auto-discovery).
- The Emby-vs-alternatives feature table is a reasonable summary of the licensing/feature split (Emby server is closed-source with premium-gated hardware transcoding/Live TV; Jellyfin is fully open with those features free).
- `nvidia-driver-535` is a valid driver package but is somewhat dated; readers may prefer the version reported by `ubuntu-drivers devices`. The post already shows that command, so this is a non-blocking caveat, not an error.
- Default paths (`/var/lib/emby`, `system.xml`, `emby` service user, data/config/plugins/metadata subdirectories) match the official deb layout.
- The NGINX reverse proxy config, VAAPI/NVENC/AMD driver packages (`intel-media-va-driver-non-free`, `mesa-va-drivers`, `vainfo`), HDHomeRun (`hdhomerun-config`) commands, and the ffmpeg VAAPI test command are all syntactically and functionally correct.
