# Validation Summary: How to Configure SOCKS5 Proxy for IPv4 Traffic with Dante

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Dante SOCKS server (1.4.x) — `danted`
- SOCKS5 / SOCKS4 protocols
- Debian/Ubuntu packages: `dante-server`, `dante-client`
- systemd
- PAM-based and system-password-file-based authentication
- curl `--socks5` flag
- OpenBSD netcat (`nc -X 5 -x`) for SSH `ProxyCommand`
- Git `http.proxy` config
- Python `requests` library with SOCKS proxies

## Sources Consulted
- Dante official documentation: https://www.inet.no/dante/doc/
- `danted.conf(5)` man page (Dante 1.4.x)
- Debian package metadata for `dante-server` 1.4.3 (including the bundled example config)
- OpenBSD `nc(1)` man page (for `-X` / `-x` flags)
- Dante 1.4.x release notes covering the rename of the `method` keyword to `socksmethod`

## Issues Found
1. **Deprecated keyword `method:` in global scope.** The original post used `method: none username` and `method: username`. In Dante 1.4.x the global authentication keyword was renamed to `socksmethod`. Replaced all global-scope `method:` directives with `socksmethod:` to match the current syntax used in the upstream example config and the `danted.conf(5)` man page.
2. **Deprecated keyword `method:` at rule scope.** Inside the `socks pass { ... }` block, the post had `method: username`. The correct rule-level keyword is `socksmethod:`. Updated the rule.
3. **Incorrect claim that `method: username` uses PAM.** The post stated "Dante uses PAM or system users for `method: username`." Per `danted.conf(5)`, the `username` method reads the system password files (`/etc/passwd`/`/etc/shadow`) directly; PAM-based username/password authentication is a separate method named `pam.username`. Rewrote the explanatory sentence to make this distinction clear and to point to `pam.username` for PAM-based auth.
4. **Conclusion text referenced `method: username`.** Updated to `socksmethod: username` for consistency with the corrected configuration examples.

## Review Notes
- `clientmethod: none` is valid but not strictly necessary — the man page notes Dante will set it to the correct value automatically in most cases. Leaving it in is harmless and improves explicitness.
- The Python `requests` example will only work if the optional `requests[socks]` extra (PySocks) is installed; without it, `requests` raises `Missing dependencies for SOCKS support`. This is a minor dependency note rather than a technical error.
- The `ssh -o ProxyCommand="nc -X 5 -x ..."` example relies on OpenBSD `netcat` syntax (the default `nc` on macOS, *BSD, and many Linux distros via `netcat-openbsd`). It does not work with traditional GNU netcat or with `ncat` (nmap). Worth flagging in a future revision but not strictly incorrect.
- `git config --global http.proxy socks5://...` only proxies HTTP(S)-based git remotes, not `git@` (SSH) remotes. The example is correct as written but could benefit from a clarifying note.
- `/sbin/nologin` is a symlink to `/usr/sbin/nologin` on most modern Debian/Ubuntu systems and works fine for `useradd -s`.
- Both `internal: eth1 port = 1080` and `internal: 0.0.0.0 port = 1080` forms are valid per `danted.conf(5)` (interface name or IP address).
- `protocol: tcp udp` (space-separated list) is valid Dante rule syntax.
