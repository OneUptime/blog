# Validation Summary: How to Migrate from apt Packages to Snap on Ubuntu

## Status
validated

## Post Type
Tutorial / How-to Guide

## Technologies Covered
- Ubuntu (21.10+, 22.04 LTS)
- Snap / snapd package management
- APT / dpkg package management
- Firefox snap
- VLC snap
- LibreOffice snap
- Node.js snap (replaced an incorrect git example)
- PostgreSQL snap
- AppArmor confinement / snap interfaces (home, removable-media, camera, audio-record, optical-drive)

## Sources Consulted
- Snapcraft data locations reference: https://snapcraft.io/docs/data-locations
- Firefox snap profile location (Mozilla / Snapcraft docs): https://snapcraft.io/firefox
- git-ubuntu snap (Canonical Ubuntu source package tool): https://snapcraft.io/git-ubuntu
- Official PostgreSQL snap: https://snapcraft.io/postgresql
- VLC snapcraft.yaml: https://github.com/videolan/vlc/blob/master/extras/package/snap/snapcraft.yaml
- Snap home interface (auto-connection list): https://snapcraft.io/docs/home-interface
- Ubuntu 21.10 release notes (Firefox snap default): https://discourse.ubuntu.com/t/impish-indri-release-notes
- snap CLI command reference (`snap install`, `snap connect`, `snap services`, `snap start`)

## Issues Found

1. **Incorrect Firefox-default Ubuntu version.** The post claimed Canonical made Firefox snap the default in "Ubuntu 22.04+". The snap actually became the default in Ubuntu 21.10 (Impish Indri); 22.04 LTS completed the transition. Changed "22.04+" to "21.10+".

2. **Misleading `git-ubuntu` recommendation.** The "Migrating a Development Tool (Git)" section recommended `sudo snap install git-ubuntu --classic` to get a newer git. `git-ubuntu` is a Canonical tool for working with Ubuntu source-package git repositories, not a general-purpose newer `git` command. It also recommended `sudo snap install git --classic` as an alternative; there is no widely-used official `git` snap on the Snap Store (snapcraft.io/git returns 404). Replaced the example with Node.js (`sudo snap install node --classic --channel=22/stable`), which is a real, commonly used classic snap for getting newer dev-tool versions than Ubuntu repos provide. Updated the section heading, intro sentence, commands, and test commands accordingly.

3. **Non-existent `postgresql14` snap.** The PostgreSQL section used `postgresql14` as the snap name and referenced `/var/snap/postgresql14/...`. The official PostgreSQL snap on the Snap Store is named `postgresql` and exposes major versions through channels (e.g. `14/stable`, `16/stable`). Updated the install command to `sudo snap install postgresql --channel=14/stable`, and updated `snap start`, `snap services`, `snap run`, and the config path (`/var/snap/postgresql/current/...`) to use the correct snap name.

## Review Notes

- The `home` interface is auto-connected for snaps from the Snap Store, so the `sudo snap connect libreoffice:home :home` command in the LibreOffice section is generally a no-op. It is not technically wrong (it will succeed or report already-connected), so it was left in place as a defensive step.
- On Ubuntu 22.04+, the `firefox` APT package is a transitional package that triggers the snap install; `sudo apt remove --autoremove firefox` will remove the transitional package but not the snap. The post's Firefox migration steps are aimed at users coming from older Ubuntu releases (e.g. 20.04) where the APT package was the actual Firefox, which is the realistic migration scenario. Left as-is.
- The Firefox snap profile path (`~/snap/firefox/common/.mozilla/firefox/`) was verified correct — `common` is used so the profile persists across snap revisions.
- VLC snap plugs (`camera`, `audio-record`, `removable-media`, `optical-drive`) were verified against the upstream snapcraft.yaml. None of these auto-connect, so the manual `snap connect` commands are appropriate.
- The snap data-location claims (`~/snap/<name>/current/`, `~/snap/<name>/common/`, `/var/snap/<name>/current/`) match the official documentation.
- The migration script template is generic and syntactically sound; the loop `for dir in ~/.config/$APP_NAME ...` correctly handles missing directories via the `[ -d "$dir" ]` guard.
