# Validation Summary: How to Use Podman on ARM-Based Servers

## Status
validated

## Post Type
Guide

## Technologies Covered
- Podman
- Linux containers
- ARM / AArch64
- AWS Graviton
- Raspberry Pi
- Apple Silicon
- Multi-architecture container images
- QEMU user-mode emulation
- Amazon ECR
- Pi-hole

## Sources Consulted
- Podman installation guide: https://podman.io/docs/installation
- Podman rootless tutorial: https://github.com/containers/podman/blob/main/docs/tutorials/rootless_tutorial.md
- Podman `podman info` reference: https://docs.podman.io/en/latest/markdown/podman-info.1.html
- Podman `podman image inspect` reference: https://docs.podman.io/en/latest/markdown/podman-image-inspect.1.html
- Podman `podman build` reference: https://docs.podman.io/en/v5.5.2/markdown/podman-build.1.html
- Podman `podman manifest` reference: https://docs.podman.io/en/v4.9.0/markdown/podman-manifest.1.html
- Podman `podman manifest add` reference: https://docs.podman.io/en/latest/markdown/podman-manifest-add.1.html
- Debian package metadata for `podman`: https://packages.debian.org/bookworm/i386/podman
- Debian package metadata for `uidmap`: https://packages.debian.org/bookworm/armhf/uidmap
- Amazon ECR Podman documentation: https://docs.aws.amazon.com/AmazonECR/latest/userguide/Podman.html
- Pi-hole container configuration docs: https://docs.pi-hole.net/docker/configuration/
- Pi-hole official Docker image README: https://github.com/pi-hole/docker-pi-hole

## Issues Found
- The intro treated Apple Silicon as a server platform and implied native Linux Podman behavior applied uniformly. I clarified that Podman runs natively on Linux ARM hosts and reframed Apple Silicon as a development platform used via a Linux VM on macOS, matching Podman’s installation docs.
- The Ubuntu and Debian install sections were missing version constraints from Podman’s official installation guidance. I updated them to Ubuntu 20.10+ and Debian 11+.
- The Debian install command omitted `uidmap`, which is recommended for rootless Podman and provides `newuidmap`/`newgidmap`. I added it to the Debian install example and the Raspberry Pi OS install example.
- The architecture verification text conflated `uname -m` output with Podman’s architecture naming. I corrected the Podman output expectation to `arm64`, which matches Podman’s Go-style platform naming.
- The image verification example used the generic `podman inspect` command. I changed it to `podman image inspect`, which is the documented image-specific command.
- The multi-architecture manifest workflow was incomplete. Podman’s manifest documentation requires `podman manifest push --all` to push all platforms, not just the native one. I also made the `manifest add` commands explicit with `docker://` image references to match the documented pattern.
- The Pi-hole example used the outdated `WEBPASSWORD` environment variable. I replaced it with `FTLCONF_webserver_api_password` and added `FTLCONF_dns_listeningMode=all`, which the current Pi-hole container docs recommend for bridged networking.
- The conclusion overstated that ARM support means “no emulation overhead and no compromises.” I narrowed that claim so it is only asserted when ARM-native images are used.

## Review Notes
- Newer Podman rootless networking defaults to `pasta` from the `passt` project on current installations, although `slirp4netns` remains supported and commonly packaged. The post is still technically workable as written after the fixes, but a future refresh could mention `passt` explicitly.
