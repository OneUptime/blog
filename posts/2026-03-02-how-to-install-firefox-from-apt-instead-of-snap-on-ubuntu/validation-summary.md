# Validation Summary: How to Install Firefox from APT Instead of Snap on Ubuntu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ubuntu
- Firefox
- Snap
- APT
- Mozilla APT repository
- GPG repository signing keys
- APT pinning preferences
- KeePassXC browser integration

## Sources Consulted
- Mozilla Support: Install Firefox on Linux: https://support.mozilla.org/en-US/kb/install-firefox-linux
- Ubuntu Packages: firefox package in Ubuntu 22.04: https://packages.ubuntu.com/jammy/firefox
- Ubuntu Packages: firefox package file list in Ubuntu 22.04: https://packages.ubuntu.com/jammy/amd64/firefox/filelist
- Ubuntu Packages search results for Firefox packages: https://packages.ubuntu.com/search?keywords=firefox
- Launchpad: Ubuntu jammy firefox package: https://launchpad.net/ubuntu/jammy/+package/firefox
- KeePassXC User Guide: https://keepassxc.org/docs/KeePassXC_UserGuide
- Local APT manual pages: apt_preferences(5), sources.list(5)
- Local Snap CLI help: snap remove

## Issues Found
- The post said `which firefox` should show no output after removing the Snap. Ubuntu's transitional `firefox` package includes `/usr/bin/firefox`, so this check is unreliable. Changed the verification command to `snap list firefox 2>/dev/null`.
- The post described a nonexistent `firefox-snap-package-redirector` package. Ubuntu provides a transitional `firefox` package that installs the Snap. Updated the text and command to remove/check the actual `firefox` transitional package.
- The Mozilla signing key command dearmored the key while saving it as `packages.mozilla.org.asc`. Mozilla's current official instructions store the downloaded key directly as the `.asc` file. Updated the command to match Mozilla's documentation.
- The Snap Firefox profile path was written as `~/.snap/firefox/...`, but Mozilla documents the Snap profile location as `~/snap/firefox/...`. Corrected the path.
- The profile migration example copied only one profile directory and could miss `profiles.ini` and other profile metadata. Updated it to create `~/.mozilla/firefox/`, copy the full profile data with `cp -a`, and launch `firefox -P`.
- KeePassXC integration claims were too absolute. Current KeePassXC documentation says Ubuntu's Firefox Snap is an exception for native messaging support. Updated the wording to describe Snap-specific issues more conditionally and added the current KeePassXC caveat.
- Startup-time claims were overly specific and system-dependent. Replaced the hard 2-3 second expectation with a general instruction to verify whether startup improves.

## Review Notes
The core Mozilla APT repository setup, APT pinning priority, language-pack naming, and update commands are consistent with Mozilla's current Linux installation documentation. The tutorial remains version-sensitive because Ubuntu's Firefox transitional package behavior can vary across releases, but it is accurate for Ubuntu 22.04 and later releases that ship Firefox as a Snap by default.
