# Validation Summary: How to Configure Podman Remote API

## Status
validated

## Post Type
Tutorial / Guide — step-by-step walkthrough of configuring the Podman Remote API with SSH, TLS, REST API examples, and Python/Go SDK integration.

## Technologies Covered
- Podman (system service, sockets, connections)
- systemd (user and system socket activation, service units, timers)
- OpenSSL (CA, server, and client certificate generation, SAN extensions, mTLS)
- SSH (key auth, tunneling for remote Podman access)
- curl (Unix-socket and HTTPS API calls with client certs)
- Podman REST API / libpod endpoints (`/info`, `/containers`, `/images`, `/_ping`)
- Podman Python SDK (`podman-py` / `PodmanClient`)
- Podman Go bindings (`github.com/containers/podman/v5/pkg/bindings`, `specgen`)
- firewalld and iptables

## Sources Consulted
- Podman `system service` man page: https://docs.podman.io/en/latest/markdown/podman-system-service.1.html (confirmed `--tls-cert`, `--tls-key`, `--tls-client-ca` flags)
- Podman 5.7 release notes / announcements regarding TLS and mTLS support for `podman system service` (feature added in 5.7)
- Podman libpod REST API reference: https://docs.podman.io/en/latest/_static/api.html (current API version 5.0.0; `/v4.0.0/libpod/...` paths remain compatible)
- Go bindings package: https://pkg.go.dev/github.com/containers/podman/v5/pkg/bindings (verified `NewConnection(ctx, uri) (context.Context, error)` signature)
- podman-py documentation for `PodmanClient`, `ContainersManager.run()`, `ImageNotFound`, and the `identity` keyword argument
- SpecGenerator JSON schema for the `portmappings` field and inner `container_port`/`host_port`/`protocol` keys

## Issues Found
1. **Version inconsistency — TLS flags require Podman 5.7+.** The post claimed Podman 4.9.0 in the `/info` response but used `--tls-cert`, `--tls-key`, and `--tls-client-ca` flags on `podman system service`, which were only added in Podman 5.7. Updated the example version output to `APIVersion: 5.0.0` / `Version: 5.7.0` so the TLS section is consistent with a version that actually supports those flags.
2. **Go SDK module path was v4.** Since TLS support requires Podman 5.7+, updated all `github.com/containers/podman/v4/...` import paths and the corresponding `go get` commands to the `v5` module path.
3. **Go code missing `strings` import.** `listContainers` called `strings.Repeat("-", 65)` but the `strings` package was not imported, so the program would not compile. Added `"strings"` to the import block.
4. **Architecture diagram listed wrong TLS port.** The Mermaid Architecture diagram labelled the TCP/TLS path as port 8080, while the rest of the post (systemd unit, firewall, curl, healthcheck) consistently uses 8443. Changed the diagram label to 8443.
5. **`podman system connection list` comment was wrong.** Said "the asterisk (*) indicates the default connection," but current Podman versions show a `Default` column with `true`/`false` (as the sample output in the post already shows). Corrected the comment to describe the actual output.
6. **Certificate-generation script clobbered key permissions.** The script ran `chmod 600 *-key.pem` and then `chmod 644 *.pem ca.pem *-cert.pem`. Because `*.pem` also matches `*-key.pem`, the second command silently weakened the private-key permissions back to 644. Reordered the chmods and dropped the redundant `*.pem` glob so `chmod 600 *-key.pem` runs last and is not overridden.
7. **Python example reversed nginx port mapping.** Used `ports={"8080/tcp": 80}` for an `nginx:alpine` container. The podman-py / docker-py format is `{container_port/protocol: host_port}`, and nginx listens on container port 80, so the mapping should be `{"80/tcp": 8080}`. Fixed the example call and updated the docstring example to match.

## Review Notes
- The libpod URL prefix `/v4.0.0/libpod/...` is intentionally kept throughout the curl/REST examples; Podman maintains backwards compatibility with previous API versions, so these paths still work against a Podman 5.7+ server. Authors can choose to migrate them to `/v5.0.0/libpod/...` in a future revision, but it is not required for correctness.
- The systemd timer in the "Health Monitoring" section references an implicit `podman-health.service` (timers without an explicit `Unit=` default to the service of the same name), but the matching `.service` unit that runs the healthcheck script is not shown. This is a documentation gap rather than a technical error in the timer file itself; readers will need to write a small service unit that runs `check-podman-api.sh`.
- The `podman system connection list` sample output shows a single-column `Identity` value. Newer Podman versions can additionally include a `ReadWrite` column; the existing minimal output still matches the standard `4.x` / early `5.x` format and was left as-is.
- The TLS section assumes Podman 5.7+; readers on older Podman releases will need to front the Unix socket with a reverse proxy (nginx, Caddy) or `stunnel`/`socat` to add TLS, since `podman system service` itself only learned native TLS in 5.7.
