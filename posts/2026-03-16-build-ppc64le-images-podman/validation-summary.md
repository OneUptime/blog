# Validation Summary: How to Build ppc64le Images with Podman

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Podman
- Containerfile/Dockerfile syntax
- QEMU user-mode emulation
- Linux binfmt_misc
- ppc64le / IBM Power container images
- Red Hat UBI 9 Minimal
- Go cross-compilation

## Sources Consulted
- Podman build documentation: https://docs.podman.io/en/v5.5.2/markdown/podman-build.1.html
- Podman image inspect documentation: https://docs.podman.io/en/latest/markdown/podman-image-inspect.1.html
- Podman farm documentation: https://docs.podman.io/en/v5.3.0/markdown/podman-farm.1.html
- Podman farm build documentation: https://docs.podman.io/en/latest/markdown/podman-farm-build.1.html
- Dockerfile reference for ARG and FROM behavior: https://docs.docker.com/reference/builder/
- Go supported GOOS/GOARCH list: https://go.dev/doc/install/source
- QEMU user-static ppc64le Debian manpage: https://manpages.debian.org/bookworm/qemu-user-static/qemu-ppc64le-static.1.en.html
- Fedora qemu-user-static package information: https://packages.fedoraproject.org/pkgs/qemu/qemu-user-static/
- Fedora qemu-user-static-ppc package information: https://packages.fedoraproject.org/pkgs/qemu/qemu-user-static-ppc/
- Red Hat UBI 9 Minimal documentation: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/building_running_and_managing_containers/building_running_and_managing_containers

## Issues Found
- The Go Containerfile example used `GO_VERSION` in `FROM golang:${GO_VERSION}` before declaring the build argument. Dockerfile syntax requires variables used in `FROM` to be declared by an `ARG` instruction before the first `FROM`. Added `ARG GO_VERSION=1.21` before the `FROM` instruction so the example works with the shown `--build-arg GO_VERSION=1.21` command and has a sensible default.

## Review Notes
- Podman was not installed in the local environment, so CLI behavior was verified against official Podman documentation rather than local `--help` output.
- The post's use of `--platform linux/ppc64le`, `--memory`, image inspection templates, QEMU user-static, Red Hat UBI Minimal with `microdnf`, and Podman farm guidance matches the consulted documentation.
