# Validation Summary: How to Install Plex Media Server on Ubuntu

## Status
validated

## Post Type
Tutorial / Guide (step-by-step installation and configuration walkthrough)

## Technologies Covered
- Plex Media Server (APT repository install on Ubuntu)
- Ubuntu (20.04 / 22.04 / 24.04 LTS), systemd
- UFW firewall, router port forwarding
- Intel Quick Sync / VA-API hardware transcoding
- NVIDIA NVENC/NVDEC, NVIDIA Container Toolkit
- Nginx reverse proxy, Let's Encrypt / Certbot
- SQLite (database repair)
- Tautulli (Plex monitoring)
- Bash scripting, cron, tar backups

## Sources Consulted
- Plex official APT install docs — https://support.plex.tv/articles/200288586-installation/ (HTTP 403 on direct fetch; verified GPG key URL `downloads.plex.tv/plex-keys/PlexSign.key` and repo line `deb ... downloads.plex.tv/repo/deb public main` against the long-standing official method)
- Plex network ports reference — https://support.plex.tv/articles/201543147-what-network-ports-do-i-need-to-allow-through-my-firewall/ (32400/TCP, 1900/UDP, 3005/TCP, 5353/UDP, 8324/TCP, 32410/32412-32414/UDP, 32469/TCP)
- NVIDIA Container Toolkit install guide — https://docs.nvidia.com/datacenter/cloud-native/container-toolkit/latest/install-guide.html
- Nginx proxy / WebSocket and `listen ... http2` documentation — https://nginx.org/en/docs/

## Issues Found
1. **Deprecated NVIDIA Container Toolkit installation method (NVIDIA GPU section).** The post used `apt-key add -` together with the legacy `nvidia.github.io/nvidia-docker/` repository URLs. `apt-key` is deprecated and removed on current Ubuntu releases, and the `nvidia-docker` repo path is the old location. **Fix:** Replaced with the current official method — `gpg --dearmor` into `/usr/share/keyrings/nvidia-container-toolkit-keyring.gpg` and the signed `libnvidia-container/stable/deb/nvidia-container-toolkit.list` repository, matching NVIDIA's documentation.
2. **`intel_gpu_top` invoked without installing its package.** The "Verify Hardware Transcoding" section ran `sudo intel_gpu_top`, but that binary ships in the `intel-gpu-tools` package, which the post never installs (it would fail with "command not found"). **Fix:** Added `sudo apt install intel-gpu-tools -y` immediately before the command, consistent with how the post installs `vainfo`.

## Review Notes
- `listen 443 ssl http2;` is the older Nginx directive syntax (deprecated in favor of a separate `http2 on;` directive since Nginx 1.25.1). It still works with a deprecation warning, and Certbot-managed configs commonly use it, so it was left as-is.
- Installing `nvidia-cuda-toolkit` for NVENC/NVDEC transcoding is unnecessary overhead — NVENC support ships with the proprietary driver and does not require the full CUDA toolkit. Not incorrect, just heavier than needed; left unchanged.
- The Plex GDM firewall rule uses a `32410:32414/udp` range, which includes 32411 (not an official Plex port). This is harmless and simplifies the rule, so it was left as-is.
- All file paths (`/var/lib/plexmediaserver/Library/Application Support/Plex Media Server/`, `Preferences.xml`, `Plug-in Support/Databases/com.plexapp.plugins.library.db`), the systemd service name, the web UI path (`/web`), the SQLite repair sequence, the backup/restore script, and the Nginx Plex header set are all accurate and current.
