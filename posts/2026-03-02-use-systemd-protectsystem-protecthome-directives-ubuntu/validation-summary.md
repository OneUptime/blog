# Validation Summary: How to Use systemd ProtectSystem and ProtectHome Directives on Ubuntu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- systemd (service unit hardening directives)
- Ubuntu (system administration)
- Nginx (hardening example)
- Node.js (hardening example)
- journalctl, strace, systemctl, systemd-analyze (diagnostic tooling)

## Sources Consulted
- systemd.exec(5) man page (`ProtectSystem=`, `ProtectHome=`, `ReadWritePaths=`, `ReadOnlyPaths=`, `InaccessiblePaths=`, `RuntimeDirectory=`, `StateDirectory=`, `CacheDirectory=`, `LogsDirectory=`, `RuntimeDirectoryMode=`, `RuntimeDirectoryPreserve=`, `PrivateTmp=`, `PrivateDevices=`, `NoNewPrivileges=`, `RestrictAddressFamilies=`)
- https://www.freedesktop.org/software/systemd/man/latest/systemd.exec.html
- systemd-analyze(1) man page (security verb, added in systemd v240)

## Issues Found
1. **ProtectSystem=true scope** — The post said only `/usr` and `/boot` are mounted read-only. Per systemd.exec(5), `ProtectSystem=true` mounts `/usr/` **and the boot loader directories (`/boot` and `/efi`)** read-only. Updated the description and the bulleted list to include `/efi`.
2. **ProtectSystem=full scope** — Same omission of `/efi`. Updated the heading sentence to list `/usr`, `/boot`, `/efi`, and `/etc`.
3. **ProtectSystem=strict writable locations** — The post listed `/proc/self/` as a "writable location" under strict. This is misleading: per the man page, the entire filesystem is mounted read-only "except for the API file system subtrees `/dev/`, `/proc/` and `/sys/`" — those three subtrees are not affected by `ProtectSystem` at all (they need separate directives like `PrivateDevices=`, `ProtectKernelTunables=`, `ProtectControlGroups=` to restrict). Rewrote the bullet to reflect that.
4. **ProtectHome=tmpfs behavior** — The post claimed the tmpfs is "writable" and "changes are lost when the service restarts." This is incorrect. Per systemd.exec(5): "If set to 'tmpfs', temporary file systems are mounted on the three directories **in read-only mode**." Writes to the tmpfs are denied outright — they do not succeed and then disappear. Rewrote the section to describe the read-only behavior and the typical use case (hiding home directory contents, optionally exposing specific paths via `BindPaths=`/`BindReadOnlyPaths=`).

## Review Notes
- All other directives in the post (`ReadWritePaths=`, `ReadOnlyPaths=`, `InaccessiblePaths=`, `RuntimeDirectory=`, `StateDirectory=`, `CacheDirectory=`, `LogsDirectory=`, `RuntimeDirectoryMode=`, `RuntimeDirectoryPreserve=`, `PrivateTmp=`, `PrivateDevices=`, `NoNewPrivileges=`, `RestrictAddressFamilies=`) are valid and correctly described.
- The nginx hardening example is realistic. Granting `ReadWritePaths=/run` is broad — a tighter alternative would be `RuntimeDirectory=nginx` (with appropriate `PIDFile=` placement), but the example matches how the upstream Debian/Ubuntu nginx package historically writes `/run/nginx.pid` directly. Left as-is since it works.
- The `strace` one-liner using `systemctl show -p MainPID … | cut -d= -f2` is correct (output is `MainPID=12345`).
- `systemd-analyze security` was introduced in systemd v240 (2018) and is available on all currently supported Ubuntu releases.
- The diagnostic statement "When a service breaks after applying these directives, the service attempts to write to a path that is now read-only or inaccessible" is slightly absolute — other sandboxing-related failures are possible (e.g., `PrivateDevices=true` blocking `/dev/kvm`) — but the section is scoped to filesystem directives, so this is acceptable framing.
