# Validation Summary: How to View Container Logs Since a Specific Time in Podman

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Podman
- Container logging
- Bash shell commands
- Unix timestamps and RFC 3339 timestamps

## Sources Consulted
- Podman official documentation: `podman logs` manual page, https://docs.podman.io/en/v5.3.2/markdown/podman-logs.1.html
- RFC 3339, Date and Time on the Internet: Timestamps, https://www.ietf.org/rfc/rfc3339

## Issues Found
- The post described `2026-03-16T14:30:00` as RFC 3339 format. Podman supports that timezone-less date-time layout, but RFC 3339 date-time values include a timezone offset such as `Z` or `+00:00`. Updated the comments so the timezone-less example is labeled as a timestamp without timezone, and the `2026-03-16T14:30:00Z` example is labeled as RFC 3339.

## Review Notes
The local environment did not have the `podman` binary installed, so command validation was performed against the official Podman documentation rather than local `podman logs --help` output. Podman's documentation confirms `--since`, `--follow`/`-f`, `--tail`, and `--timestamps`/`-t`, and confirms that `--since` accepts Unix timestamps, supported date-formatted timestamps, and Go duration strings such as `10m` and `1h30m`.
