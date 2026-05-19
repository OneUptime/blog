# Validation Summary: How to Configure systemd-tmpfiles for Temporary Directory Management on Ubuntu

## Status
validated

## Post Type
Tutorial / system administration guide

## Technologies Covered
- Ubuntu
- systemd-tmpfiles
- tmpfiles.d configuration
- systemd services and timers
- Linux filesystem permissions and ownership

## Sources Consulted
- systemd tmpfiles.d official manual: https://www.freedesktop.org/software/systemd/man/tmpfiles.d.html
- systemd-tmpfiles official manual: https://www.freedesktop.org/software/systemd/man/systemd-tmpfiles.html
- Local Ubuntu systemd 255.4 man pages for `tmpfiles.d(5)` and `systemd-tmpfiles(8)`
- Local Ubuntu `systemd-tmpfiles --help` and `systemd-tmpfiles --version` output

## Issues Found
- The post said `-` in the User and Group fields means root. The tmpfiles.d manual defines it as the invoking user/group; for system services this is normally root. Updated the field descriptions to reflect that distinction.
- The post described `D` as removing contents on boot. `D` removes directory contents when `systemd-tmpfiles --remove` is used, which commonly happens during boot. Updated the type table to state the actual operation.
- The post used `F` as the create-or-truncate file type. The official synopsis documents this as `f+`; updated the table and example to use `f+`.
- The recursive `Z` examples used plain modes that could set unsuitable execute bits on regular files or remove execute bits from directories. Updated them to use `~0750`, which preserves non-executable files as non-executable while correcting ownership recursively.
- The manual command section used `systemd-tmpfiles --create --dry-run`, but Ubuntu systemd 255 does not support `--dry-run`. Replaced it with `systemd-tmpfiles --cat-config` for inspecting merged configuration, and updated the summary accordingly.
- The subdirectory cleanup section incorrectly said `d` only cleans the immediate directory and that `!` before the age enables recursive cleanup. Age-based cleanup applies below the configured directory by default, while `!` is a boot-only type modifier. Rewrote the section to describe default cleanup and `x` exclusions.
- The web application example defined `/run/webapp` twice with `D` and `d`, which creates a conflicting duplicate path rule. Removed the redundant `d` rule.
- The configuration precedence note omitted `/run/tmpfiles.d/` from the same-name override explanation. Updated it to include both `/run/tmpfiles.d/` and `/usr/lib/tmpfiles.d/`.

## Review Notes
The post is technically relevant and valid after the corrections. For services with straightforward runtime, state, cache, log, or configuration directory needs, systemd unit directives such as `RuntimeDirectory=`, `StateDirectory=`, `CacheDirectory=`, `LogsDirectory=`, and `ConfigurationDirectory=` may be preferable to tmpfiles.d, as noted in the official tmpfiles.d manual.
