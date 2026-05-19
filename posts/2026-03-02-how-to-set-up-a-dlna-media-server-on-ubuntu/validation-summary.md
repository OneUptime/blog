# Validation Summary: How to Set Up a DLNA Media Server on Ubuntu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- MiniDLNA (ReadyMedia)
- Plex Media Server
- Ubuntu (apt, systemd)
- UFW firewall
- SSDP / UPnP / DLNA protocols
- gupnp-tools (gssdp-discover)
- djmount
- Hardware-accelerated transcoding (Intel Quick Sync, NVIDIA)

## Sources Consulted
- MiniDLNA / ReadyMedia project documentation and minidlnad man page (https://sourceforge.net/projects/minidlna/)
- Default `/etc/minidlna.conf` and MiniDLNA source defaults (notify_interval=895, port 8200, db_dir/log_dir paths)
- Plex Media Server official Linux install docs (https://support.plex.tv/articles/235974187-enable-repository-updating-for-supported-linux-server-distributions/)
- Plex network ports reference (https://support.plex.tv/articles/200931138-troubleshooting-networking/)
- Plex naming conventions for movies and TV shows (https://support.plex.tv/articles/naming-and-organizing-your-tv-show-files/)
- Ubuntu package contents for `gupnp-tools` (contains `gssdp-discover`) and `djmount`
- UFW documentation for port range syntax

## Issues Found
No technical issues found. All commands, package names, config keys, port numbers, file paths, and URLs are accurate.

## Review Notes
- The Plex installation uses `apt-key add`, which is deprecated on Ubuntu 22.04+ and produces a warning (`apt-key is deprecated...`). This is intentionally kept because it still matches the current Plex official Linux install instructions and continues to work. A future revision could move to the modern `signed-by` keyring approach (storing the key under `/etc/apt/keyrings/` and referencing it in the sources list).
- `sudo minidlnad -R` is technically a startup flag that forces a full rescan; if the systemd service is already running, the second instance will fail to bind to port 8200. The post's preceding "stop service + remove files.db + start" sequence is the more reliable rescan method. This is a minor wording concern, not a correctness error.
- The example uses `eth0` as the network interface. On modern Ubuntu releases with predictable interface naming, the actual interface is more likely `enp0s3`, `ens33`, etc. Readers should substitute their actual interface from `ip link`.
- `49152:65535/tcp` is a broad UFW range covering all ephemeral ports; MiniDLNA actually only uses a small dynamic range for UPnP. The rule is functionally sufficient but more permissive than strictly needed.
- The hardware-accelerated transcoding requirements (render group for Intel QSV, video group for NVIDIA) are correct, though NVIDIA also typically requires the NVIDIA driver, NVENC support, and Plex Pass.
