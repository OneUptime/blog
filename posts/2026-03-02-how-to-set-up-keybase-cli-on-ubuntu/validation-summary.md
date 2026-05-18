# Validation Summary: How to Set Up Keybase CLI on Ubuntu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Keybase CLI
- KBFS (Keybase Filesystem)
- Keybase Git
- Keybase Teams / Chat
- APT package management on Ubuntu
- systemd user services
- GPG / signing keys (apt keyring)

## Sources Consulted
- Keybase client source code on GitHub (https://github.com/keybase/client) — specifically `go/client/cmd_verify.go`, `cmd_sign.go`, `cmd_encrypt.go`, `cmd_git.go`, `cmd_fuse_osx.go`, `cmd_simplefs_stat.go`, `cmd_simplefs_sync_disable.go`, `cmd_ctl.go`, `cmd_signup.go`, `cmd_team_add_member.go`, `cmd_id.go`
- Keybase official documentation: https://keybase.io/docs/the_app/install_linux
- Keybase Book / docs: https://book.keybase.io/git, https://book.keybase.io/docs/server/our-code-signing-key
- Keybase systemd service unit reference: `packaging/linux/systemd/keybase.service` in keybase/client

## Issues Found

1. **`keybase verify` invalid flags.** The post used `keybase verify -S sender-username -i release.tar.gz -d -s release.tar.gz.sig`. The `-d/--detached` flag takes the signature filename as its value, and there is no `-s` flag. Fixed to `keybase verify -S sender-username -i release.tar.gz -d release.tar.gz.sig`.

2. **`keybase encrypt -s` was wrong.** The post used `keybase encrypt -s recipient-username ...` claiming `-s` meant "sign". The `keybase encrypt` command has no `-s` shortcut; signing is enabled by default via `--auth-type=signed`. Removed the `-s` flag and updated the comment to explain that encryption signs by default.

3. **`keybase git clone` is not a real subcommand.** The `keybase git` subcommand set is `create`, `delete`, `list`, `gc`, `settings`, `lfs-config`, `archive`. Removed the `keybase git clone ...` line and clarified that plain `git clone keybase://...` is the only way.

4. **`keybase fuse mount` is not a real command on Linux.** `keybase fuse` exists only on macOS and only supports `status`. KBFS mounts automatically as part of `run_keybase`. Replaced the section with guidance to restart the service via `keybase ctl stop && run_keybase`, and to check status with `keybase status` and `keybase fs ls /keybase`.

5. **`keybase fs stat /keybase` is the wrong tool for checking mount status.** Replaced with `keybase fs ls /keybase` (and `keybase status` for overall service/mount state).

6. **`keybase fs sync disable` requires a path argument.** The post invoked it with none. Added a sample path (`/keybase/private/yourusername`).

7. **`keybase clear-cached-public-key` is not a real CLI command.** No such top-level subcommand exists in the keybase/client repo. Removed the line; the surrounding `keybase ctl reload` (which is valid) is sufficient guidance.

8. **`keybase id github://their-github-username` uses an unsupported assertion format.** Keybase user assertions use the `user@service` syntax. Changed to `their-github-username@github`.

## Review Notes

- `keybase ctl reload` is a valid subcommand of `keybase ctl` (alongside `start`, `stop`, `restart`, `log-rotate`, `watchdog`, `app-exit`, `wait`), so it was left in place.
- `keybase sign -i release.tar.gz -d -o release.tar.gz.sig` is correct — `-d` is a boolean detached-signature flag for `keybase sign` (distinct from `keybase verify`, where `-d` takes the signature path).
- The APT signing key URL `https://keybase.io/docs/server_security/code_signing_key.asc` is current.
- The systemd unit shown is a simplified version of Keybase's official upstream unit (which uses `Type=notify`, a socket-activated `keybase.socket`, and environment files under `~/.config/keybase/`). The post's minimalist version will work for most users but lacks socket activation; this is a viable trade-off for simplicity and was left as-is.
- The post does not pin a Keybase version, which is fine since most of the commands have been stable for several years, but readers should run `keybase version` to check what they have.
