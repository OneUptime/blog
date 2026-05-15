# Validation Summary: How to Set Up GPG-Based Email Encryption on RHEL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- GnuPG / OpenPGP
- Mutt
- s-nail mail command
- Shell scripting

## Sources Consulted
- GnuPG manual: https://gnupg.org/documentation/manuals/gnupg/
- GnuPG configuration options: https://gnupg.org/documentation/manuals/gnupg/GPG-Configuration-Options.html
- Local GnuPG 2.4.4 `gpg --help` output
- Mutt upstream `gpg.rc`: https://gitlab.com/muttmua/mutt/-/raw/master/contrib/gpg.rc
- Mutt upstream configuration definitions: https://gitlab.com/muttmua/mutt/-/raw/master/init.h
- Red Hat RHEL 9 DNF package installation documentation: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/managing_software_with_the_dnf_tool/assembly_installing-rhel-9-content_managing-software-with-the-dnf-tool
- Red Hat RHEL 9 adoption notes for `mailx` replacement by `s-nail`: https://access.redhat.com/documentation/en-us/red_hat_enterprise_linux/9/pdf/considerations_in_adopting_rhel_9/considerations-in-adopting-rhel-9.pdf
- Red Hat Customer Portal note that `mailx` is not available in RHEL 9: https://access.redhat.com/solutions/6999497
- RFC 9580 OpenPGP: https://www.rfc-editor.org/rfc/rfc9580

## Issues Found
- The OpenPGP flow diagram showed encryption before signing and verification before decryption. The post's own GnuPG command uses `--sign --encrypt`, and OpenPGP signed encrypted messages are normally signed inside the encrypted message, so I changed the diagram to sign first, encrypt the signed message, decrypt first, then verify.
- The installation step only installed `mutt`, but later commands rely on the `mail` command. In RHEL 9, `mailx` was replaced by `s-nail`, so I changed the install command to `sudo dnf install mutt s-nail`.
- The Mutt PGP configuration used `/usr/lib/mutt/pgpewrap`, which does not match the upstream Mutt `gpg.rc` sample and may not exist on RHEL-derived systems. I changed those commands to invoke `pgpewrap` from `PATH`.
- The section heading referred to `mail/mailx`, but RHEL 9 uses `s-nail` for mailx-compatible mail handling. I changed the heading to refer to `mail`.

## Review Notes
The commands are technically valid after the fixes, but production setups should avoid plaintext SMTP passwords in `~/.muttrc` and should verify correspondent key fingerprints rather than relying on `--always-trust` or `--trust-model always` for routine human email.
