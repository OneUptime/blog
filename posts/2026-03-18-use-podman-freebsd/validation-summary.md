# Validation Summary: How to Use Podman on FreeBSD

## Status
validated

## Post Type
Guide

## Technologies Covered
- Podman
- FreeBSD
- FreeBSD jails
- `ocijail`
- Linux Binary Compatibility on FreeBSD
- ZFS
- PF
- OCI container images

## Sources Consulted
- Podman installation docs: https://podman.io/docs/installation
- Podman `podman-pull(1)`: https://docs.podman.io/en/stable/markdown/podman-pull.1.html
- Podman `podman-run(1)`: https://docs.podman.io/en/v5.4.1/markdown/podman-run.1.html
- Podman `podman-network-create(1)`: https://docs.podman.io/en/latest/markdown/podman-network-create.1.html
- Podman `podman-pod-create(1)`: https://docs.podman.io/en/stable/markdown/podman-pod-create.1.html
- FreeBSD Handbook, Linux Binary Compatibility: https://docs.freebsd.org/en/books/handbook/linuxemu/
- FreeBSD ports `podman` port metadata: https://github.com/freebsd/freebsd-ports/blob/main/sysutils/podman/Makefile
- FreeBSD ports `podman` rc script: https://github.com/freebsd/freebsd-ports/blob/main/sysutils/podman/files/podman.in
- FreeBSD ports `ocijail` metadata: https://github.com/freebsd/freebsd-ports/blob/main/sysutils/ocijail/Makefile
- Upstream `ocijail` README: https://github.com/dfr/ocijail/blob/main/README.md
- Podman FreeBSD storage defaults: https://github.com/containers/podman/blob/main/vendor/go.podman.io/storage/storage.conf-freebsd
- Podman FreeBSD resource validation code: https://github.com/containers/podman/blob/main/pkg/specgen/generate/validate_freebsd.go

## Issues Found
- The supported FreeBSD version was outdated. The post said FreeBSD 13.1+ / 14.0 recommended, but current upstream Podman documentation marks the FreeBSD port as experimental and supported on FreeBSD 14.3 and newer. I corrected the prerequisite and conclusion language.
- The runtime model was described too narrowly. The post implied Podman on FreeBSD is mainly Linux-container support via Linux emulation, but upstream FreeBSD packaging and `ocijail` show that Podman uses a jail-based OCI runtime on FreeBSD and can run native FreeBSD container images as well. I corrected the description, introduction, and first-run example accordingly.
- Linux container examples were missing the required platform selection. Upstream Podman documents `--os=linux` for Linux images on FreeBSD. I updated the Linux `pull`, `run`, web server, volume, pod, networking, and service examples to use `--os=linux`.
- The initial FreeBSD setup was incomplete. Upstream installation docs require `fdescfs` on `/dev/fd` for restart-policy support. I added that requirement.
- The `rc.d` section used a custom service script instead of the packaged FreeBSD `podman` service. The official port already installs an rc script for restarting containers with restart policies. I replaced the custom script with the supported `service podman enable` / `service podman start` workflow.
- The PF guidance was incorrect and incomplete. The post used ad hoc PF rules, but upstream FreeBSD Podman docs require the provided `pf.conf.sample`, interface configuration, and `net.pf.filter_local=1` for localhost-to-container redirects. I replaced the firewall section with the documented setup.
- The resource-limits section was inaccurate. It claimed FreeBSD `rctl`-based enforcement while showing Linux-style `--memory` and `--cpus` flags. Upstream Podman FreeBSD code explicitly notes that FreeBSD has no cgroups in this path. I removed the incorrect limit example and kept resource-usage monitoring with `podman stats`.
- The build example assumed a Linux base image without selecting the Linux OS, and used `pip --break-system-packages` unnecessarily. I changed the build command to `podman build --os=linux ...` and removed the unnecessary pip flag.

## Review Notes
- The post is now technically aligned with current upstream guidance, but the FreeBSD port remains experimental and is best framed for evaluation and testing rather than production deployment.
- Native FreeBSD OCI images and Linux OCI images are both relevant on FreeBSD; Linux images require the Linux compatibility layer and explicit OS selection in the examples used here.
