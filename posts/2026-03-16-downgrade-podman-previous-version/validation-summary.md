# Validation Summary: How to Downgrade Podman to a Previous Version

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Podman
- Fedora, CentOS Stream, and RHEL package management with DNF
- Debian and Ubuntu package management with APT
- Arch Linux package management with pacman
- openSUSE package management with Zypper
- macOS package management with Homebrew

## Sources Consulted
- Podman `podman stop` documentation: https://docs.podman.io/en/latest/markdown/podman-stop.1.html
- Podman `podman export` documentation: https://docs.podman.io/en/v4.3/markdown/podman-export.1.html
- Podman `podman system migrate` documentation: https://docs.podman.io/en/stable/markdown/podman-system-migrate.1.html
- Podman `podman system reset` documentation: https://docs.podman.io/en/v4.8.3/markdown/podman-system-reset.1.html
- Podman `podman machine rm` documentation: https://docs.podman.io/en/v5.2.0/markdown/podman-machine-rm.1.html
- Podman `podman run` volume/SELinux labeling documentation: https://docs.podman.io/en/v4.3/markdown/podman-run.1.html
- DNF versionlock plugin documentation: https://dnf-plugins-core.readthedocs.io/en/stable/versionlock.html
- Fedora package information for `python3-dnf-plugin-versionlock`: https://packages.fedoraproject.org/pkgs/dnf-plugins-core/python3-dnf-plugin-versionlock/
- Red Hat versionlock guidance: https://access.redhat.com/solutions/98873
- Debian `apt` manpage: https://manpages.debian.org/experimental/apt/apt.8.en.html
- Debian `apt-mark` manpage: https://manpages.debian.org/unstable/apt/apt-mark.8.en.html
- Debian `apt_preferences` manpage: https://manpages.debian.org/testing/apt/apt_preferences.5
- Arch Linux `pacman.conf` manpage: https://man.archlinux.org/man/pacman.conf.5.en
- Zypper manpage: https://manpages.opensuse.org/Leap-15.6/zypper/zypper.8.en.html
- Homebrew versions documentation: https://docs.brew.sh/Versions
- Homebrew manpage: https://docs.brew.sh/Manpage

## Issues Found
- The Arch Linux lock command appended `IgnorePkg = podman` to the end of `/etc/pacman.conf`, which can place the directive outside the required `[options]` section. Changed it to instruct editing the `[options]` section directly.
- The Arch Linux unlock command deleted the whole `IgnorePkg` line, which could remove unrelated package holds. Changed it to instruct removing only `podman` from the `IgnorePkg` line.
- The Homebrew downgrade example used direct installation from a raw historical formula URL. Current Homebrew documentation recommends extracting historical formula versions into a tap, so the example now uses `brew tap-new`, `brew extract`, and installation from the custom tap.
- The macOS `podman machine rm` command can prompt for confirmation. Changed it to `podman machine rm --force` for the scripted workflow, matching Podman documentation.
- The storage compatibility section recommended `podman system migrate` after downgrading. Podman documents that command as migrating containers to the current Podman version and it may not reverse newer storage changes, so the section now verifies storage with `podman info` and documents reset as the fallback.
- The summary said to always run `podman system migrate` after downgrading. Updated it to recommend verifying storage with `podman info`.
- The Debian/Ubuntu dependency troubleshooting command listed related packages without target versions, which would not necessarily downgrade them. Updated it to show that matching target versions must be specified.

## Review Notes
- The specific package version strings are examples and remain distribution/repository dependent. Users still need to choose versions that are available in their configured repositories or archives.
- Downgrading core container tooling can involve dependency and storage compatibility risks that vary by distribution release.
