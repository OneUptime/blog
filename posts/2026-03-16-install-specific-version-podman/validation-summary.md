# Validation Summary: How to Install a Specific Version of Podman

## Status
validated

## Post Type
Tutorial / installation guide

## Technologies Covered
- Podman
- DNF / DNF5
- APT
- pacman
- Arch Linux Archive
- Fedora COPR
- Linux source builds

## Sources Consulted
- Podman installation and source build documentation: https://podman.io/docs/installation
- Podman command reference: https://docs.podman.io/en/latest/Commands.html
- DNF command reference: https://dnf.readthedocs.io/en/stable/command_ref.html
- DNF versionlock plugin documentation: https://dnf-plugins-core.readthedocs.io/en/stable/versionlock.html
- DNF5 versionlock documentation: https://dnf5.readthedocs.io/en/latest/commands/versionlock.8.html
- Debian apt-get manual: https://manpages.debian.org/bookworm/apt/apt-get.8.en.html
- Debian apt-mark manual: https://manpages.debian.org/bookworm/apt/apt-mark.8.en.html
- Arch pacman.conf manual: https://man.archlinux.org/man/pacman.conf.5.en
- Arch pacman manual: https://man.archlinux.org/man/pacman.8.en
- Arch Linux Archive package listing for Podman: https://archive.archlinux.org/packages/p/podman/
- Fedora Koji package listing for Podman 5.2.0-1.fc40: https://kojipkgs.fedoraproject.org/packages/podman/5.2.0/1.fc40/x86_64/
- CentOS Stream/RPM package listing for Podman EL9 versions: https://rpmfind.net/linux/rpm2html/search.php?query=podman

## Issues Found
- The Debian/Ubuntu backports check used `apt list -a podman -t bullseye-backports`, but `apt list` does not accept `-t` in that combination. Changed it to `apt-cache policy podman`, which correctly shows enabled repository candidates, including backports when configured.
- The CentOS Stream / RHEL example used `podman-5.2.0-1.el9`, which was not found as an EL9 package build during validation. Changed the example to `podman-5.6.0-2.el9`, an available CentOS Stream 9 package version.
- The Fedora source-build snippet listed an incomplete dependency set and omitted Podman's documented `builddep`, runtime dependencies, SELinux build tag, and `/usr` prefix. Updated the snippet to clone the repository first, install build dependencies from `rpm/podman.spec`, install documented runtime dependencies, and build/install with `BUILDTAGS="selinux seccomp" PREFIX=/usr`.
- The COPR wording implied the repository was for arbitrary specific builds. Adjusted it to describe the Podman COPR as unreleased testing builds, matching the official Podman installation documentation.

## Review Notes
The package-version examples remain distribution- and repository-state dependent. Readers still need to use the version strings returned by their own enabled repositories before running the install commands.
