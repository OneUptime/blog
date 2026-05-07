# Validation Summary: How to Fix Podman Machine Not Starting on macOS

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Podman
- Podman machine
- macOS virtualization
- Apple Hypervisor Framework
- libkrun
- QEMU
- gvproxy
- SSH
- Homebrew

## Sources Consulted
- Podman `podman-machine` documentation: https://docs.podman.io/en/latest/markdown/podman-machine.1.html
- Podman `podman-machine-init` documentation: https://docs.podman.io/en/latest/markdown/podman-machine-init.1.html
- Podman `podman-machine-inspect` documentation: https://docs.podman.io/en/stable/markdown/podman-machine-inspect.1.html
- Podman `podman-machine-list` documentation: https://docs.podman.io/en/stable/markdown/podman-machine-list.1.html
- Podman `podman-machine-info` documentation: https://docs.podman.io/en/stable/markdown/podman-machine-info.1.html
- Podman `podman-machine-start` documentation: https://docs.podman.io/en/latest/markdown/podman-machine-start.1.html
- Podman `podman-machine-reset` documentation: https://docs.podman.io/en/latest/markdown/podman-machine-reset.1.html
- Podman Desktop macOS troubleshooting documentation: https://podman-desktop.io/docs/troubleshooting/troubleshooting-podman-on-macos
- Apple Hypervisor Framework documentation: https://developer.apple.com/documentation/hypervisor

## Issues Found
- The post described Apple Hypervisor Framework as the default backend on macOS 12.0 and later. Current Podman documentation lists `libkrun` as the default macOS provider and `applehv` as an alternative, so the provider list was corrected.
- The post described QEMU as a current fallback backend. Current Podman documentation no longer lists QEMU as a macOS provider, while Podman Desktop troubleshooting still documents QEMU failures for older installations. The wording now limits QEMU guidance to older Podman versions and legacy troubleshooting.
- The manual image download example used a QEMU-style `fedora-coreos.qcow2` filename. Current Podman machine images are Podman-provided machine OS images, often provider-specific. The example was changed to a generic Podman machine image filename.
- The Hypervisor diagnostic used `/usr/bin/hv_test`, which is not an Apple-documented diagnostic. Apple documents `sysctl kern.hv_support` for runtime Hypervisor API availability, so the command was replaced and the entitlement explanation was corrected.
- The SSH key troubleshooting commands assumed keys live in `~/.ssh/podman-machine-default`. Current `podman machine inspect` exposes `.SSHConfig.IdentityPath`, so the post now uses that field to locate the actual key.
- The stuck-machine process cleanup omitted `krunkit`, which is relevant for the current `libkrun` provider. The process pattern now includes `krunkit`.
- The clean-install command used `podman machine rm --all --force`, but current Podman machine removal documentation does not define `--all`. The post now uses `podman machine reset --force`, which is documented to remove all machines and machine environment data.
- The verification command used the short image name `hello-world`. It was changed to the fully qualified `docker.io/library/hello-world` image to avoid short-name registry ambiguity.
- The debug examples placed `--log-level=debug` after the machine subcommand. Since `--log-level` is a Podman global option and `podman machine start` does not list it as a command-specific option, the examples now use `podman --log-level=debug machine ...`.
- The conclusion suggested switching between Apple Hypervisor and QEMU backends for persistent issues. Current wording now recommends switching between the default provider and Apple Hypervisor provider.

## Review Notes
Podman was not installed in the local review environment, so CLI verification used official documentation instead of local `--help` output. Some QEMU troubleshooting remains because it is still useful for older Podman installations and is covered by Podman Desktop troubleshooting documentation.
