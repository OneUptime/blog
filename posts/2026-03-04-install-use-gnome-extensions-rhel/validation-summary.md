# Validation Summary: How to Install and Use GNOME Extensions on RHEL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux
- GNOME Shell
- GNOME Shell extensions
- GNOME Extensions app
- GNOME browser integration
- dnf package management
- gsettings and journalctl troubleshooting commands

## Sources Consulted
- Red Hat Enterprise Linux 10 Package Manifest: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/10/html-single/package_manifest/index
- Red Hat Enterprise Linux 9 Package Manifest: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/package_manifest/repositories
- Red Hat Enterprise Linux 8 GNOME desktop documentation, GNOME Shell extensions package overview: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/8/html/using_the_desktop_environment_in_rhel_8/customizing-desktop-appearance_using-the-desktop-environment-in-rhel-8
- Red Hat Enterprise Linux 10 GNOME desktop administration documentation, gnome-extensions command usage: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/10/html-single/administering_rhel_by_using_the_gnome_desktop_environment/administering_rhel_by_using_the_gnome_desktop_environment
- Red Hat Enterprise Linux 10 considerations, package replacements: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/10/html/considerations_in_adopting_rhel_10/changes-to-packages
- GNOME browser integration installation guide: https://gnome.pages.gitlab.gnome.org/gnome-browser-integration/pages/installation-guide.html
- GNOME system administration guide, GNOME Shell extensions: https://help.gnome.org/system-admin-guide/extensions.html
- GNOME Extensions app page: https://apps.gnome.org/en/Extensions/
- Local `gnome-extensions --help` output for command syntax verification.

## Issues Found
- The browser connector package was listed only as `gnome-browser-connector`. This is correct for RHEL 10, but RHEL 8 and RHEL 9 use `chrome-gnome-shell`. Added version-specific commands for RHEL 10 and RHEL 8/9.
- The System Monitor extension package was listed only as `gnome-shell-extension-system-monitor`. This is correct for RHEL 10, but RHEL 8 and RHEL 9 package manifests list `gnome-shell-extension-systemMonitor`. Added both version-specific package names.
- The GSConnect command used `sudo dnf install -y gnome-shell-extension-gsconnect`, but that package was not present in the RHEL 8, RHEL 9, or RHEL 10 package manifest references checked. Changed the instruction to install GSConnect from extensions.gnome.org or from a third-party repository that provides it.

## Review Notes
The remaining `gnome-extensions` commands, per-user extension directory path, Extensions app behavior, and desktop icons/apps menu/places menu package references were consistent with GNOME and Red Hat documentation. Web installation still depends on both the native connector package and the browser add-on, as documented by GNOME browser integration.
