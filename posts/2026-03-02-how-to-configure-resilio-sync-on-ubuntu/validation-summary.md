# Validation Summary: How to Configure Resilio Sync on Ubuntu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ubuntu
- Resilio Sync
- APT package repositories
- systemd user and system services
- JSON configuration
- UFW firewall rules
- Resilio Sync WebUI and API v2

## Sources Consulted
- Resilio Sync: Installing Sync package on Linux - https://help.resilio.com/hc/en-us/articles/206178924-Installing-Sync-package-on-Linux
- Resilio Sync: Running Sync in configuration mode - https://help.resilio.com/hc/en-us/articles/206178884-Running-Sync-in-configuration-mode
- Resilio Sync: Guide to Linux, and Sync peculiarities - https://help.resilio.com/hc/en-us/articles/204762449-Guide-to-Linux-and-Sync-peculiarities
- Resilio Sync: Configuring WebUI - https://help.resilio.com/hc/en-us/articles/115001184490-Configuring-WebUI
- Resilio Sync: What ports and protocols are used by Sync? - https://help.resilio.com/hc/en-us/articles/204754759-What-ports-and-protocols-are-used-by-Sync
- Resilio Sync: Ignoring files in Sync (Ignore List) - https://help.resilio.com/hc/en-us/articles/205458165-Ignoring-files-in-Sync-Ignore-List
- Resilio Sync: What is '.sync' folder, and StreamsList, IgnoreList and Archive inside? - https://help.resilio.com/hc/en-us/articles/206217185-What-is-sync-folder-and-StreamsList-IgnoreList-and-Archive-inside
- Resilio Sync: Key structure and flow - https://help.resilio.com/hc/en-us/articles/206767810-Key-structure-and-flow
- Resilio Sync: Sync Share Dialog (Desktop) - https://help.resilio.com/hc/en-us/articles/204790709-Sync-Share-Dialog-Desktop
- Resilio Sync: FAQ Resilio Sync 3.0.0 - https://help.resilio.com/hc/en-us/articles/32109883606035-FAQ-Resilio-Sync-3-0-0
- Resilio Sync: Important before updating to Resilio Sync 3.0.0 - https://help.resilio.com/hc/en-us/articles/31193941051795-Important-before-updating-to-Resilio-Sync-3-0-0
- Resilio Sync product page - https://www.resilio.com/sync/
- Resilio Sync forum note on API v2 POST token/cookie requirements - https://forum.resilio.com/topic/42523-add-folder-api-v2/

## Issues Found
- The introduction described an older free-tier limitation model and claimed mobile selective sync was unavailable. Resilio Sync v3 makes former Pro features available for personal non-commercial use and documents Selective Sync as fully available in v3, so the licensing/feature sentence was updated.
- The APT signing-key command used `apt-key`, which is deprecated and no longer the current documented approach for newer Ubuntu releases. Updated it to install `key.asc` under `/etc/apt/trusted.gpg.d/resilio-sync.asc`, matching Resilio's current Linux package instructions.
- The "run as your own user" instructions edited the packaged system service under `/lib/systemd/system`. Resilio's current Linux instructions recommend disabling the default service and enabling the packaged per-user systemd unit instead. Updated the commands accordingly and included `loginctl enable-linger` for headless servers.
- The direct per-user `rslsync --config` example ran the daemon before creating the config file. Reordered the example so the config is created first.
- The WebUI URL and settings label were slightly off from Resilio's Linux/WebUI docs. Updated the browser URL to `http://localhost:8888/gui/` and changed the settings label to `Settings -> WebUI`.
- The Standard Folder Setup section listed an "Approval key". Resilio documents Standard folder keys as key-based sharing without approval, with approval applying to sharing links. Replaced it with the documented encrypted key and clarified the key-versus-link behavior.
- The config-file section did not mention that defining `shared_folders` in config mode disables WebUI management of those shares. Added a brief caveat from Resilio's configuration-mode docs.
- The API section described API v2 as undocumented. Resilio's changelog and support material refer to API v2, though complete current API documentation is not prominent. Reworded this to avoid the inaccurate claim.
- The CLI key-management section used an undocumented `--get-deviceid` option and a POST API example that omitted API v2's token/cookie requirement for non-GET requests. Replaced it with the documented `--generate-secret` and `--get-ro-secret` CLI options.

## Review Notes
The guide remains technically relevant. The Resilio Sync v3 package guidance is current for personal non-commercial use, while Resilio's Linux package page notes that Sync Business users should remain on v2.8.1 rather than upgrading to v3.
