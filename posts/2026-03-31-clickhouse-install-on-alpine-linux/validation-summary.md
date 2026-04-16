# Validation Summary: How to Install ClickHouse on Alpine Linux

## Status
validated

## Post Type
Tutorial / Installation Guide

## Technologies Covered
- ClickHouse (analytical database server)
- Alpine Linux (musl-based Linux distribution)
- OpenRC (Alpine's init system)
- Docker (container image build)
- apk (Alpine package manager)
- BusyBox utilities (addgroup/adduser)

## Sources Consulted
- ClickHouse official install script: https://clickhouse.com/ (inspected directly via curl)
- ClickHouse documentation: https://clickhouse.com/docs/en/install
- Alpine Linux package index: https://pkgs.alpinelinux.org/packages (verified `gcompat`, `libgcc`, `libstdc++`, `bash`, `curl`)
- OpenRC documentation / runscript reference: https://github.com/OpenRC/openrc
- BusyBox `adduser`/`addgroup` reference (Alpine ships these)

## Issues Found
- The original install command used `CLICKHOUSE_ARCH=amd64 sh`, but the official ClickHouse install script does not read a `CLICKHOUSE_ARCH` environment variable — it detects architecture and libc automatically with `uname -m` and `ldd --version`. On Alpine, the script auto-selects the dedicated `amd64musl` build. Removed the unused env var and added a clarifying comment about the musl auto-detection.

## Review Notes
- Because the install script auto-detects musl and downloads the `amd64musl` build, the `gcompat` package is generally not strictly required for the official statically-linked musl binary. It was left in place as a defensive measure (some auxiliary tools or future builds may still benefit), but readers running purely on the musl build can likely omit it along with `libgcc`/`libstdc++`.
- The OpenRC runscript syntax (`command`, `command_args`, `command_user`, `command_background`, `pidfile`, `depend()` block with `need net`) is valid for current OpenRC versions used by Alpine.
- The XML configuration uses the modern `<clickhouse>` root element (replacing the older `<yandex>` root), which is correct for current ClickHouse versions.
- The Dockerfile uses `alpine:3.19` — this is fine but readers may want to update to a newer Alpine tag (e.g., 3.20 or 3.21) at the time of deployment.
- The piped `curl ... | sh` in the Dockerfile would prompt interactively if a `clickhouse` file already exists in the working directory; in a fresh image build this is not a concern.
