# Validation Summary: How to Configure SSH ProxyJump over IPv6

## Status
validated

## Post Type
Tutorial / Reference guide

## Technologies Covered
- OpenSSH client (`ssh`, `scp`)
- SSH ProxyJump (`-J` / `ProxyJump` directive)
- SSH ProxyCommand with `-W` stdio forwarding
- `~/.ssh/config` (`HostName`, `User`, `AddressFamily`, `IdentityFile`, `ServerAliveInterval`, `ProxyJump`, `ProxyCommand`, `ForwardAgent`)
- SSH agent forwarding (`-A`)
- SSH local port forwarding (`-L`)
- `rsync` over SSH (`-e`)
- IPv6 addressing (RFC 5952 literal notation, RFC 3986 bracketed-host syntax)

## Sources Consulted
- OpenSSH `ssh(1)` man page (OpenSSH 9.6p1) — verified `-J`, `-L`, `-W`, `-6`, `-A`, `-N`, `-vv` flags and the documented note that "IPv6 addresses can be specified by enclosing the address in square brackets" for `-L`/`-D`. https://man.openbsd.org/ssh
- OpenSSH `ssh_config(5)` man page — verified `ProxyJump` accepts `[user@]host[:port]` or an ssh URI; verified `AddressFamily` valid values (`any`, `inet`, `inet6`); verified that `ProxyCommand`/`ProxyJump` accept the `%h`, `%n`, `%p`, `%r` tokens. https://man.openbsd.org/ssh_config
- OpenSSH release notes — `ProxyJump`/`-J` introduced in OpenSSH 7.3 (Aug 2016); `-J` for `scp(1)` introduced in OpenSSH 7.5 (Mar 2017). https://www.openssh.com/releasenotes.html
- RFC 3986 §3.2.2 (URI host with bracketed IP-literal for IPv6) and RFC 5952 (IPv6 textual representation).
- Live verification with the installed `ssh` client: confirmed that `ssh -J user@2001:db8::1:22 …` is rejected with "Invalid -J argument", that `ssh -L 8080:2001:db8::100:80 …` is rejected with "Bad local forwarding specification", and that `ssh -W 2001:db8::100:22 …` is rejected with "Bad stdio forwarding specification" — all three accept the bracketed equivalents.

## Issues Found

1. **Invalid `-J` jump host with port (line 22)** — `ssh -J user@2001:db8::1:22 admin@2001:db8::100` is rejected by OpenSSH ("Invalid -J argument"). An IPv6 literal followed by `:port` is ambiguous because `2001:db8::1:22` is itself a valid IPv6 address. Fixed to `ssh -J user@[2001:db8::1]:22 admin@2001:db8::100` per the URI bracket convention documented in `ssh_config(5)` for `ProxyJump`.

2. **Invalid `-W %h:%p` for IPv6 destinations (lines 70 and 76)** — `ProxyCommand ssh -6 -W %h:%p user@2001:db8::1` and the agent-forwarding variant fail when `%h` expands to an IPv6 literal because `-W host:port` cannot disambiguate the colons; OpenSSH reports "Bad stdio forwarding specification". Changed both to `ssh ... -W [%h]:%p ...`, the bracketed form recommended by the OpenSSH man page.

3. **Invalid `-L` local-forward IPv6 destination (lines 136 and 141)** — `-L 8080:2001:db8::100:80` and `-L 5432:2001:db8::100:5432` are rejected with "Bad local forwarding specification" because the embedded IPv6 colons collide with the field separators. Per `ssh(1)` ("IPv6 addresses can be specified by enclosing the address in square brackets"), changed to `-L 8080:[2001:db8::100]:80` and `-L 5432:[2001:db8::100]:5432`.

4. **Summary updated to match (line 167)** — The Summary repeated the un-bracketed `-W %h:%p` recommendation. Updated to `-W [%h]:%p` with a brief note on why brackets are required for IPv6 literals.

## Review Notes

- All other examples are technically correct: `-J` with bare IPv6 literals (no port), chained jump hosts (`-J host1,host2`), `-6` to force IPv6, `AddressFamily inet6`, `IdentityFile`, `ServerAliveInterval`, `ForwardAgent`, `scp -J` (available since OpenSSH 7.5), `rsync -e "ssh ..."`, multi-hop `ProxyJump` chains, and `ssh -vv` debugging all match the current OpenSSH behavior.
- `AddressFamily inet6` on entries whose `HostName` is already an IPv6 literal is harmless but redundant — it primarily matters when the `HostName` is a DNS name that resolves to both A and AAAA records. The post does not over-claim about this, so no change was made.
- The post claims `ProxyJump` is unavailable in "SSH < 7.3"; this is precisely correct (introduced in OpenSSH 7.3, August 2016).
- The closing troubleshooting tip "Jump host resolves destination to IPv4 — fix: set `AddressFamily inet6`" is reasonable guidance but worth noting it only applies to the destination resolution, not to the jump-host hop itself; this is a stylistic nuance, not an error, so left as-is.
