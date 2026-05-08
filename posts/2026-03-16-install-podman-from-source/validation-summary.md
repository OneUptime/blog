# Validation Summary: How to Install Podman from Source

## Status
validated

## Post Type
Tutorial / Installation guide

## Technologies Covered
- Podman
- Linux containers
- Fedora, CentOS Stream, RHEL, Debian, and Ubuntu package management
- Go
- conmon
- crun
- Netavark and Aardvark DNS
- Rootless Podman
- containers/image configuration files

## Sources Consulted
- Podman official installation and source build documentation: https://podman.io/docs/installation
- Podman rootless tutorial: https://github.com/containers/podman/blob/main/docs/tutorials/rootless_tutorial.md
- Podman v5.8.2 go.mod: https://raw.githubusercontent.com/containers/podman/v5.8.2/go.mod
- Podman v5.3.0 go.mod: https://raw.githubusercontent.com/containers/podman/v5.3.0/go.mod
- Go official release history: https://go.dev/doc/devel/release
- containers/image default registries configuration: https://raw.githubusercontent.com/containers/image/main/registries.conf
- containers/image default policy configuration: https://raw.githubusercontent.com/containers/image/main/default-policy.json
- conmon upstream Makefile: https://raw.githubusercontent.com/containers/conmon/main/Makefile
- Netavark upstream README: https://github.com/containers/netavark

## Issues Found
- The prerequisite listed Go 1.21 or later, but current Podman releases require a newer Go version. Updated the prerequisite to Go 1.24.2 or later for current releases and noted that the exact requirement should be checked in `go.mod`.
- The manual Go install example used Go 1.22.0, which is older than current Podman release requirements. Updated the example to Go 1.26.3, the current supported Go release on the validation date.
- The Fedora and Debian dependency lists omitted several build/runtime dependencies used by the documented build tags and current Podman networking defaults. Added SELinux/systemd/AppArmor-related development packages where applicable, plus Netavark, Aardvark DNS, nftables, and passt.
- The Debian dependency list used `golang`; the official Podman source build documentation uses `golang-go`. Updated the package name.
- The build examples omitted SELinux support on Fedora/RHEL-style systems and did not include the required `exclude_graphdriver_devicemapper` build tag. Updated the Podman build, custom build, cross-compile, and update examples.
- The install command used plain `sudo make install`; upstream documentation preserves `PATH` under sudo and installs with `PREFIX=/usr`. Updated the install and reinstall commands accordingly.
- The conmon source-install example used `sudo make install`, but upstream Podman documentation installs conmon for Podman with `sudo make podman`. Updated the command.
- The configuration setup attempted to copy `registries.conf` from a vendored path and then overwrote it with a minimal custom file. Updated the commands to download the upstream default `registries.conf` and `policy.json` files, matching the official Podman source build documentation.
- The rootless networking note only installed `slirp4netns`, while current Podman documentation states that rootless networking uses pasta from the passt package by default. Updated the check to prefer pasta while retaining slirp4netns as a fallback.
- The Netavark package-manager example only showed Fedora. Added the Debian/Ubuntu package-manager command before the source-build fallback.

## Review Notes
- The guide still uses `v5.3.0` and `v5.4.0` as example release tags. These are syntactically valid examples, but readers should choose a currently supported Podman release when building for production.
- Some distribution package names and availability can vary by distro release. The source-build instructions now align more closely with upstream guidance, but package-manager dependency resolution may still require enabling distribution-specific repositories such as CRB/CodeReady Builder on RHEL-family systems.
