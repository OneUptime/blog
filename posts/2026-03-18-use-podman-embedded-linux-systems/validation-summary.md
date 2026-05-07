# Validation Summary: How to Use Podman on Embedded Linux Systems

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Podman
- Yocto Project / OpenEmbedded / meta-virtualization
- Buildroot
- systemd / Quadlet
- OCI container images
- `containers-storage.conf`
- `containers-registries.conf`
- Go
- Alpine Linux

## Sources Consulted
- Podman Quadlet documentation: https://docs.podman.io/en/latest/markdown/podman-systemd.unit.5.html
- Podman load documentation: https://docs.podman.io/en/latest/markdown/podman-load.1.html
- Podman healthcheck documentation: https://docs.podman.io/en/latest/markdown/podman-healthcheck-run.1.html
- Podman stats documentation: https://docs.podman.io/en/latest/markdown/podman-stats.1.html
- Podman run documentation: https://docs.podman.io/en/latest/markdown/podman-run.1.html
- `containers-storage.conf` upstream manpage source: https://raw.githubusercontent.com/containers/container-libs/main/storage/docs/containers-storage.conf.5.md
- `containers-registries.conf` upstream manpage source: https://raw.githubusercontent.com/containers/container-libs/main/image/docs/containers-registries.conf.5.md
- Yocto Project layer management docs: https://docs.yoctoproject.org/dev/dev-manual/layers.html
- Yocto Project features reference: https://docs.yoctoproject.org/dev/ref-manual/features.html
- Yocto Project variables reference: https://docs.yoctoproject.org/dev/ref-manual/variables.html
- `meta-virtualization` README: https://git.yoctoproject.org/meta-virtualization/plain/README.md
- `meta-virtualization` Podman recipe: https://git.yoctoproject.org/meta-virtualization/plain/recipes-containers/podman/podman_git.bb
- Buildroot Podman package config: https://gitlab.com/buildroot.org/buildroot/-/raw/master/package/podman/Config.in
- Buildroot package menu layout: https://gitlab.com/buildroot.org/buildroot/-/raw/master/package/Config.in
- systemd unit conditions reference: https://www.freedesktop.org/software/systemd/man/latest/systemd.unit.html
- systemd service watchdog reference: https://www.freedesktop.org/software/systemd/man/latest/systemd.service.html
- Alpine Linux release branches: https://www.alpinelinux.org/releases/
- Go release history: https://go.dev/doc/devel/release

## Issues Found
- The Yocto setup flow omitted `source oe-init-build-env`, so `bitbake-layers add-layer` was not shown from a valid build environment. I added the missing step and kept the relative paths consistent with cloning the extra layers inside `poky`.
- The Yocto `local.conf` example did not match the current `meta-virtualization` Podman recipe. I replaced the outdated explicit `cni` install with `netavark` and `aardvark-dns`, added the required `seccomp` and `ipv6` distro features, and changed the rootless example from the non-existent `shadow-subids` package to `PACKAGECONFIG:append:pn-podman = " rootless"`, which is how the current recipe enables rootless dependencies.
- The kernel fragment example only wrote `containers.cfg`; it did not show how Yocto applies the fragment. I added a minimal `linux-yocto_%.bbappend` snippet with `FILESEXTRAPATHS` and `SRC_URI`.
- The Buildroot section used the wrong rootless networking symbol and implied a separate `slirp4netns` menu path. I updated it to use `BR2_PACKAGE_PODMAN_NET_SLIRP4NETNS=y`, which is the current Buildroot Podman backend choice, and removed the unnecessary explicit `BR2_PACKAGE_SHADOW=y`.
- The `storage.conf` example included `size = ""` under `[storage.options]`, which is not a documented generic option in `containers-storage.conf`. I removed it.
- The read-only-rootfs example moved `runroot` to `/data` and symlinked `/run/containers`, but the storage docs state `runroot` should live on a tmpfs such as `/run/containers/storage`. I updated the example to keep runtime state on `/run` and only move persistent storage to `/data`.
- The first-boot preload service used `ConditionPathExists=/data/containers/preload`, which would still run when the directory existed but contained no tar files. I changed it to `ConditionPathExistsGlob=/data/containers/preload/*.tar` so the service only runs when preload archives are actually present.
- The OTA script implied `podman healthcheck run` was universally applicable. I clarified in the comment that the check requires a `HEALTHCHECK` in the image, matching Podman’s documented behavior.
- The Quadlet example used `Device=` in the `[Container]` section, but Podman Quadlet uses `AddDevice=` for `--device`. I corrected the key.
- The Quadlet example used `WatchdogSec=60` without any accompanying `sd_notify` watchdog setup. I replaced it with `RestartSec=5` to keep the lifecycle example valid without implying unsupported watchdog behavior.
- The Dockerfile examples pinned stale versions (`golang:1.22` and `alpine:3.19`). I updated them to currently supported releases and switched the Flask install to `python3 -m pip` for a more reliable invocation.
- The opening claim stated Podman would run on "as little as 256MB of RAM and 1GB of storage", which is too specific to substantiate from upstream documentation. I reworded it to a more accurate, non-quantified statement about resource-constrained systems.

## Review Notes
- The `KERNEL_FEATURES` snippet is specifically a `linux-yocto` path; non-`linux-yocto` kernels typically need configuration fragments or defconfig changes instead.
- `podman stats` does not report network usage in rootless environments, per the current Podman docs.
- The examples assume a systemd-based target when using Quadlet and the preload unit. Systems using BusyBox init or another init system need equivalent service management.
