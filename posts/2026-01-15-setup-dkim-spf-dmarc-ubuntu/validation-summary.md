# Validation Summary: How to Set Up DKIM, SPF, and DMARC Records on Ubuntu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ubuntu 20.04, 22.04, and 24.04
- Postfix
- OpenDKIM
- DKIM
- SPF
- DMARC
- DNS TXT records
- Bash shell commands
- xmlstarlet

## Sources Consulted
- RFC 7208: Sender Policy Framework (SPF) for Authorizing Use of Domains in Email, Version 1 - https://datatracker.ietf.org/doc/html/rfc7208
- RFC 6376: DomainKeys Identified Mail (DKIM) Signatures - https://datatracker.ietf.org/doc/html/rfc6376
- RFC 7489: Domain-based Message Authentication, Reporting, and Conformance (DMARC) - https://datatracker.ietf.org/doc/html/rfc7489
- RFC 8301: Cryptographic Algorithm and Key Usage Update to DKIM - https://datatracker.ietf.org/doc/html/rfc8301
- Postfix MILTER_README - https://www.postfix.org/MILTER_README.html
- Postfix postconf(5) documentation - https://www.postfix.org/postconf.5.html
- Ubuntu Manpage: opendkim.conf(5), Ubuntu 24.04 LTS - https://manpages.ubuntu.com/manpages/noble/man5/opendkim.conf.5.html
- Ubuntu Manpage: opendkim-genkey(8), Ubuntu 24.04 LTS - https://manpages.ubuntu.com/manpages/noble/man8/opendkim-genkey.8.html
- Ubuntu Manpage: opendkim-testkey(8), Ubuntu 24.04 LTS - https://manpages.ubuntu.com/manpages/noble/man8/opendkim-testkey.8.html
- Ubuntu Manpage: xmlstarlet(1), Ubuntu 24.04 LTS - https://manpages.ubuntu.com/manpages/noble/man1/xmlstarlet.1.html

## Issues Found
- Corrected the SPF explanation to specify that SPF authorizes the SMTP `MAIL FROM` or `HELO` identity, not necessarily the visible message From header.
- Corrected the DKIM explanation to say DKIM proves signed content integrity and signing-domain responsibility, not that the message "truly originated" from the domain.
- Replaced `cd /etc/opendkim/keys/...` key-generation steps with `opendkim-genkey -D ...` because the guide sets restrictive ownership and permissions that can prevent a normal sudo-capable user from entering the key directory.
- Updated related key ownership, `cat`, and DKIM rotation examples to use absolute paths and `sudo` where the restrictive `/etc/opendkim` permissions require it.
- Corrected the OpenDKIM SigningTable comment from regex patterns to wildcard patterns for `refile:` datasets.
- Corrected DMARC `pct` documentation from `1-100` to `0-100`, matching RFC 7489.
- Replaced repeated `opendkim-testkey -vvv` examples with the documented `-v` option.
- Replaced an unsafe private-key permission command, `chmod 600 /etc/opendkim/keys/*/`, which would remove execute permission from key directories, with a `find` command that targets `*.private` files.
- Corrected OpenDKIM configuration comments for `LogWhy`, `SyslogSuccess`, and `RemoveOldSignatures`.

## Review Notes
The remaining commands and configuration examples are broadly valid for the Ubuntu/Postfix/OpenDKIM versions discussed. DMARC forensic reports via `ruf` are syntactically valid, but operators should be aware that support varies by receiver and reports can contain sensitive message details.
