# Validation Summary: How to Set Up SSH Certificates Instead of SSH Keys on Ubuntu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenSSH (ssh-keygen, sshd)
- SSH certificates (user and host)
- Ubuntu sshd_config directives (`TrustedUserCAKeys`, `HostCertificate`, `RevokedKeys`)
- Key Revocation Lists (KRLs)
- ed25519 keys
- `~/.ssh/known_hosts` `@cert-authority` markers

## Sources Consulted
- OpenSSH `ssh-keygen(1)` manual page, including the CERTIFICATES and KEY REVOCATION LISTS sections
- OpenSSH `sshd_config(5)` manual page (TrustedUserCAKeys, HostCertificate, RevokedKeys directives)
- OpenSSH `ssh_config(5)` (CertificateFile option)
- Ubuntu systemd unit naming convention for OpenSSH (`ssh.service`, not `sshd.service`)

## Issues Found
1. **Terminology mismatch ("CRL" vs "KRL").** The introductory comparison referred to "Certificate Revocation List (CRL)" — that is X.509 PKI terminology. OpenSSH actually uses "Key Revocation List (KRL)" (the post itself uses KRL correctly later). Updated the bullet point to say "Key Revocation List (KRL)" for consistency with the rest of the post and with OpenSSH documentation.

2. **Incorrect ssh-keygen syntax for revoking a certificate by serial number.** The example used `ssh-keygen -k -u -f revoked-keys.krl -z 12345` and described `-z` as the serial number. Per `ssh-keygen(1)`, when generating a KRL, `-z` sets the KRL **version number**, not the serial of a certificate to revoke. To revoke by serial number, you must supply a KRL specification file containing a `serial:` directive and pass the CA's public key with `-s` (because serial numbers are scoped per CA). Replaced the example with the correct workflow:

   ```bash
   echo "serial: 12345" > revoke.spec
   ssh-keygen -k -u -f revoked-keys.krl -s ssh_ca.pub revoke.spec
   ```

## Review Notes
- `systemctl restart ssh` is correct on Ubuntu (the unit is named `ssh.service`, with `sshd.service` aliased to it on modern releases). Verified.
- `ssh-keygen -V` time intervals like `+1w`, `+30d`, `+7d`, `+365d` are valid per the man page.
- The default certificate extensions shown in the sample output (`permit-pty`, `permit-user-rc`, `permit-X11-forwarding`, `permit-agent-forwarding`, `permit-port-forwarding`) match what current `ssh-keygen` versions produce.
- `-O no-x11-forwarding`, `no-agent-forwarding`, `no-port-forwarding`, `no-pty`, `force-command=...`, and `source-address=...` are all valid certificate options.
- The host certificate workflow signs `/etc/ssh/ssh_host_ed25519_key.pub` directly and then `cp`s the resulting `-cert.pub` to `/etc/ssh/`. In practice the signing usually happens on a separate CA machine; the example reads slightly oddly when read literally (you'd be copying a file onto itself if you signed in place), but it is not technically wrong if interpreted as "do this work on a CA host, then copy the cert back."
- `chmod 444` on a public key is fine but somewhat unusual — `644` is the more conventional permission. Not a correctness issue, so left as-is.
