# Validation Summary: How to Uninstall Rancher Desktop Completely

## Status
validated

## Post Type
Tutorial / Step-by-step Guide

## Technologies Covered
- Rancher Desktop
- `rdctl`
- macOS
- Windows
- Linux package management (`apt`, `zypper`, `dnf`)
- Windows Registry deployment profiles

## Sources Consulted
- Rancher Desktop Docs — Installation: https://docs.rancherdesktop.io/getting-started/installation/
- Rancher Desktop Docs — Troubleshooting: https://docs.rancherdesktop.io/ui/troubleshooting/
- Rancher Desktop Docs — Command Reference: `rdctl`: https://docs.rancherdesktop.io/references/rdctl-command-reference/
- Rancher Desktop Docs — Deployment Profiles: https://docs.rancherdesktop.io/getting-started/deployment/
- Rancher Desktop Docs — Application Environment / `~/.rd/bin`: https://docs.rancherdesktop.io/ui/preferences/application/environment/
- Microsoft Learn — `reg delete`: https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/reg-delete

## Issues Found
- The post was not actually an uninstall guide. It was a generic Rancher Desktop setup and usage walkthrough with unrelated sections for containers, Kubernetes, and Helm. I replaced those sections with actual uninstall steps based on official Rancher Desktop documentation.
- The draft included `rdctl` examples that do not match current official command documentation for this workflow, including `rdctl status` and `rdctl factory-reset`. I removed those and kept only commands that are documented and relevant to uninstalling, such as `rdctl version`, `rdctl shutdown`, and `rdctl list-settings`.
- The original article omitted the official `Factory Reset` step, which Rancher Desktop documents as the way to remove the cluster and Rancher Desktop settings before uninstall. I added that step and clarified its purpose.
- The original article omitted host-side cleanup paths. I added the documented Rancher Desktop data locations under `~/Library/Application Support/rancher-desktop`, `~/.local/share/rancher-desktop`, and `%LOCALAPPDATA%\\rancher-desktop`, plus cleanup for `~/.rd/bin` on macOS/Linux.
- The original article omitted deployment profiles. Rancher Desktop’s official docs explicitly state deployment profiles are not modified or removed by a factory reset or uninstall. I added the relevant registry, plist, and JSON cleanup instructions.
- The metadata contained a typo in the tags (`Window` instead of `Windows`) and the description implied the same runtime model across platforms. I corrected both for accuracy.

## Review Notes
- The official macOS and Windows uninstall instructions are GUI-based. The Linux uninstall instructions are package-manager specific and differ for `.deb`, `.rpm`, and AppImage installs.
- `rdctl list-settings`, `rdctl set`, and `rdctl shutdown` require the Rancher Desktop application to be running. The post now uses them only in pre-uninstall contexts where that requirement makes sense.
- Deployment profile locations are version-sensitive in the official docs. The macOS `/Library/Preferences/...` locations are described as backup locations used until Rancher Desktop 1.19, and the Linux `/usr/etc/rancher-desktop/...` paths are backup locations starting with Rancher Desktop 1.20.
