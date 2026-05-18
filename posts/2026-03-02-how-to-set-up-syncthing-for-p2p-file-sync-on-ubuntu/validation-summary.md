# Validation Summary: How to Set Up Syncthing for P2P File Sync on Ubuntu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Syncthing (file synchronization)
- Ubuntu / Debian APT package management
- systemd (user and system services)
- SSH tunneling
- Syncthing REST API
- `.stignore` file patterns
- `stdiscosrv` (Syncthing discovery server)
- `strelaysrv` (Syncthing relay server)
- UFW (Uncomplicated Firewall)

## Sources Consulted
- [Syncthing firewall/port documentation](https://docs.syncthing.net/users/firewall.html)
- [Syncthing configuration documentation](https://docs.syncthing.net/users/config.html)
- [Syncthing command line documentation](https://docs.syncthing.net/users/syncthing.html)
- [Syncthing v2.0.0 syncthing serve docs](https://docs.syncthing.net/v2.0.0/users/syncthing.html)
- [stdiscosrv documentation](https://docs.syncthing.net/users/stdiscosrv.html)
- [strelaysrv documentation](https://docs.syncthing.net/users/strelaysrv.html)
- [POST /rest/system/reset documentation](https://docs.syncthing.net/rest/system-reset-post.html)
- [Syncthing v2.0.0 release notes](https://github.com/syncthing/syncthing/releases/tag/v2.0.0)
- [pkg.go.dev stdiscosrv](https://pkg.go.dev/github.com/syncthing/syncthing/cmd/stdiscosrv)
- [pkg.go.dev strelaysrv](https://pkg.go.dev/github.com/syncthing/syncthing/cmd/strelaysrv)
- [Syncthing forum: config moved to .local/state](https://forum.syncthing.net/t/configuration-moved-from-config-syncthing-to-local-state-syncthing/21266)

## Issues Found

1. **Wrong CLI form for fetching the device ID.** The post used `syncthing -device-id`. The current documented command (Syncthing v2) uses the subcommand form: `syncthing device-id`. Updated.

2. **Incorrect description of port 22000/udp.** The post described `22000/udp` as "relay transport". Per the official firewall docs, `22000/udp` is "QUIC based sync protocol traffic" — i.e. direct sync over QUIC between peers, not relay traffic (relay traffic uses `22067/tcp` on the relay server). Updated the comment to reflect QUIC sync transport. Also tightened the `22000/tcp` and `21027/udp` comments to match the docs (broadcasts on IPv4, multicast on IPv6).

3. **Outdated configuration directory path.** The post referenced `~/.config/syncthing/config.xml`. Since Syncthing v1.27.0 (and standard for v2.x), the default on Unix-like systems is `$XDG_STATE_HOME/syncthing` (i.e. `~/.local/state/syncthing`). Updated the two `config.xml` references to use the current default while noting the legacy `~/.config/syncthing` path for existing installs.

4. **Outdated/incorrect database reset procedure.** The troubleshooting section instructed users to `rm -rf ~/.config/syncthing/index-v0.14.0.db/`. This is doubly out of date: (a) the path is wrong for v1.27.0+/v2.x installs, and (b) Syncthing v2.0.0 switched the backend from LevelDB to SQLite, so the `index-v0.14.0.db/` directory no longer exists in that form (v2 uses one SQLite database per folder). Furthermore, the `--reset-database` CLI flag was removed in v2. Replaced the procedure with the documented, version-agnostic approach: `POST /rest/system/reset` via the REST API (optionally scoped to a single folder via the `folder` query parameter).

## Review Notes

- The APT repository setup (gpg dearmor + `signed-by=` keyring + `apt.syncthing.net` with `syncthing stable` suite) is current and correct.
- The user service (`systemctl --user enable --now syncthing`) and system template unit (`syncthing@user`) usage is correct.
- The default GUI bind address `127.0.0.1:8384` is correct.
- The REST API endpoints used (`/rest/config/folders`, `/rest/config/devices`, `/rest/db/status`, `/rest/db/completion`, `/rest/system/status`, `/rest/events`) are all current and valid.
- The `go install github.com/syncthing/syncthing/cmd/stdiscosrv@latest` and `go install github.com/syncthing/syncthing/cmd/strelaysrv@latest` paths are correct (confirmed via pkg.go.dev). For production use, the documentation also suggests the `syncthing-discosrv` and `syncthing-relaysrv` APT packages as an alternative — worth mentioning in a future revision but not a correctness issue.
- The default ports for `stdiscosrv` (`:8443`) and `strelaysrv` (`:22067`, status `:22070`) match the documented defaults.
- The `.stignore` description of `*` as "matches any single path component" is informal but acceptable; strictly it matches any sequence of characters not containing a path separator. Not changed.
- The systemd-based stop/start in the original troubleshooting block was retained implicitly via the REST reset approach; users on older Syncthing versions can still fall back to manually deleting `index-*` files, but the REST endpoint is the official, supported path.
