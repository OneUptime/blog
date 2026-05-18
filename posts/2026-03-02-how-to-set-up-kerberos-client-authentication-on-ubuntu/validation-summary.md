# Validation Summary: How to Set Up Kerberos Client Authentication on Ubuntu

## Status
validated

## Post Type
Tutorial / Step-by-step guide

## Technologies Covered
- MIT Kerberos (krb5)
- Ubuntu (apt packages: `krb5-user`, `libpam-krb5`, `krb5-config`, `kstart`)
- PAM (`pam-auth-update`, `pam_krb5.so`)
- OpenSSH (GSSAPI authentication: `GSSAPIAuthentication`, `GSSAPIDelegateCredentials`, `GSSAPICleanupCredentials`)
- systemd (service units)
- `k5start` / `krenew` for ticket renewal

## Sources Consulted
- Ubuntu manpage: k5start — https://manpages.ubuntu.com/manpages/jammy/man1/k5start.1.html
- Ubuntu manpage: pam-auth-update — https://manpages.ubuntu.com/manpages/jammy/man8/pam-auth-update.8.html
- Ubuntu manpage: klist — https://manpages.ubuntu.com/manpages/jammy/man1/klist.1.html
- Ubuntu package: kstart (jammy) — https://packages.ubuntu.com/jammy/kstart
- MIT Kerberos: Encryption types — https://web.mit.edu/kerberos/krb5-latest/doc/admin/enctypes.html
- Ubuntu Server documentation: Kerberos basic workstation authentication — https://documentation.ubuntu.com/server/how-to/kerberos/basic-workstation-authentication/
- Ubuntu Server documentation: Kerberos encryption types — https://documentation.ubuntu.com/server/how-to/kerberos/kerberos-encryption-types/

## Issues Found
- **systemd unit type / `-b` mismatch (fixed)**: The `kerberos-renew.service` example used `Type=simple` while passing `-b` (detach) and `-p` (PID file) to `k5start`. With `-b`, `k5start` daemonizes and the parent exits — under `Type=simple` systemd would consider the service dead immediately after start. Fixed by removing `-b` and `-p /run/kerberos-renew.pid` from `ExecStart` and dropping the `PIDFile=` line, so `k5start` stays in the foreground as `Type=simple` expects. (Alternative would have been switching to `Type=forking`; the simpler change is more idiomatic for modern systemd units.)

## Review Notes
- The `kstart` package is in the `universe` repository on Ubuntu; users on a minimal install may need `sudo add-apt-repository universe` first. Not strictly an error, but worth noting.
- On Ubuntu the canonical SSH service unit is `ssh.service`; `sshd.service` is provided as an alias, so `systemctl restart sshd` works. Either name is acceptable.
- The exact line shown for `grep krb5 /etc/pam.d/common-auth` (`auth [success=1 default=ignore] pam_krb5.so minimum_uid=1000`) is illustrative — the precise `success=N` value depends on which other PAM profiles are enabled. Readers should treat it as approximate, which is appropriate for a guide.
- All other commands and flags verified: `kinit`, `klist`, `kdestroy`, `kadmin.local -q "addprinc -randkey ..."`, `ktadd -k <keytab> <princ>`, `klist -k`, `klist -s`, `kinit -R`, `pam-auth-update --enable krb5`, and the GSSAPI ssh/sshd options.
- Encryption types `aes256-cts-hmac-sha1-96` and `aes128-cts-hmac-sha1-96` are valid current MIT enctype names and part of the default `supported_enctypes`.
