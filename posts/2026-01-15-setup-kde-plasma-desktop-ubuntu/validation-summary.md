# Validation Summary: How to Set Up KDE Plasma Desktop on Ubuntu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ubuntu APT package management
- KDE Plasma desktop environment
- Kubuntu desktop packages
- SDDM display manager
- KDE applications
- KDE Connect
- UFW firewall rules
- Baloo file indexing
- PipeWire and PulseAudio audio services

## Sources Consulted
- Ubuntu 24.04 APT package metadata for `kubuntu-desktop`, `plasma-desktop`, `kde-standard`, `systemsettings`, `plasma-systemmonitor`, `kde-spectacle`, `dragonplayer`, `kdeconnect`, `sddm`, `pipewire-pulse`, and related packages.
- Ubuntu package management documentation: https://ubuntu.com/server/docs/how-to/software/package-management/
- Ubuntu 24.04 LTS release notes: https://discourse.ubuntu.com/t/ubuntu-24-04-lts-noble-numbat-release-notes/39890
- KDE Plasma desktop overview: https://kde.org/plasma-desktop/
- KDE Plasma 6 community packaging notes: https://community.kde.org/Plasma/Plasma_6
- KDE Connect download page: https://kdeconnect.kde.org/download.html
- KDE Connect UserBase documentation: https://userbase.kde.org/KDEConnect
- KDE Baloo configuration documentation: https://community.kde.org/Baloo/Configuration
- Ubuntu SDDM configuration manpage: https://manpages.ubuntu.com/manpages/noble/man5/sddm.conf.5.html

## Issues Found
- The post used `systemsettings5` to launch KDE System Settings. On current Ubuntu/Kubuntu 24.04 package metadata, the package and launcher are `systemsettings`, so both terminal examples were updated.
- The system monitor install command included `ksysguard`, which is not available as an installable package in current Ubuntu 24.04 repositories. The command now installs `plasma-systemmonitor`.
- The screenshot utility package was listed as `spectacle`, but the Ubuntu package is `kde-spectacle`. The install command was corrected.
- The KDE video player package was listed as `dragon`, but the Ubuntu package is `dragonplayer`. The install command was corrected.
- The KDE Connect section recommended installing `indicator-kdeconnect`, which is not available in current Ubuntu 24.04 repositories. It now notes that GNOME users may prefer GSConnect.
- The Baloo tuning command used an invalid `balooctl config set "Basic Indexing Level" false` setting. It was replaced with the documented `only basic indexing=true` Baloo configuration key via `kwriteconfig5`, followed by restarting Baloo.
- The Firefox settings example included `~/.config/firefox/`, which is not the usual Firefox profile location on Ubuntu. The inaccurate path was removed, leaving `~/.mozilla/firefox/`.
- The GNOME removal warning said the operation was irreversible without reinstalling. This was technically overstated, so it now warns that it can remove many packages and that the apt transaction should be reviewed.
- The Plasma shell restart command was Plasma 5-specific. A Plasma 6 variant was added alongside the existing Plasma 5 command.
- The audio troubleshooting section only restarted PulseAudio. Current Ubuntu/Kubuntu releases use PipeWire by default, so a `systemctl --user restart pipewire pipewire-pulse wireplumber` command was added before the PulseAudio fallback.
- The SDDM custom-theme example used a non-real GitHub URL as if it were a runnable command. It was changed to instruct users to download and extract a real KDE Store theme archive instead.

## Review Notes
The guide is technically relevant and broadly accurate after correction. Some GUI navigation labels and package choices may vary between Ubuntu/Kubuntu 22.04, 24.04, and future Plasma 6-based releases, but the post now calls out the major Plasma 5 versus Plasma 6 command difference where it matters.
