# Validation Summary: How to Set Up ClickHouse with SSH Tunneling

## Status
validated

## Post Type
Tutorial / How-to guide

## Technologies Covered
- ClickHouse (HTTP interface on port 8123, native TCP on port 9000)
- OpenSSH client (`ssh`, `-L`, `-J`, `-f`, `-N` flags)
- `ssh_config` directives (`LocalForward`, `ProxyJump`, `ServerAliveInterval`, `ServerAliveCountMax`, `IdentityFile`)
- autossh
- `clickhouse-client` CLI
- curl against ClickHouse HTTP endpoint

## Sources Consulted
- ClickHouse HTTP interface docs — https://clickhouse.com/docs/en/interfaces/http (default port 8123)
- ClickHouse native TCP interface docs — https://clickhouse.com/docs/en/interfaces/tcp (default port 9000)
- ClickHouse `clickhouse-client` CLI reference — https://clickhouse.com/docs/en/interfaces/cli
- OpenSSH `ssh(1)` man page — https://man.openbsd.org/ssh (verified `-L`, `-J`, `-f`, `-N` flags)
- OpenSSH `ssh_config(5)` man page — https://man.openbsd.org/ssh_config (verified `LocalForward`, `ProxyJump`, `ServerAliveInterval`, `ServerAliveCountMax`, `IdentityFile`)
- autossh project page / man page — https://www.harding.motd.ca/autossh/ (verified `-M` monitor port usage)
- ClickHouse SQL reference for `hostName()` — https://clickhouse.com/docs/en/sql-reference/functions/other-functions#hostname

## Issues Found
No technical issues found.

All commands, flags, ports, SSH config directives, and ClickHouse references check out against official documentation:
- `-L 8123:localhost:8123` correctly forwards the local 8123 to the remote's loopback 8123 (the forward target is resolved on the SSH server side).
- `-f -N` combination for background tunnels is idiomatic and accurate (`-f` forks after authentication, `-N` skips remote command execution).
- `-J user@host` is valid shorthand for `ProxyJump`; pairing it with `-L local:target:port` works because the forward target is resolved on the final destination.
- `autossh -M 20000` uses a valid monitoring port; the post also pairs it with `ServerAliveInterval`/`ServerAliveCountMax` which is the recommended belt-and-braces setup.
- `LocalForward 8123 localhost:8123` uses the correct two-argument form (port + host:hostport).
- `SELECT hostName()` and the HTTP GET query form `?query=SELECT+1` are valid ClickHouse usage.

## Review Notes
- The `ps aux | grep "ssh -f"` + `kill <pid>` pattern works but is slightly fragile (it can match the grep process itself and any other `ssh -f` tunnels). Not incorrect, just something readers may want to refine with `pgrep -f` or by tracking the PID from a controlled start. No change made since the post's approach is valid.
- `autossh -M 0` (with reliance on `ServerAliveInterval`) is a common modern alternative to using a monitor port, but the post's `-M 20000` approach is equally valid.
- The bastion example `ssh -L 8123:ch-internal:8123 -J bastion-user@bastion-host user@ch-internal` relies on `ch-internal` being resolvable from the final host; using `localhost:8123` as the forward target would work equivalently. Both are correct.
- No version-specific caveats: SSH/autossh/ClickHouse defaults referenced here have been stable for years.
