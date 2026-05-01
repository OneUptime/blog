# Validation Summary: How to Set Up DKIM Signing for Mail Sent from IPv4 Servers

## Status
validated

## Post Type
Guide / Tutorial

## Technologies Covered
- DKIM
- OpenDKIM
- Postfix
- DNS TXT records
- systemd service management

## Sources Consulted
- RFC 6376, DomainKeys Identified Mail (DKIM) Signatures: https://www.rfc-editor.org/rfc/rfc6376
- RFC 8301, Cryptographic Algorithm and Key Usage Update to DKIM: https://www.rfc-editor.org/rfc/rfc8301.html
- OpenDKIM `opendkim.conf(5)` Debian manpage: https://manpages.debian.org/testing/opendkim/opendkim.conf.5.en.html
- OpenDKIM `opendkim(8)` Debian manpage: https://manpages.debian.org/testing/opendkim/opendkim.8.en.html
- OpenDKIM `opendkim-genkey(8)` Debian manpage: https://manpages.debian.org/trixie/opendkim-tools/opendkim-genkey.8.en.html
- OpenDKIM `opendkim-testkey(8)` Debian manpage: https://manpages.debian.org/trixie/opendkim-tools/opendkim-testkey.8.en.html
- Postfix Milter documentation: https://www.postfix.org/MILTER_README.html
- Postfix `sendmail(1)` documentation: https://www.postfix.org/sendmail.1.html
- Debian OpenDKIM wiki, Postfix integration and UNIX socket setup: https://wiki.debian.org/opendkim
- Port25 official forum reference for the authentication checker address: https://forum.port25.com/general-discussion-1/ipv6-breaking-comcast-near-you/

## Issues Found
- The description said DKIM "prevent[s] email spoofing." I changed this to say it helps receivers detect spoofed messages, because DKIM authenticates a signing domain but does not by itself enforce anti-spoofing policy.
- The introduction implied DKIM proves mail came from an "authorized server." I corrected this to match RFC 6376 more closely: DKIM proves the message was signed for the domain and that the signed portions were not altered after signing.
- The UNIX socket setup for Postfix and OpenDKIM was incomplete. Changing the socket directory group to `postfix` does not guarantee the created socket will be accessible to Postfix. I added `UMask 007`, changed the directory ownership to `opendkim:opendkim`, added `postfix` to the `opendkim` group, and updated the service restart steps.
- The verification examples used the `mail` command even though the post only installs `opendkim`, `opendkim-tools`, and Postfix-related components. I replaced those examples with `/usr/sbin/sendmail -t`, which is provided by Postfix.
- The online verifier example used `check-auth2@verifier.port25.com`, while Port25's own public reference points to `check-auth@verifier.port25.com`. I updated the example accordingly.
- The final verification command only queried the TXT record with `dig`. I replaced it with `opendkim-testkey -d example.com -s mail -vvv`, which directly validates OpenDKIM's DNS key lookup path using the installed toolset.

## Review Notes
- `LogWhy yes` is technically valid, but the OpenDKIM documentation says it produces very verbose logs and is best limited to troubleshooting.
- The generated `mail.txt` file is in BIND-style zone format. Some DNS provider UIs require only the TXT value rather than the full `IN TXT` record syntax.
- Aside from the example IPv4 address in `TrustedHosts`, the configuration is not inherently IPv4-specific; the same DKIM setup principles also apply on IPv6-capable mail hosts.
