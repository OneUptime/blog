# Validation Summary: How to Set Up DKIM with OpenDKIM on Ubuntu

## Status
validated

## Post Type
Tutorial / Step-by-step guide

## Technologies Covered
- OpenDKIM (DKIM milter daemon)
- Postfix (MTA / milter integration)
- DKIM (DomainKeys Identified Mail, RFC 6376 / RFC 8301)
- Ubuntu 20.04+ (systemd, apt, tmpfiles.d)
- DNS TXT records (BIND zone format)
- `opendkim-genkey`, `opendkim-testkey`, `postconf`, `dig`

## Sources Consulted
- opendkim.conf(5) — https://manpages.debian.org/testing/opendkim/opendkim.conf.5.en.html
- opendkim(8) — https://linux.die.net/man/8/opendkim
- opendkim-genkey(8) — http://www.opendkim.org/opendkim-genkey.8.html
- opendkim-genkey(8) Debian — https://manpages.debian.org/bullseye/opendkim-tools/opendkim-genkey.8.en.html
- OpenDKIM README — http://www.opendkim.org/opendkim-README
- Postfix MILTER_README — https://www.postfix.org/MILTER_README.html
- postconf(5) — https://manpages.debian.org/testing/postfix/postconf.5.en.html
- RFC 8301 (Cryptographic Algorithm and Key Usage Update to DKIM)
- ArchWiki OpenDKIM page — https://wiki.archlinux.org/title/OpenDKIM

## Issues Found

1. **Misleading `Mode sv` comment.** The original comment read "Sign outgoing mail only (Mode s), verify incoming (Mode sv)", which could be misread as `sv` meaning "verify only" or "verify incoming". Per opendkim.conf(5), valid mode characters are `s` (signer) and `v` (verifier), and `sv` means both. Rewrote the comment to: `Operating mode: s = sign only, v = verify only, sv = both sign and verify`.

2. **Incorrect "Test signing" command in Troubleshooting.** The original command `sudo opendkim -n -v -f` was labelled "Test signing without Postfix (debug mode)". Per opendkim(8), the `-n` flag parses the configuration file and exits — it does not test signing. The `-f` flag (run in foreground) is also moot when combined with `-n` since the process exits immediately. Updated to `sudo opendkim -n -v` with a comment clarifying that it validates configuration syntax and exits.

## Review Notes
- The `opendkim-genkey` example output includes `h=sha256` in the published DKIM record. Upstream `opendkim-genkey` does not emit `h=` by default, but the Debian/Ubuntu packaging patches the tool to restrict hashes to sha256 (per NIST SP 800-177), so the example matches Ubuntu's actual behavior. Left unchanged.
- The KeyTable format `selector._domainkey.domain  domain:selector:/path/to/key` is correct.
- The SigningTable with `refile:` prefix and `*@example.com` wildcard pattern is correct.
- `milter_protocol = 6` is the Postfix default since 2.6 and is correct for Ubuntu 20.04+.
- 2048-bit RSA key recommendation aligns with RFC 8301 (which deprecates 1024-bit keys).
- `OversignHeaders From` correctly protects the `From` header by listing it in `h=` an extra time so any later header addition invalidates the signature.
- Adding the `postfix` user to the `opendkim` group (via `usermod -aG opendkim postfix`) plus the `0750 opendkim:opendkim` tmpfiles rule on `/run/opendkim` is a valid way to expose the socket to Postfix without moving it under `/var/spool/postfix`.
