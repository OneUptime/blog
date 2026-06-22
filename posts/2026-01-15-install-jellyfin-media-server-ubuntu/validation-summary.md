# Validation Summary: How to Install Jellyfin Media Server on Ubuntu

## Status
validated

## Post Type
Tutorial / Guide (step-by-step installation and configuration walkthrough)

## Technologies Covered
- Jellyfin Media Server
- Ubuntu (20.04 / 22.04 / 24.04 LTS)
- APT package management and repository signing (GPG)
- Docker / Docker Compose
- Intel VAAPI / Quick Sync hardware transcoding
- NVIDIA NVENC / NVIDIA Container Toolkit
- Nginx reverse proxy + Let's Encrypt (Certbot)
- systemd service management
- Bash scripting / cron (backup automation)
- Jellyfin REST API

## Sources Consulted
- Jellyfin Manual Installation docs — https://jellyfin.org/docs/general/installation/advanced/manual/
- Jellyfin "Please refresh your Jellyfin Apt key" post — https://jellyfin.org/posts/jellyfin-apt-key/
- Jellyfin NVIDIA Hardware Acceleration docs — https://jellyfin.org/docs/general/post-install/transcoding/hardware-acceleration/nvidia/
- Jellyfin Hardware Acceleration overview — https://jellyfin.org/docs/general/post-install/transcoding/hardware-acceleration/

## Issues Found
1. **Incorrect Jellyfin GPG key URL.** The post downloaded the signing key from `https://repo.jellyfin.org/ubuntu/jellyfin_team.gpg.key` (with a `/ubuntu/` path segment). The official, authoritative key URL is `https://repo.jellyfin.org/jellyfin_team.gpg.key` — a single key that signs both the Debian and Ubuntu repositories, with no OS subdirectory. The incorrect path would return no key content, leaving an empty keyring and causing the subsequent `apt update` to fail with an unsigned-repository error. **Fix:** Changed the `curl` URL to `https://repo.jellyfin.org/jellyfin_team.gpg.key`. The keyring output path (`/usr/share/keyrings/jellyfin.gpg`) and the matching `signed-by=` value in the deb line were left unchanged as they are internally consistent and valid.

## Review Notes
- The post stores the keyring in `/usr/share/keyrings/jellyfin.gpg` while current official docs use `/etc/apt/keyrings/jellyfin.gpg`. Both locations are valid for `signed-by` keyrings, and the post is internally consistent (same path in the curl command and the deb line), so no change was needed.
- The repository entry uses the classic one-line `.list` format (`deb [signed-by=...] .../ubuntu $(lsb_release -cs) main`). Official docs now favor the DEB822 `.sources` format, but the one-line format remains fully supported by APT — not an error.
- The NVIDIA Compose snippet uses `capabilities: [gpu, video]`; `video` is a valid NVIDIA container capability and works. The official example uses `capabilities: [gpu]` plus an explicit `runtime: nvidia`. Since the post runs `nvidia-ctk runtime configure` and uses the Compose `deploy.resources.reservations.devices` device-request mechanism, the configuration is workable; adding `runtime: nvidia` could be a future robustness improvement but is not required.
- `version: "3.8"` in the Compose file is an obsolete (ignored) attribute in current Docker Compose v2 and will emit a harmless warning. Left as-is since it does not affect functionality.
- Driver/package guidance is accurate: `intel-media-va-driver` (iHD, newer Intel) vs `i965-va-driver` (older Intel) and `nvidia-driver-535` with a 520+/525+ note align with Jellyfin's minimum NVIDIA driver requirement (520.56.06 for 10.11).
- The Jellyfin API example (`POST /Users/New` with `Authorization: MediaBrowser Token=...`) reflects the real API surface and is illustrative.
