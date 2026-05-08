# Validation Summary: How to Troubleshoot Podman Farm Build Failures

## Status
validated

## Post Type
Tutorial / Troubleshooting guide

## Technologies Covered
- Podman farm builds
- Podman system connections
- Podman remote SSH connections
- Podman system service socket
- Containerfile builds
- `.containerignore`
- Linux SSH and systemd user services

## Sources Consulted
- Podman farm overview: https://docs.podman.io/en/latest/markdown/podman-farm.1.html
- Podman farm build command: https://docs.podman.io/en/latest/markdown/podman-farm-build.1.html
- Podman farm list command and format fields: https://docs.podman.io/en/stable/markdown/podman-farm-list.1.html
- Podman system connection command: https://docs.podman.io/en/latest/markdown/podman-system-connection.1.html
- Podman system connection add command: https://docs.podman.io/en/latest/markdown/podman-system-connection-add.1.html
- Podman global remote connection options: https://docs.podman.io/en/latest/markdown/podman.1.html
- Podman info command: https://docs.podman.io/en/latest/markdown/podman-info.1.html
- Podman version command: https://docs.podman.io/en/latest/markdown/podman-version.1.html
- Podman build command and `.containerignore` behavior: https://docs.podman.io/en/latest/markdown/podman-build.1.html
- Podman system df command: https://docs.podman.io/en/latest/markdown/podman-system-df.1.html
- Podman system prune command: https://docs.podman.io/en/stable/markdown/podman-system-prune.1.html
- Podman system service command: https://docs.podman.io/en/latest/markdown/podman-system-service.1.html

## Issues Found
- The custom socket path example embedded the socket path directly in the SSH URI. Podman supports SSH URLs with paths, but the current `podman system connection add` documentation presents custom remote sockets through the `--socket-path` option. Updated the example to use `--socket-path /run/user/1001/podman/podman.sock builder@arm64.example.com`.
- The disk-space example assumed system connection names also map to DNS hostnames, which is not guaranteed. Replaced the direct `ssh builder@${CONN}.example.com "df -h /"` command with `podman --connection "${CONN}" system df`, and kept the remote storage root output through `podman system info`.
- The diagnostic script parsed `.Connections` as comma-separated output, but Podman documents farm connections as a list rendered like `[f38 f37]` in template output. Updated the template to range over `.Connections` and emit one connection per line.
- The farm existence check used a regular expression grep, which could mis-handle farm names containing regex metacharacters. Changed it to `grep -Fxq` for exact literal matching.

## Review Notes
Podman was not installed in the local workspace, so CLI verification was performed against the current official Podman documentation rather than local `--help` output. The diagnostic script was syntax-checked with `bash -n` after edits.
