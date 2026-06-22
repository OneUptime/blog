# Validation Summary: How to Install Sonarr and Radarr on Ubuntu

## Status
validated

## Post Type
Tutorial / Guide (step-by-step installation and configuration walkthrough)

## Technologies Covered
- Sonarr (TV PVR, v4)
- Radarr (movie management)
- Prowlarr (indexer manager)
- Ubuntu (apt, systemd, UFW)
- Nginx reverse proxy
- Certbot / Let's Encrypt
- SABnzbd and qBittorrent (download clients)
- SQLite (database recovery)

## Sources Consulted
- Servarr Wiki — Radarr Linux Installation: https://wiki.servarr.com/radarr/installation/linux
- Servarr Wiki — Sonarr Linux Installation: https://wiki.servarr.com/sonarr/installation/linux
- Servarr Wiki — Prowlarr Linux Installation: https://wiki.servarr.com/prowlarr/installation/linux
- Official Servarr install script (defines install dirs, data dirs, user/group, ports): https://raw.githubusercontent.com/Servarr/Wiki/master/servarr/servarr-install-script.sh
- Official Sonarr v4 install script: https://raw.githubusercontent.com/Sonarr/Sonarr/develop/distribution/debian/install.sh
- Sonarr GitHub issue #4620 (Mono → .NET migration): https://github.com/Sonarr/Sonarr/issues/4620
- Sonarr official site: https://sonarr.tv/

## Issues Found
1. **Incorrect Mono claim (fixed).** The post stated "Sonarr requires Mono runtime on Ubuntu." Sonarr v4 is written in .NET and Mono is no longer supported as of v4.0. Replaced with an accurate statement that Sonarr v4 runs on .NET and Mono is not required.

2. **Non-existent Sonarr apt repository (fixed).** The post installed Sonarr via the `apt.sonarr.tv` repository with a GPG key and `apt install sonarr`. That repository only served Sonarr v3; the official method for v4 is the install script at `https://raw.githubusercontent.com/Sonarr/Sonarr/develop/distribution/debian/install.sh`. Replaced the repository/`apt install` steps with the official install-script commands.

3. **Non-existent Radarr apt repository (fixed).** The post used a fabricated repository `https://apt.radarr.video/ubuntu` and `apt install radarr`. The Servarr Wiki explicitly states there is **no apt repository or deb package** for Radarr. Replaced with the official Servarr install script (`servarr-install-script.sh`), selecting Radarr.

4. **Non-existent Prowlarr apt repository (fixed).** The post used a fabricated repository `https://apt.prowlarr.com/ubuntu` and `apt install prowlarr`. Prowlarr has no apt repository either. Replaced with the official Servarr install script, selecting Prowlarr.

After the fixes, the data directories (`/var/lib/sonarr`, `/var/lib/radarr`, `/var/lib/prowlarr`), default service user/group (`sonarr`/`radarr`/`prowlarr` and group `media`), and ports (8989 / 7878 / 9696) referenced throughout the rest of the post all match what the official install scripts actually create, so the downstream sections (API keys, config.xml paths, base URL `sed` edits, backups, troubleshooting) remained accurate without further changes.

## Review Notes
- **Default ports** (Sonarr 8989, Radarr 7878, Prowlarr 9696, SABnzbd 8080, qBittorrent Web UI 8080) are correct.
- **Data/config paths** (`/var/lib/<app>/config.xml`, `<UrlBase>` default empty) are correct for the install-script-based setup.
- **Nginx reverse proxy** config (per-app `location` with matching base URL and WebSocket upgrade headers), **Certbot**, **UFW**, **SQLite recovery**, and **backup/restore** sections are all technically sound.
- The top-of-post dependency install (`gnupg`, `software-properties-common`, `apt-transport-https`) was originally justified by adding signed apt repositories. Since the install now uses scripts, those three packages are no longer strictly necessary (the scripts install their own prerequisites such as `sqlite3`), but installing them is harmless, so the command was left in place. Worth trimming in a future edit.
- **Language Profiles** section: Sonarr v4 removed the standalone "Language Profiles" feature (language handling moved into quality profiles / custom formats). The YAML there is illustrative pseudo-config rather than an executable command, so it was left as-is, but a future revision should reflect the v4 UI.
- The "WEB-720p" entry in the example quality ranking is a conceptual label; Sonarr's actual quality names are `WEBDL-720p` / `WEBRip-720p`. Left unchanged as it appears inside an explanatory comment, not config.
