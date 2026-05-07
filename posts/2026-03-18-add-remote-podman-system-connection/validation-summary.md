# Validation Summary: How to Add a Remote Podman System Connection

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Podman
- Podman remote client and system connections
- Podman REST API service
- systemd user and system sockets
- SSH key authentication
- Bash scripting

## Sources Consulted
- Podman `podman-system-connection-add` official documentation: https://docs.podman.io/en/latest/markdown/podman-system-connection-add.1.html
- Podman `podman-system-connection` official documentation: https://docs.podman.io/en/latest/markdown/podman-system-connection.1.html
- Podman `podman-system-connection-list` official documentation: https://docs.podman.io/en/v5.2.2/markdown/podman-system-connection-list.1.html
- Podman `podman-system-service` official documentation: https://docs.podman.io/en/latest/markdown/podman-system-service.1.html
- Podman remote client official documentation: https://docs.podman.io/en/stable/markdown/podman-remote.1.html
- Podman REST API documentation for `_ping`: https://docs.podman.io/en/latest/_static/api.html
- Podman `podman-version` official documentation: https://docs.podman.io/en/v5.5.2/markdown/podman-version.1.html
- Podman `podman-info` official documentation: https://docs.podman.io/en/stable/markdown/podman-info.1.html
- Podman `podman-system-df` official documentation: https://docs.podman.io/en/latest/markdown/podman-system-df.1.html

## Issues Found
- The post said remote connections require SSH key-based authentication. Podman supports SSH keys, ssh-agent, and password/passphrase prompts, so this was changed to say remote connections commonly use SSH key-based authentication.
- The rootful example added the connection before enabling the rootful system socket. The sequence was reordered so the socket is enabled before verifying the connection target.
- The manual API troubleshooting command used `/v4.0.0/libpod/_ping`. Podman's `_ping` endpoint is documented as not versioned, so the command was changed to `/libpod/_ping`.

## Review Notes
- The local environment did not have Podman installed, so CLI flags and behavior were checked against official Podman documentation rather than local `--help` output.
- The connection URI examples match the documented Podman remote URL form where SSH URLs include an explicit Unix socket path.
- Rootful SSH examples assume the SSH key has also been authorized for the `root` account on the remote host.
