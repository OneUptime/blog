# Validation Summary: How to Configure DKIM for IPv6 Mail Servers

## Status
validated

## Post Type
Guide

## Technologies Covered
- DKIM
- IPv6
- OpenDKIM
- Postfix
- DNS TXT records
- swaks

## Sources Consulted
- RFC 6376: DomainKeys Identified Mail (DKIM) - https://datatracker.ietf.org/doc/html/rfc6376
- OpenDKIM `opendkim.conf(5)` - http://www.opendkim.org/opendkim.conf.5.html
- OpenDKIM `opendkim(8)` - http://www.opendkim.org/opendkim.8.html
- OpenDKIM `opendkim-genkey(8)` - http://www.opendkim.org/opendkim-genkey.8.html
- OpenDKIM `opendkim-testkey(8)` - http://www.opendkim.org/opendkim-testkey.8.html
- Postfix MILTER_README - https://www.postfix.org/MILTER_README.html
- Red Hat Customer Portal: Is OpenDKIM and OpenDMARC supported in RHEL? - https://access.redhat.com/solutions/5241271
- Fedora Packages: `opendkim-tools` - https://packages.fedoraproject.org/pkgs/opendkim/opendkim-tools/
- DMARC.org Deployment Tools - https://dmarc.org/resources/deployment-tools/
- Swaks project documentation - https://jetmore.org/john/code/swaks/

## Issues Found
- The introduction said DKIM proves a message was sent from an authorized server. DKIM actually proves the message was signed by a domain that controls the corresponding private key, so the wording was corrected to match RFC 6376.
- The OpenDKIM example used `TrustedHosts`, which is not the documented directive for deciding which clients are signed. It was corrected to `InternalHosts`, and the surrounding explanation and conclusion were updated to match OpenDKIM's documented behavior.
- The RHEL/CentOS install command only installed `opendkim`, even though the post later uses `opendkim-genkey` and `opendkim-testkey`. It was updated to a current `dnf` example that installs `opendkim-tools`, and the note now clarifies that RHEL/CentOS requires EPEL.
- The verification example used `check-auth@verifier.port25.com`, which DMARC.org currently lists as out of order. It was replaced with the currently listed `autoreply@dmarctest.org` message reflector.

## Review Notes
- The `swaks` and `mail` verification commands assume those utilities are already installed on the host.
- Using a 2048-bit RSA key is valid for DKIM even though OpenDKIM's `opendkim-genkey` documentation still notes a 1024-bit default.
