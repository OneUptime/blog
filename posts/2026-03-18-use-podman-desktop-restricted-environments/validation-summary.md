# Validation Summary: How to Use Podman Desktop in Restricted Environments

## Status
validated

## Post Type
Guide

## Technologies Covered
- Podman
- Podman Desktop
- `containers.conf`
- `registries.conf`
- `certs.d`
- `storage.conf`
- Local container registries
- Corporate proxies and custom CAs

## Sources Consulted
- Podman Desktop restricted environments and proxy guidance: https://podman-desktop.io/docs/proxy
- Podman Desktop Linux behavior: https://podman-desktop.io/docs/troubleshooting/troubleshooting-podman-on-linux
- Podman Desktop certificate guidance for Podman machines: https://podman-desktop.io/docs/podman/adding-certificates-to-a-podman-machine
- `podman save` reference: https://docs.podman.io/en/v5.6.0/markdown/podman-save.1.html
- `podman unshare` reference: https://docs.podman.io/en/v5.5.2/markdown/podman-unshare.1.html
- `podman machine ssh` reference: https://docs.podman.io/en/v5.2.0/markdown/podman-machine-ssh.1.html
- `containers.conf` reference: https://raw.githubusercontent.com/containers/common/main/docs/containers.conf.5.md
- `containers-registries.conf` reference: https://raw.githubusercontent.com/containers/image/main/docs/containers-registries.conf.5.md
- `containers-certs.d` reference: https://raw.githubusercontent.com/containers/image/main/docs/containers-certs.d.5.md
- `containers-storage.conf` reference: https://raw.githubusercontent.com/containers/storage/main/docs/containers-storage.conf.5.md

## Issues Found
- The opening claim overstated Podman Desktop's role and attributed rootless behavior directly to Podman Desktop. I rewrote the introduction to distinguish Podman from Podman Desktop and to note the Linux vs macOS/Windows behavior documented by Podman Desktop.
- Several examples used unqualified image names. I changed them to fully qualified references to avoid short-name ambiguity in restricted environments.
- The local registry section was labeled as a mirror, but the configuration shown was a local registry setup, not registry mirroring. I renamed the section accordingly.
- The local registry example attempted to `podman save` the registry image without pulling it first. I added the missing `podman pull` and corrected the `podman save` usage order.
- The local registry example pushed to `localhost:5000` before configuring that registry as insecure. I moved the `registries.conf` setup ahead of the push.
- The proxy configuration used undocumented `containers.conf` keys under `[engine]` and `[engine.env]`. I replaced them with the documented `[engine].env` array and `[containers].http_proxy = true`.
- The custom CA section suggested trusting a macOS host keychain entry, which is not sufficient for Podman Desktop's Podman machine. I replaced that with Podman machine certificate steps and narrowed the Linux system-wide trust example to RHEL, Fedora, and CentOS.
- The storage section said it was setting storage limits, but the snippet only configured storage location and overlay settings. I corrected the wording and used `$HOME` in `graphroot`.
- The air-gapped section claimed to block all external registries, but the configuration only blocked `docker.io` and `quay.io`. I corrected the wording to match the actual effect of the snippet.

## Review Notes
- On macOS and Windows, Podman Desktop configuration changes that affect Podman itself must be made inside the Podman machine, and the machine may need a restart before the changes take effect.
- For per-registry certificate trust, the `certs.d` directory name must match the registry host, including `host:port` when the registry uses a non-default port.
