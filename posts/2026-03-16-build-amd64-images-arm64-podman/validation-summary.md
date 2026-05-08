# Validation Summary: How to Build AMD64 Images on ARM64 with Podman

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Podman
- Podman Machine
- QEMU user-mode emulation
- Linux binfmt_misc
- Containerfile / Dockerfile multi-stage builds
- Multi-architecture container manifests
- Go cross-compilation
- Rust cross-compilation
- AWS Graviton / ECR CI workflows

## Sources Consulted
- Podman build manual: https://docs.podman.io/en/v5.5.2/markdown/podman-build.1.html
- Podman run manual: https://docs.podman.io/en/v3.3.0/markdown/podman-run.1.html
- Podman machine init manual: https://docs.podman.io/en/latest/markdown/podman-machine-init.1.html
- Podman machine set manual: https://docs.podman.io/en/stable/markdown/podman-machine-set.1.html
- Podman manifest create manual: https://docs.podman.io/en/latest/markdown/podman-manifest-create.1.html
- Podman manifest push manual: https://docs.podman.io/en/latest/markdown/podman-manifest-push.1.html
- Podman Desktop Rosetta documentation: https://podman-desktop.io/docs/podman/rosetta
- Fedora qemu-user-static package information: https://packages.fedoraproject.org/pkgs/qemu/qemu-user-static/
- Fedora qemu-user-binfmt package information: https://packages.fedoraproject.org/pkgs/qemu/qemu-user-binfmt/
- Dockerfile build variables reference for platform ARG behavior: https://docs.docker.com/build/building/variables/

## Issues Found
- The Fedora/RHEL setup installed only `qemu-user-static`, but current Fedora packaging separates binfmt registration into `qemu-user-binfmt`. Updated the command to install both packages so `/proc/sys/fs/binfmt_misc/qemu-x86_64` can be registered.
- The macOS sections said QEMU is bundled and automatically used by Podman Machine. Current Podman Desktop documentation states Apple Silicon machines use Rosetta by default and fall back to QEMU if Rosetta is disabled. Updated the wording to "x86_64 translation" and clarified the Rosetta/QEMU behavior.
- The setup verification message implied the absence of `/proc/sys/fs/binfmt_misc/qemu-x86_64` always means a Podman machine with bundled QEMU. Updated it to cover both Podman Machine and unregistered binfmt cases.
- The testing section ran `file /usr/local/bin/app` in an Alpine runtime image that does not install the `file` package. Updated the command to install `file` temporarily inside the test container before inspecting the binary.
- The summary said AMD64 images on ARM64 require QEMU emulation. Podman's build documentation is more precise: foreign-architecture `RUN` instructions require emulation, while other build steps may not. Updated the summary to distinguish emulation/translation for `RUN` instructions from general image targeting with `--platform`.

## Review Notes
The examples are otherwise technically sound as illustrative snippets. The Go and Rust cross-compilation examples assume conventional project files and may need project-specific dependency or linker adjustments for non-trivial applications, especially Rust crates with native C dependencies.
