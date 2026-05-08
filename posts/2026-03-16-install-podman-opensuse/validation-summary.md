# Validation Summary: How to Install Podman on openSUSE

## Status
validated

## Post Type
Tutorial / Installation guide

## Technologies Covered
- Podman
- openSUSE Leap
- openSUSE Tumbleweed
- Zypper
- Rootless containers
- Podman socket / Docker API compatibility
- firewalld
- systemd and Quadlet
- AppArmor

## Sources Consulted
- openSUSE Leap portal: https://en.opensuse.org/Portal:Leap/Intro
- openSUSE Leap 16.0 release notes: https://doc.opensuse.org/release-notes/x86_64/openSUSE/Leap/16.0/yast-html/release-notes.html
- openSUSE Tumbleweed update documentation: https://doc.opensuse.org/documentation/tumbleweed/updating_upgrading_reverting/
- openSUSE zypper documentation: https://doc.opensuse.org/documentation/tumbleweed/zypper/
- openSUSE package information for Podman: https://software.opensuse.org/package/podman
- openSUSE Build Service Podman spec: https://build.opensuse.org/projects/openSUSE:Factory/packages/podman/files/podman.spec
- SUSE rootless Podman documentation: https://documentation.suse.com/smart/container/html/rootless-podman/rootless-podman.html
- Podman rootless and subuid/subgid documentation: https://docs.podman.io/en/latest/markdown/podman.1.html
- Podman networking documentation: https://docs.podman.io/en/latest/markdown/podman-network.1.html
- Podman system service documentation: https://docs.podman.io/en/latest/markdown/podman-system-service.1.html
- Podman Quadlet/systemd documentation: https://docs.podman.io/en/latest/markdown/podman-systemd.unit.5.html
- openSUSE AppArmor aa-complain man page: https://manpages.opensuse.org/Tumbleweed/apparmor-utils/aa-complain.8.en.html

## Issues Found
- The post listed openSUSE Leap 15.4+ as a prerequisite. Leap 15.4 and 15.5 are already end-of-life, Leap 15.6 ended maintenance on April 30, 2026, and Leap 16.0 is the supported Leap release as of this review. Updated the prerequisite to openSUSE Leap 16.0+.
- The post claimed YaST integration. Leap 16.0 release notes state that YaST has been removed and manual administration has switched toward Cockpit. Reworded the description and introductory note to refer to systemd and standard system management tools instead.
- The update step used `zypper update` for all openSUSE editions. openSUSE documentation recommends `zypper dup` for Tumbleweed snapshots. Added a separate Tumbleweed update command.
- The rootless networking step installed only `slirp4netns`. Current Podman documentation lists `pasta` as the default rootless networking tool, and openSUSE's Podman packaging requires `passt`. Changed the command to install `passt`.
- The systemd section used `podman generate systemd`. Current Podman documentation recommends Quadlet-style `.container` units for systemd-managed containers. Replaced the generated-service example with a Quadlet container unit.
- The troubleshooting section checked `kernel.unprivileged_userns_clone`, which is not the portable kernel namespace limit used on openSUSE/SUSE systems. Changed it to `user.max_user_namespaces`.

## Review Notes
The remaining commands are broadly correct for a standard openSUSE installation. The AppArmor troubleshooting command is syntactically valid, but in practice users should identify the exact confined profile reported by `aa-status` or the audit log before switching a profile to complain mode.
