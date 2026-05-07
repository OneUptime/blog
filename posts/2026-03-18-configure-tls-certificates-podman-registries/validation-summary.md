# Validation Summary: How to Configure TLS Certificates for Podman Registries

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Podman
- Container registries
- TLS certificates
- Custom CA trust
- Mutual TLS client certificates
- OpenSSL
- Linux system trust stores

## Sources Consulted
- Podman `podman-pull(1)` documentation: https://docs.podman.io/en/latest/markdown/podman-pull.1.html
- Podman `podman-push(1)` documentation: https://docs.podman.io/en/stable/markdown/podman-push.1.html
- Podman `podman-login(1)` documentation: https://docs.podman.io/en/latest/markdown/podman-login.1.html
- `containers-certs.d(5)` manual page: https://man.archlinux.org/man/containers-certs.d.5.en
- Ubuntu `update-ca-certificates(8)` manual page: https://manpages.ubuntu.com/manpages/jammy/man8/update-ca-certificates.8.html
- Red Hat shared system certificates documentation: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/8/html/securing_networks/using-shared-system-certificates_securing-networks

## Issues Found
- The certificate directory description said the directory name must match the registry hostname and port. Current `containers-certs.d(5)` documents this as `host[:port]`, and the port must be present only when it is used in the image reference. Updated the wording and placeholder path accordingly.
- The certificate directory structure described `ca.crt` as the expected CA filename. Current `containers-certs.d(5)` accepts any `*.crt` file as a CA certificate, and client certificate/key pairs are selected by matching basename such as `client.cert` and `client.key`. Updated the structure comments to reflect the extension-based behavior.

## Review Notes
- Podman was not installed in the review environment, so local `podman --help` verification was not possible. The `--cert-dir` examples were verified against the current official Podman command documentation instead.
- The `--cert-dir` option is documented as unavailable for the remote Podman client, including Mac and Windows clients except WSL2. The post does not cover remote-client caveats, but the Linux-focused commands shown are otherwise accurate.
