# Validation Summary: How to Configure Podman Machine with Apple Rosetta Translation

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Podman
- Podman Machine
- Apple Virtualization Framework / AppleHV
- Apple Rosetta 2
- macOS on Apple Silicon
- Linux containers and multi-architecture container images

## Sources Consulted
- Podman `podman-machine-init` documentation: https://docs.podman.io/en/latest/markdown/podman-machine-init.1.html
- Podman `podman-machine-set` documentation: https://docs.podman.io/en/stable/markdown/podman-machine-set.1.html
- Podman `podman-machine-inspect` documentation: https://docs.podman.io/en/latest/markdown/podman-machine-inspect.1.html
- Podman `podman-build` documentation: https://docs.podman.io/en/v5.5.2/markdown/podman-build.1.html
- Podman v5.1.0 release notes: https://github.com/containers/podman/blob/main/RELEASE_NOTES.md
- Podman v5.6.0 release notes: https://github.com/containers/podman/releases/tag/v5.6.0
- containers/common `containers.conf` machine table documentation: https://raw.githubusercontent.com/containers/common/main/docs/containers.conf.5.md
- Apple Developer documentation for Rosetta in Linux VMs: https://developer.apple.com/documentation/virtualization/running_intel_binaries_in_linux_vms_with_rosetta

## Issues Found
- The post said Rosetta support required Podman 4.1 or later. Rosetta support for Podman machines was introduced in Podman 5.1, so the prerequisite was updated.
- The post used a nonexistent `podman machine init --rosetta` flag. Current Podman documentation exposes Rosetta through the `[machine] rosetta` setting in `containers.conf`, so the creation, recreation, disabling, and quick-reference examples were corrected.
- The post did not mention the Podman 5.6 change that disabled Rosetta by default due to newer Linux kernel compatibility issues. A version-specific caveat was added.
- The Rosetta verification command used `/usr/bin/pgrep -q oahd`, which only checks whether the daemon is currently running. It was replaced with `pkgutil --pkg-info com.apple.pkg.RosettaUpdateAuto` to check installation.
- The troubleshooting section used `podman machine inspect my-machine | jq '.VMType'`, but `.VMType` is not documented in current inspect output. It was replaced with documented `.Rosetta` and `.ConfigDir.Path` inspection.
- The multi-architecture build example used `podman build --platform linux/amd64,linux/arm64 -t myapp:latest .` without `--manifest`. Podman documents multi-architecture builds with `--manifest`, so the example was corrected.
- The description said containers run "natively" under Rosetta. That was changed to avoid implying native execution rather than binary translation.

## Review Notes
Podman Desktop documentation still states that Rosetta is enabled by default, while Podman 5.6 release notes state it was disabled by default because of Linux kernel compatibility issues. The post now includes the Podman 5.6 caveat so readers do not assume Rosetta is always enabled on current Podman releases.
