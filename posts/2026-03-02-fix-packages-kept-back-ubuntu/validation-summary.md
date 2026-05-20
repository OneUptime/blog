# Validation Summary: How to Fix 'The Following Packages Have Been Kept Back' on Ubuntu

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Ubuntu
- APT
- apt
- apt-get
- apt-cache / apt policy
- apt-mark
- Ubuntu phased updates

## Sources Consulted
- Ubuntu `apt(8)` manpage: https://manpages.ubuntu.com/manpages/jammy/en/man8/apt.8.html
- Ubuntu `apt-get(8)` manpage: https://manpages.ubuntu.com/manpages/noble/en/man8/apt-get.8.html
- Ubuntu Server documentation, "About apt upgrade and phased updates": https://documentation.ubuntu.com/server/explanation/software/about-apt-upgrade-and-phased-updates/
- Ubuntu Project documentation, "Phased updates": https://documentation.ubuntu.com/project/how-ubuntu-is-made/concepts/phased-updates/
- Local command help/manpages for `apt`, `apt-get`, `apt-cache`, and `apt-mark`.

## Issues Found
- Corrected the description of `apt upgrade`. The post said `apt upgrade` will not install new packages, but the Ubuntu `apt(8)` manpage states that `apt upgrade` can install new packages required for dependencies and only refuses removals. The stricter no-new-packages behavior applies to `apt-get upgrade`.
- Updated the "New Dependencies" reason to distinguish `apt upgrade` from `apt-get upgrade`, including the documented `apt-get upgrade --with-new-pkgs` option.
- Updated the kernel-update explanation. Kernel upgrades commonly install new `linux-image-*` and `linux-headers-*` packages, but current `apt upgrade` can handle those additions; kernel packages are not "almost always" kept back solely for that reason.
- Replaced incorrect phased-update inspection commands. Installing `update-manager-core` and reading `/etc/update-manager/release-upgrades` does not show a package's phased-update status. Ubuntu documentation recommends `apt policy <package>`, which displays output such as `(phased 20%)`.
- Adjusted phased-update advice to match Ubuntu guidance: waiting is recommended; installing the package explicitly can bypass phasing but should be a conscious risk decision.
- Clarified that `apt full-upgrade` is equivalent to `apt-get dist-upgrade` and is needed when removals are required, not for every routine kernel or package update.

## Review Notes
The remaining commands are syntactically valid. `apt-rdepends --reverse` may require installing the optional `apt-rdepends` package on systems where it is not already present, but the command itself is valid.
