# Validation Summary: How to Connect Portainer to a Remote Podman Socket

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer
- Podman
- systemd
- OpenSSH / SSH port forwarding
- TLS / mutual TLS
- OpenSSL
- curl

## Sources Consulted
- Portainer Documentation, "Add a Podman environment" - https://docs.portainer.io/admin/environments/add/podman
- Portainer Documentation, "Connect to the Podman Socket" - https://docs.portainer.io/admin/environments/add/podman/socket
- Portainer Documentation, "Does Portainer support Podman?" - https://docs.portainer.io/faqs/installing/does-portainer-support-podman
- Portainer Documentation, "Add an environment via the Portainer API" - https://docs.portainer.io/admin/environments/add/api
- Podman Documentation, "podman-system-service" - https://docs.podman.io/en/latest/markdown/podman-system-service.1.html
- `ssh(1)` manual page - https://man7.org/linux/man-pages/man1/ssh.1.html
- OpenSSL CLI help on the local system: `openssl req -help` and `openssl x509 -help` (OpenSSL 3.0.13)

## Issues Found
- The original post used rootless Podman commands and paths (`systemctl --user`, `/run/user/.../podman.sock`), but Portainer's official Podman support is for rootful Podman. I changed the examples to use the rootful system service and `/run/podman/podman.sock`, and I clarified the official support baseline in the prerequisites.
- The SSH tunnel example forwarded a TCP port but then tested a different Unix socket path that was never created. I changed the example to a Unix-socket forward (`ssh -L /tmp/podman.sock:/run/podman/podman.sock`) and updated the verification command to query the Podman Docker-compatible API over that forwarded socket.
- The Portainer socket configuration example used `unix:///tmp/podman.sock`, but Portainer's Podman socket workflow expects a socket path in the UI. I changed it to `/tmp/podman.sock` and added the missing note that the socket must be local to Portainer and mounted into the Portainer container if Portainer is containerized.
- The TLS-enabled `podman system service` example used invalid flags (`--tls-verify`, `--tlscacert`, `--tlscert`, `--tlskey`) for Podman. I replaced them with the supported flags documented by Podman: `--tls-cert`, `--tls-key`, and `--tls-client-ca`.
- The certificate-generation example omitted a Subject Alternative Name on the server certificate, which can break hostname verification in modern TLS clients. I updated the `openssl` commands to add SAN and appropriate extended key usages, and I added the missing step that installs the server-side TLS files into `/etc/podman/tls`.
- The TCP service section did not stop the socket-activated Podman unit even though Podman only supports one listening socket for the API service. I added `sudo systemctl disable --now podman.socket` before restarting the overridden `podman.service`.
- The "varlink/REST API" section was outdated and inconsistent: it referenced varlink, but the example tested the Libpod API while describing Docker compatibility. I renamed the section to manual Podman service mode and changed the verification call to the Docker-compatible `/v1.40/version` endpoint.
- The final TLS verification example now also uses `/v1.40/version` so it matches Podman's documented Docker v1.40 compatibility layer.

## Review Notes
- Portainer documents direct Podman socket connectivity as a legacy option and recommends the Edge Agent for most use cases.
- Portainer's official support is currently limited to CentOS Stream 9, Podman 5, and rootful mode. Other Linux distributions or rootless Podman setups may work, but they are not officially supported.
- The TLS example assumes Portainer connects using the same hostname or IP address embedded in the server certificate's Subject Alternative Name.
