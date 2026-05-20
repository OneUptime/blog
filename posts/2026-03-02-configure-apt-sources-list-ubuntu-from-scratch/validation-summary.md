# Validation Summary: How to Configure APT Sources List on Ubuntu from Scratch

## Status
validated

## Post Type
Tutorial / technical guide

## Technologies Covered
- Ubuntu APT package management
- APT `sources.list` one-line format
- APT deb822 `.sources` format
- Repository components and suites
- GPG key management with `Signed-By`
- PPAs and third-party APT repositories
- Docker APT repository setup

## Sources Consulted
- Ubuntu Server documentation: package management and Ubuntu 24.04 deb822 default sources - https://ubuntu.com/server/docs/how-to/software/package-management/
- Ubuntu `sources.list(5)` manpage for one-line format, deb822 format, options, `Signed-By`, and keyring locations - https://manpages.ubuntu.com/manpages/noble/man5/sources.list.5.html
- Ubuntu `apt-key(8)` manpage for deprecation status and replacement guidance - https://manpages.ubuntu.com/manpages/noble/man8/apt-key.8.html
- Docker official Ubuntu installation documentation for current APT repository setup - https://docs.docker.com/engine/install/ubuntu/
- Ubuntu `add-apt-repository(1)` manpage for PPA behavior and key handling - https://manpages.ubuntu.com/manpages/noble/man1/apt-add-repository.1.html
- Ubuntu `ppa-purge(1)` manpage for PPA removal and package downgrading behavior - https://manpages.ubuntu.com/manpages/resolute/man1/ppa-purge.1.html

## Issues Found
- The post incorrectly stated that Ubuntu uses deb822 sources by default from Ubuntu 22.04 onward. Ubuntu's official server documentation says releases prior to 24.04 LTS do not use deb822 by default. Updated the version statements to say deb822 is the default from Ubuntu 24.04 onward.
- The post described `/usr/share/keyrings/` as the general modern location for per-repository keys. The APT manpage distinguishes `/usr/share/keyrings` for package-managed keyrings and `/etc/apt/keyrings` for system-operator-managed keyrings. Updated third-party examples and summary guidance to use `/etc/apt/keyrings/`.
- The Docker repository example used an older one-line `.list` setup with a dearmored key. Docker's current official documentation uses `/etc/apt/keyrings/docker.asc` and a deb822 `.sources` file. Updated the example accordingly.
- The validation section recommended `apt-key adv` for missing keys. `apt-key` is deprecated except for limited removal use. Replaced it with a keyserver `curl` and `gpg --dearmor` approach, and added a note to reference the resulting keyring with `signed-by=`.

## Review Notes
The remaining commands and configuration examples match documented APT syntax. The examples are Ubuntu-version-specific; future updates should recheck defaults for newer Ubuntu LTS releases and third-party repository setup instructions because these change over time.
