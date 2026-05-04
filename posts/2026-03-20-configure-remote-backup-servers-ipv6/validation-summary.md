# Validation Summary: How to Configure Remote Backup Servers over IPv6

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- IPv6 networking and addressing (RFC 3849 documentation prefix `2001:db8::/32`, RFC 5952 textual representation)
- OpenSSH (`sshd_config`, `ssh-keygen`, `ssh-copy-id`, `ssh -6`, forced commands in `authorized_keys`)
- rsync (over SSH, `--server --daemon` single-use daemon mode)
- BorgBackup (`borg serve --restrict-to-path`)
- ip6tables / Netfilter (IPv6 firewall rules)
- iptables-persistent / netfilter-persistent (Debian/Ubuntu)
- systemd (`systemctl enable`, `hostnamectl`)
- Linux user/group management (`useradd`)
- Bash scripting

## Sources Consulted
- sshd_config(5) man page — `ListenAddress`, `AllowUsers`, `PasswordAuthentication`, `PubkeyAuthentication`, `PermitRootLogin`, `ChallengeResponseAuthentication`/`KbdInteractiveAuthentication`, `Ciphers`
- ssh(1) and ssh-keygen(1) man pages — `-6`, `-t ed25519`, `-N`
- ssh-copy-id(1) man page — `-i`, `-o`
- authorized_keys format from sshd(8) man page — `command=`, `no-port-forwarding`, `no-X11-forwarding`, `no-agent-forwarding`, `no-pty`
- rsync(1) man page — `--server`, `--daemon`, `-avz`, `--delete`, `--exclude`, `-e`
- BorgBackup documentation — `borg serve --restrict-to-path`
- ip6tables(8) and ip6tables-save(8) man pages
- Debian/Ubuntu `iptables-persistent` package documentation (rules path: `/etc/iptables/rules.v6`)
- RFC 3849 (the `2001:db8::/32` documentation prefix)
- RFC 5952 (recommended IPv6 textual representation — hex digits `0-9a-f` only)
- RFC 3986 (IPv6 literal bracket notation in URIs)

## Issues Found
1. **Invalid IPv6 address `2001:db8::backup`.** The placeholder `2001:db8::backup` is not a valid IPv6 address: while `b`, `a`, and `c` are valid hex, `k`, `u`, and `p` are not (IPv6 hex group digits are restricted to `0-9a-f` per RFC 5952). Used as the value of `ListenAddress` in `sshd_config` it would prevent `sshd` from starting; used as a host literal it would fail parsing. Replaced every occurrence with the valid documentation-prefix address `2001:db8::1` (in `ip -6 addr show` expected output, `ListenAddress`, `ssh-copy-id`/`ssh` host targets, and the `BACKUP_SERVER` variable).
2. **Wrong iptables-persistent rules directory.** The save command targeted `/etc/ip6tables/rules.v6`, which is not a standard location. The Debian/Ubuntu `iptables-persistent`/`netfilter-persistent` package uses `/etc/iptables/rules.v4` and `/etc/iptables/rules.v6`. Fixed to `/etc/iptables/rules.v6`.
3. **Local-shell expansion of `$5` inside double-quoted SSH command.** In `USAGE=$(ssh -6 ... "df /backups | tail -1 | awk '{print $5}' | tr -d '%'")`, the single quotes around the awk program are inside an outer double-quoted string, so they do not protect the `$`. The local shell expands `$5` (positional parameter, almost always empty) before SSH ever sees the command, leaving `awk '{print }'` to print empty lines and breaking the threshold check. Escaped to `\$5` so the literal `$5` is sent to the remote shell and interpreted by awk.

## Review Notes
- `ChallengeResponseAuthentication no` still works as a backward-compat alias in OpenSSH but was renamed to `KbdInteractiveAuthentication` in OpenSSH 8.7 (Aug 2021). The directive is functional today and was left as-is, but a future revision could use the modern name.
- `Ciphers chacha20-poly1305@openssh.com,aes256-gcm@openssh.com` overrides the default cipher list with a strict modern subset; this is a hardening choice and is supported on all modern OpenSSH releases.
- The "Configuring Firewall" section lists both a restrictive rule (`-s 2001:db8:office::/48 --dport 22`) and a permissive rule (`--dport 22` from any source) back-to-back. Both rules are syntactically correct ip6tables; the comments imply they are alternatives, and ordering aside, applying both means the looser rule effectively matches everything. This is illustrative rather than incorrect, but readers should pick one rule for production.
- `command="rsync --server --daemon ."` in `authorized_keys` is a valid pattern: rsync 2.6.3+ supports single-use daemon-over-SSH mode with `--server --daemon`. The often-recommended `rrsync` wrapper is an alternative but not required.
- `useradd -m` already creates the home directory; the subsequent `mkdir -p /home/backupuser/.ssh` is redundant but harmless. The `chmod 700` is correct, though `chown backupuser:backupuser /home/backupuser/.ssh` would also normally be needed before populating `authorized_keys`.
- Bracketed IPv6 host literals (e.g. `backupuser@[2001:db8::1]`) are unquoted in several `ssh`/`ssh-copy-id` invocations. Bash will pass an unmatched glob through literally by default, so this works in practice; users with `failglob` enabled would need to quote the host.
- The post's frontmatter description mentions "deduplication" and "automate backup verification", but the body does not cover those topics in depth (deduplication is only implied via the `borg serve` example, and verification is not covered). Not a technical error in the code itself, just a description/content scope mismatch.
