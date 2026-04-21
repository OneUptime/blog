# Validation Summary: How to Test Email Delivery over IPv6

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- IPv6 networking
- DNS MX and AAAA lookups
- SMTP and ESMTP
- STARTTLS
- Swaks
- netcat, telnet, OpenSSL s_client, dig, and ping6
- SPF, DKIM, DMARC, and Authentication-Results headers
- Postfix and Exim mail logs

## Sources Consulted
- Swaks official reference documentation: https://jetmore.org/john/code/swaks/latest/doc/ref.txt
- OpenSSL s_client documentation: https://docs.openssl.org/3.6/man1/openssl-s_client/
- OpenBSD nc manual: https://man.openbsd.org/nc.1
- GNU Inetutils telnet manual: https://www.gnu.org/software/inetutils/manual/inetutils.html
- ISC BIND dig manual: https://downloads.isc.org/isc/bind9/9.20.11/doc/arm/html/manpages.html#dig-dns-lookup-utility
- RFC 5321, Simple Mail Transfer Protocol: https://www.rfc-editor.org/rfc/rfc5321.html
- RFC 3207, SMTP STARTTLS extension: https://www.rfc-editor.org/rfc/rfc3207.html
- RFC 7208, Sender Policy Framework: https://www.rfc-editor.org/rfc/rfc7208.html
- RFC 6376, DomainKeys Identified Mail: https://www.rfc-editor.org/rfc/rfc6376.html
- RFC 7489, DMARC: https://www.rfc-editor.org/rfc/rfc7489.html
- RFC 8601, Authentication-Results header: https://www.rfc-editor.org/rfc/rfc8601.html
- Gmail Help, tracing email with full headers: https://support.google.com/mail/answer/29436
- ESPC Port25 verifier description: https://espcoalition.org/senderid
- Mail-tester website: https://www.mail-tester.com/

## Issues Found
- The prerequisites used `nc` later in the article but did not install a netcat implementation. Added `netcat-openbsd` to the package list.
- The Gmail MX example omitted most of the current Gmail MX targets, including the primary `gmail-smtp-in.l.google.com` target. Expanded the sample output.
- Bracketed IPv6 Swaks targets were unquoted, which can be interpreted as shell glob patterns. Quoted the `--server` values.
- The SMTP banner examples used a hard-coded Gmail IPv6 literal that can become stale. Replaced it with the MX hostname and `-6` where appropriate.
- The manual SMTP example used `echo`, which sends LF line endings instead of SMTP CRLF command terminators. Replaced it with `printf` using `\r\n`.
- A Swaks comment said the test sent "from an IPv6 address" even though `--server` selects the SMTP server to connect to. Reworded it to "through an IPv6 SMTP server."
- The Port25 verifier was described too broadly for DMARC coverage. Clarified that Port25 provides SPF/DKIM-oriented authentication results and that Gmail headers are also used for DMARC.
- The sample IPv6 `Received:` header omitted the RFC 5321 `IPv6:` address-literal tag. Updated it to `[IPv6:2001:db8::10]`.
- The mail-log grep examples were too narrow for some valid IPv6 log formats and could buffer output. Broadened the patterns and added line buffering.
- The script treated ICMP echo failure as a hard IPv6 failure even though ping can be filtered while SMTP still works. Changed that result to a warning.
- The automated script used `--quit-after RCPT`, so it would not actually send an email or trigger a verifier reply. Removed that option and added an explicit message body.

## Review Notes
The remaining `2001:db8::10` addresses are documentation placeholders and must be replaced with a real IPv6 mail server address before use. Outbound TCP port 25 may be blocked by some networks or cloud providers, so a failed connection test can reflect network policy rather than an SMTP configuration problem. Swaks was not installed locally in this workspace, so its options were verified against the official Swaks documentation instead of local `--help` output.
