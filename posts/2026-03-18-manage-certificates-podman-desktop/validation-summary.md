# Validation Summary: How to Manage Certificates in Podman Desktop

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Podman
- Podman Desktop
- Podman machine
- Container registry TLS certificates
- containers-certs.d
- containers-registries.conf
- OpenSSL
- Linux, macOS, and Debian/RHEL certificate trust stores

## Sources Consulted
- Podman documentation: podman-pull, including `--cert-dir` and `--tls-verify`: https://docs.podman.io/en/latest/markdown/podman-pull.1.html
- Podman documentation: podman-push, including `--cert-dir` and `--tls-verify`: https://docs.podman.io/en/stable/markdown/podman-push.1.html
- Podman Desktop documentation: Adding certificates to a Podman machine: https://podman-desktop.io/docs/podman/adding-certificates-to-a-podman-machine
- containers-certs.d(5) manual page: https://manpages.debian.org/testing/golang-github-containers-image/containers-certs.d.5.en.html
- containers-registries.conf(5) manual page: https://www.mankier.com/5/containers-registries.conf

## Issues Found
- The debugging section said `podman info --format '{{.Registries}}'` checks what certificates Podman is using. This output reports registry configuration, not the certificate files themselves. I changed the comment to "Check registry configuration Podman is using" while keeping the command.

## Review Notes
The certificate directory examples are technically correct for local Linux Podman. On macOS and other remote-client setups, registry trust usually needs to be configured inside the Podman machine VM, which the post covers in a separate section. The `--cert-dir` option exists for pull and push but is not available with the remote Podman client on macOS and Windows, so future revisions could mention that caveat if expanding the guide.
