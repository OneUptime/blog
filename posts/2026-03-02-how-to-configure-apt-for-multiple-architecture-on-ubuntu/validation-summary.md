# Validation Summary: How to Configure APT for Multiple Architecture on Ubuntu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ubuntu
- APT and apt-get
- dpkg multi-architecture support
- APT sources.list and DEB822 .sources files
- Ubuntu ports repositories
- ARM64 cross-compilation with GCC/G++
- QEMU user-mode emulation
- CMake cross-compilation toolchain files
- Docker Buildx multi-platform builds

## Sources Consulted
- Ubuntu manpage: sources.list(5) - https://manpages.ubuntu.com/manpages/noble/man5/sources.list.5.html
- Ubuntu manpage: dpkg(1) - https://manpages.ubuntu.com/manpages/kinetic/man1/dpkg.1.html
- Ubuntu Wiki: MultiarchSpec - https://wiki.ubuntu.com/MultiarchSpec
- Ubuntu package metadata via apt-cache for libc6:i386, libncurses6:i386, libstdc++6:i386, lib32gcc-s1, lib32stdc++6, libgl1:i386, steam:i386
- Ubuntu package page for libncurses6 in Noble - https://packages.ubuntu.com/noble/libncurses6
- Launchpad package page for libgl1 in Noble - https://launchpad.net/ubuntu/noble/+package/libgl1
- CMake toolchains documentation - https://cmake.org/cmake/help/latest/manual/cmake-toolchains.7.html
- QEMU user-mode documentation - https://qemu-project.gitlab.io/qemu/user/index.html
- Dockerfile reference for automatic platform ARGs - https://docs.docker.com/reference/builder
- Docker Buildx build reference - https://docs.docker.com/engine/reference/commandline/build

## Issues Found
- The post said Ubuntu 22.04 and later use DEB822 sources by default. Updated this to say APT supports DEB822 and Ubuntu 24.04 and later use it by default for Ubuntu repositories.
- The legacy sources section implied only Ubuntu 20.04 and older use the traditional one-line format. Updated the wording to include Ubuntu 22.04 and any system still using one-line sources.
- The focal security repository examples used archive.ubuntu.com. Changed security lines to security.ubuntu.com and added the missing i386 security source.
- The 32-bit OpenGL package example used libGL:i386, which is not a valid Ubuntu package name. Replaced it with libgl1:i386.
- The 32-bit ncurses example used libncurses5:i386, which is not available in current Ubuntu Noble package metadata. Replaced it with libncurses6:i386.
- The ARM64 cross-compilation apt-get install example placed comments after line-continuation backslashes, which would break the shell command. Moved comments to separate lines and kept the command syntactically valid.
- The ARM64 setup did not warn that existing archive.ubuntu.com sources must be architecture-restricted before adding arm64 from ports. Added a short note before the ports source snippet.
- The QEMU example ran a dynamically linked ARM64 binary without an ARM64 library prefix. Updated it to use qemu-aarch64-static -L /usr/aarch64-linux-gnu ./hello-arm64.
- The apt-cache example for showing architectures used apt-cache showpkg output in a way that did not reliably show architectures. Replaced it with apt-cache policy libssl-dev:amd64 libssl-dev:i386.
- The broad package-search pipeline passed package descriptions into xargs. Added cut to pass only package names.

## Review Notes
The Docker Buildx TARGETARCH example is correct when ARG TARGETARCH is declared inside the build stage, as shown. Some package availability still depends on the enabled Ubuntu components, release, and mirror architecture coverage.
