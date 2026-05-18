# Validation Summary: How to Troubleshoot Kerberos 'kinit' Errors on Ubuntu

## Status
validated

## Post Type
Troubleshooting Guide (technical tutorial)

## Technologies Covered
- MIT Kerberos 5 (`kinit`, `kadmin.local`, `klist`, `kvno`, `kdestroy`, `kpasswd`)
- Kerberos configuration (`krb5.conf`, `kdc.conf`)
- Ubuntu system administration (`systemd-timesyncd`, `chrony`, `timedatectl`)
- DNS tooling (`host`, `nslookup`, `dig` SRV lookups)
- Network diagnostic tools (`nc`, `ss`, `ufw`)
- Active Directory Kerberos interop

## Sources Consulted
- MIT Kerberos documentation: https://web.mit.edu/kerberos/krb5-latest/doc/
- MIT `kadmin` reference: https://web.mit.edu/kerberos/krb5-latest/doc/admin/admin_commands/kadmin_local.html
- MIT `krb5.conf` reference: https://web.mit.edu/kerberos/krb5-latest/doc/admin/conf_files/krb5_conf.html
- MIT `kdc.conf` reference: https://web.mit.edu/kerberos/krb5-latest/doc/admin/conf_files/kdc_conf.html
- MIT `kinit` man page: https://web.mit.edu/kerberos/krb5-latest/doc/user/user_commands/kinit.html
- Ubuntu package documentation for `krb5-user` and `krb5-kdc`
- `systemd-timesyncd` and `chrony` man pages
- MIT krb5 source: `appl/gss-sample/gss-client.c` (verified the gss-client argument syntax)

## Issues Found

1. **Time sync "Fix" section mixed two NTP daemons confusingly.** The original instructions enabled `systemd-timesyncd` and then ran `sudo chronyc makestep`, which is a `chrony` command that requires the chrony package (not installed by default on Ubuntu and conflicts with `systemd-timesyncd`). Rewrote the section to clearly present `systemd-timesyncd` and `chrony` as two alternatives.

2. **`gss-client` example was syntactically invalid.** The MIT Kerberos sample program `gss-client` requires `host service msg` as positional arguments (or `-f file` to read the message from a file). The example `gss-client server.example.com host < /dev/null` is missing the `msg` argument and would print a usage error. Also, `gss-client` is a sample program not shipped in standard Ubuntu `krb5-*` packages. Replaced this line with `klist`, which is universally available and serves the verification purpose.

3. **`LOCKED_OUT` is not a principal flag.** The original text suggested looking for `LOCKED_OUT` in `getprinc` output, but MIT Kerberos does not expose lockout as a principal flag. Account lockout is determined by comparing the principal's "Failed password attempts" / "Last failed authentication" fields against the policy's `max_fail`. Clarified the diagnosis text accordingly; `modprinc -unlock` is correct.

## Review Notes

- Default clock skew of 5 minutes (300 s) is correct (`clockskew` default in MIT krb5).
- `kinit -V` (verbose) and `KRB5_TRACE=/dev/stderr` are both valid and documented.
- `modprinc -unlock` exists in MIT Kerberos 1.12+ and is supported on all currently maintained Ubuntu LTS releases.
- The encryption types listed (`aes256-cts-hmac-sha1-96`, `aes128-cts-hmac-sha1-96`) are correct but conservative. MIT krb5 1.15+ also supports the RFC 8009 SHA-2 family (`aes256-cts-hmac-sha384-192`, `aes128-cts-hmac-sha256-128`); readers running newer MIT or Heimdal deployments may wish to add these to `permitted_enctypes`. Not a defect — just a forward-looking note.
- DES has been disabled by default in MIT krb5 since 1.18 (2020); the section on updating DES principals remains relevant only for legacy deployments.
- `nc -zuv` for UDP probing is shown correctly but UDP results from `nc` are unreliable by design (no handshake) — the post does not overstate what it proves.
- All file paths (`/etc/krb5.conf`, `/etc/krb5.keytab`, `/var/log/krb5kdc.log`, `/var/log/kadmind.log`) and the `krb5-kdc` systemd unit name match the Ubuntu `krb5-kdc` package.
