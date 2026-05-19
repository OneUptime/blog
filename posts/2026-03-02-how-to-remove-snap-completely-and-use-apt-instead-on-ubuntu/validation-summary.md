# Validation Summary: How to Remove Snap Completely and Use APT Instead on Ubuntu

## Status
validated

## Post Type
Tutorial / How-to guide

## Technologies Covered
- Ubuntu (22.04 / 24.04)
- snap / snapd
- APT (apt, apt-cache, dpkg)
- APT preferences / pinning
- systemd (systemctl)
- Mozilla APT repository (Firefox)
- Google Chrome / Chromium (xtradeb PPA)
- Microsoft VS Code APT repository
- Spotify APT repository

## Sources Consulted
- Mozilla "Install Firefox on Linux" official guide: https://support.mozilla.org/en-US/kb/install-firefox-linux
- Spotify Linux download page: https://www.spotify.com/us/download/linux/
- apt_preferences(5) manpage: https://manpages.ubuntu.com/manpages/noble/man5/apt_preferences.5.html
- systemctl(1) manpage: https://man7.org/linux/man-pages/man1/systemctl.1.html
- snapd `--purge` flag discussion: https://forum.snapcraft.io/t/automatic-snapshots-snap-remove-purge-proposal/11294
- xtradeb/apps PPA: https://launchpad.net/~xtradeb/+archive/ubuntu/apps
- Microsoft VS Code Linux install docs: https://code.visualstudio.com/docs/setup/linux

## Issues Found
1. **Missing keyrings directory creation (Firefox/Mozilla section).** On Ubuntu 22.04 (and sometimes 24.04), `/etc/apt/keyrings/` is not guaranteed to exist by default, so the `wget ... | sudo tee /etc/apt/keyrings/packages.mozilla.org.asc` step would fail with "No such file or directory". Mozilla's official guide includes a `sudo install -d -m 0755 /etc/apt/keyrings` step. Added that step before the key download.

2. **Misleading comment about `systemctl daemon-reload`.** The post claimed it "updates the system journal to clear snap-related entries". `systemctl daemon-reload` reloads systemd unit files (which is the relevant action after snap mount units disappear); it does not touch the journal. Rewrote the comment to: "Reload systemd so it forgets any leftover snap mount units".

3. **Outdated Spotify GPG key URL.** The post used `pubkey_6224F9941A8AA6D1.gpg`, which is an older Spotify signing key. Spotify's current published key (per its Linux download page) is `pubkey_5384CE82BA52C83A.asc`. Updated the URL accordingly.

## Review Notes
- The `Pin: release a=*` syntax with `Pin-Priority: -10` is accepted by APT and works to block snapd; the more canonical form is `Pin: release *`, but the existing form is functional and widely used in published guides, so left as-is.
- `sudo apt remove --autoremove snapd` is correct; the post intentionally notes that config files remain (`'rc'` state). Users wanting full removal can use `apt purge --autoremove snapd`, but this is a stylistic choice and not an error.
- The Slack `.deb` URL hardcodes version 4.35.131. URLs of this form are version-specific and will become stale over time; readers should check Slack's download page for the current version. This is a documentation-freshness caveat, not a technical error.
- The `sudo umount /snap/firefox/current` example targets a symlink rather than the actual mount path (`/snap/firefox/<revision>`). `umount` can resolve the symlink in many cases, and the `2>/dev/null` swallows failures, so this is acceptable but not the most robust approach.
- Snap base/runtime names referenced (`gnome-3-38-2004`, `gnome-42-2204`, `core20`, `core22`, `bare`, `gtk-common-themes`, `snap-store`) are all real and appear on default Ubuntu 22.04/24.04 desktop installs. On 24.04 the user may additionally need to remove `core24`, `gnome-46-2404`, `firmware-updater`, `thunderbird`, and `snapd-desktop-integration`.
- The `/etc/apt/preferences.d/mozilla` file has no extension; APT preference files require either no extension or a `.pref` extension, so this is valid.
