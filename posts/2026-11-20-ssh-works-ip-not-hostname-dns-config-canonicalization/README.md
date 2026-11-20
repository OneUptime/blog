# SSH Works by IP but Not Hostname: DNS, Config, and Host-Key Checks

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: SSH, OpenSSH, DNS, Troubleshooting

Description: Diagnose SSH hostname-only failures by comparing effective client configuration, resolver results, canonicalization passes, and the exact host-key lookup name.

If `ssh app` fails while `ssh 192.0.2.10` works, DNS is one possibility. The two commands can also select different accounts, keys, ports, jump hosts, or trust records. First establish whether they describe the same connection.

These examples use OpenSSH and Linux resolver tools. Replace `app`, `app.example.net`, and `192.0.2.10` with your alias, intended hostname, and verified server address. Record `ssh -V`; the implementation details below were checked against OpenSSH 10.3p1.

## Compare the effective connections

Preserve the original command's username, port, identity, `-F` file, and other options when adding `-G`. For commands without additional options:

```bash
for target in app 192.0.2.10; do
    printf '\nTarget: %s\n' "$target"
    ssh -G "$target" | awk '
    $1 ~ /^(hostname|user|port|addressfamily|identityfile|identitiesonly|proxyjump|proxycommand|controlpath)$/ {print}
    $1 ~ /^(canonicalizehostname|canonicaldomains|canonicalizefallbacklocal|canonicalizemaxdots|canonicalizepermittedcnames)$/ {print}
    $1 ~ /^(hostkeyalias|userknownhostsfile|globalknownhostsfile|knownhostscommand|checkhostip)$/ {print}
    '
done
```

`-G` evaluates configuration and exits before connecting to the SSH server. Canonicalization can still perform lookups, and `Match exec` can run local commands. Use trusted configuration. Add `-vvv` to the same inspection command to see files, includes, and matching decisions. [SSH configuration inspection](https://man.openbsd.org/ssh#G), [configuration processing implementation](https://raw.githubusercontent.com/openssh/openssh-portable/V_10_3_P1/readconf.c)

`Host app` normally matches the name typed, while `HostName` supplies the destination. An alias need not exist in DNS. Most scalar settings retain their first assigned value; a later specific block does not override an earlier `Host *` default. `IdentityFile` is additive, so inspect every listed identity. A simple configuration for two equivalent spellings is:

```sshconfig
Host app app.example.net
    HostName app.example.net
    User deploy
    IdentityFile ~/.ssh/id_ed25519_app

Host *
    User fallback
```

Both names select `deploy`; the numeric address selects `fallback`. Merely setting `HostName` does not immediately restart `Host` matching under that name. An explicit final pass or canonicalization can cause reparsing. Check included files in their actual read order. [OpenSSH configuration precedence and matching](https://raw.githubusercontent.com/openssh/openssh-portable/V_10_3_P1/readconf.c)

For a fresh authorized reproduction, add `-vvv -S none` to the original connection command, keeping its normal host verification. `-S none` prevents reuse of an existing multiplexed connection. Classify the first failure:

| Evidence | Investigate next |
|---|---|
| Cannot resolve the target or jump host | That name's resolution where it occurs |
| Attempts an unexpected address or port | Effective destination, DNS answers, address family |
| Host-key warning | Trust lookup name and independently verified identity |
| `Permission denied` after host verification | Selected account and authentication identity |

The actual debug transcript is stronger evidence than assuming that both commands reach the same machine. [SSH debugging and multiplexing options](https://man.openbsd.org/ssh)

## Test the name SSH actually resolves

Use the effective destination, not automatically the nickname:

```bash
getent ahosts app.example.net
dig -r app.example.net. A +timeout=2 +tries=1
dig -r app.example.net. AAAA +timeout=2 +tries=1
```

On glibc-based Linux, `getent ahosts` exercises the Name Service Switch through `getaddrinfo`. It can reflect `/etc/hosts` and other configured sources. Its results are diagnostic, not a guarantee of identical address filtering to SSH. [getent](https://manpages.debian.org/bookworm/manpages/getent.1.en.html)

`dig` tests DNS. `-r` ignores personal `.digrc` settings, and the trailing dot makes these queries absolute. Read the status, answer, and responding server; empty answers, NXDOMAIN, SERVFAIL, and timeouts mean different things. The timeout applies to queries, not an overall investigation deadline. [BIND dig documentation](https://bind9.readthedocs.io/en/latest/manpages.html#dig-dns-lookup-utility)

If DNS answers correctly but system lookup differs, inspect the `hosts:` line in `/etc/nsswitch.conf` and relevant `/etc/hosts` entries. If a short name fails but its full name works, investigate search domains. On systems using systemd-resolved, inspect `resolvectl status` and `resolvectl query app.example.net` for VPN/per-interface DNS routing and the selected link. Repair the responsible configuration; replacing an internal resolver with public DNS cannot supply a private zone. [systemd resolver inspection](https://www.freedesktop.org/software/systemd/man/latest/resolvectl.html)

Compare all returned addresses with the working IP. A stale AAAA record or unreachable IPv6 path can explain hostname-only failure. For a direct connection, repeating the hostname attempt with `-4` is a focused comparison; it does not prove DNS is broken. With `ProxyJump`, the final TCP connection and destination lookup normally occur from the jump host; client `-4` does not force that final hop to IPv4. Local DNS results alone are insufficient. Identify whether the failing name belongs to the jump or destination. [SSH address-family and jump options](https://man.openbsd.org/ssh), [forwarded connection implementation](https://raw.githubusercontent.com/openssh/openssh-portable/V_10_3_P1/channels.c)

## Follow canonicalization and the second pass

Inspect these settings together:

- `CanonicalizeHostname`: `no` leaves rewriting to ordinary resolution; `yes` enables explicit canonicalization for direct connections; `always` includes proxied connections.
- `CanonicalDomains`: suffixes SSH tries during canonicalization.
- `CanonicalizeMaxDots`: names with more dots than this limit skip suffix expansion.
- `CanonicalizeFallbackLocal`: `no` can make failed canonicalization fatal instead of falling back to ordinary lookup.
- `CanonicalizePermittedCNAMEs`: controls which CNAME transitions may rewrite SSH's target name; it is not a switch disabling DNS CNAME resolution.

These settings can make a short name fail before the ordinary resolver search that another application uses. [Canonicalization options](https://man.openbsd.org/ssh_config#CanonicalizeHostname)

```bash
ssh -vvv -G app
ssh -vvv -G -o CanonicalizeHostname=no app
```

Compare the attempted suffixes, final `hostname`, and reparsing messages. The second command is an inspection experiment: disabling canonicalization can change security and routing settings selected by later blocks, so do not adopt it as a connection workaround without reviewing those differences. [Canonicalization and configuration passes](https://raw.githubusercontent.com/openssh/openssh-portable/V_10_3_P1/ssh.c)

`Match originalhost` refers to the typed name; `Match host` uses the substituted/canonical target. `Match final` requests a final pass even without canonicalization. Earlier assigned scalar values still matter; the second pass does not overwrite them wholesale. [Match semantics](https://man.openbsd.org/ssh_config#Match)

## Check the exact trust name

A working IP entry does not necessarily establish trust for the hostname. Inspect the configured user/global trust files and any `KnownHostsCommand`. Without `HostKeyAlias`, the usual lookup is the effective hostname, or `[hostname]:port` for a nondefault port. OpenSSH lowercases an explicit `HostKeyAlias` and uses it without adding a port suffix. Follow the warning's actual file and token. [OpenSSH host-key lookup implementation](https://raw.githubusercontent.com/openssh/openssh-portable/V_10_3_P1/sshconnect.c), [alias normalization](https://raw.githubusercontent.com/openssh/openssh-portable/V_10_3_P1/ssh.c)

```bash
# Examples: choose the token and file matching the effective configuration.
ssh-keygen -F app.example.net -f "$HOME/.ssh/known_hosts"
ssh-keygen -F '[app.example.net]:2222' -f "$HOME/.ssh/known_hosts"
ssh-keygen -F app-trust-alias -f "$HOME/.ssh/known_hosts"
```

`-F` finds hashed entries too. If `CheckHostIP` reports an address-related conflict, inspect that separate entry. For host certificates, check trusted CA records and the expected hostname/principal. [Lookup options](https://man.openbsd.org/ssh-keygen#F), [host alias and certificate validation](https://man.openbsd.org/ssh_config#HostKeyAlias)

Verify changed keys through an authenticated console or maintained inventory before editing trust. Use the [host-key verification workflow](https://oneuptime.com/blog/post/2026-11-19-ssh-host-identification-changed-verify-fingerprint/view) for that repair. Keep strict checking enabled, fix the demonstrated mismatch, and repeat the original hostname connection with connection reuse disabled. Confirm the intended address, account, and verified server identity before calling the issue resolved.
