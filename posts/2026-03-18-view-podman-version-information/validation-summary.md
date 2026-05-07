# Validation Summary: How to View Podman Version Information

## Status
validated

## Post Type
Guide

## Technologies Covered
- Podman CLI
- `jq`
- Bash
- Linux package managers (`dnf`, `apt`)
- Homebrew

## Sources Consulted
- Podman `podman version` documentation: https://docs.podman.io/en/latest/markdown/podman-version.1.html
- Podman `podman info` documentation: https://docs.podman.io/en/latest/markdown/podman-info.1.html
- Podman CLI source for `podman version` output behavior: https://raw.githubusercontent.com/containers/podman/main/cmd/podman/system/version.go
- Podman version struct definition: https://raw.githubusercontent.com/containers/podman/main/libpod/define/version.go
- Podman host info struct definition: https://raw.githubusercontent.com/containers/podman/main/libpod/define/info.go

## Issues Found
- The post described `podman version` as showing both client and server details unconditionally. I changed that wording to reflect current Podman behavior: client details are always shown, and server details are shown when using a remote connection.
- The build-time formatting example used `{{.Client.Built}}`, which returns the Unix build timestamp. I changed it to `{{.Client.BuiltTime}}` so it matches the description "Display the build time."
- The bug-report `jq` example used `.host.cgroupsVersion`, but Podman's JSON output uses `.host.cgroupVersion`. I corrected the JSON path.
- The update-check sentence said the commands compared against the latest release, but the examples actually query package managers for newer packaged versions. I adjusted the wording to match the commands shown.

## Review Notes
- Podman's Go-template field for cgroup version is `CgroupsVersion`, while the JSON key from `podman info --format json` is `cgroupVersion`. The post now reflects that distinction correctly.
