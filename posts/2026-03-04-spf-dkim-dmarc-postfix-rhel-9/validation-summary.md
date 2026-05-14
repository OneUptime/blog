# Validation Summary: How to Set Up SPF, DKIM, and DMARC with Postfix on RHEL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux 9
- Postfix
- SPF
- DKIM
- DMARC
- OpenDKIM
- OpenDMARC
- pypolicyd-spf
- DNS TXT records
- systemd

## Sources Consulted
- RFC 7208: Sender Policy Framework (SPF) for Authorizing Use of Domains in Email, Version 1: https://www.rfc-editor.org/rfc/rfc7208
- RFC 6376: DomainKeys Identified Mail (DKIM) Signatures: https://www.rfc-editor.org/rfc/rfc6376
- RFC 7489: Domain-based Message Authentication, Reporting, and Conformance (DMARC): https://www.rfc-editor.org/rfc/rfc7489
- Postfix SMTP Access Policy Delegation: https://www.postfix.org/SMTPD_POLICY_README.html
- Postfix before-queue Milter support: https://www.postfix.org/MILTER_README.html
- Red Hat Customer Portal, OpenDKIM and OpenDMARC package availability for RHEL: https://access.redhat.com/solutions/5241271
- Fedora Packages, pypolicyd-spf EPEL 9 package: https://packages.fedoraproject.org/pkgs/pypolicyd-spf/pypolicyd-spf/
- OpenDKIM configuration manual: https://manpages.ubuntu.com/manpages/jammy/man5/opendkim.conf.5.html
- OpenDKIM key generation manual: https://man.archlinux.org/man/opendkim-genkey.8.en
- OpenDMARC configuration manual: https://manpages.debian.org/testing/opendmarc/opendmarc.conf.5.en.html
- Google Email sender guidelines: https://support.google.com/mail/answer/81126
- Microsoft email authentication documentation: https://learn.microsoft.com/en-us/defender-office-365/email-authentication-about

## Issues Found
- The post said major providers like Gmail and Outlook "require these" for reliable delivery. Updated this to "increasingly expect these records" because provider requirements vary by sender type and volume, while both Google and Microsoft document SPF, DKIM, and DMARC as important authentication and deliverability mechanisms.
- The DMARC explanation and flow implied that DKIM must pass after SPF, and that DMARC is evaluated as a simple SPF-then-DKIM chain. Updated the explanation and Mermaid flow so DMARC passes when SPF or DKIM passes with alignment to the visible From domain.
- The SPF `-all` explanation said it rejects everything else. Updated it to say it marks everything else as unauthorized with a hard fail, because RFC 7208 leaves final disposition to receiver policy.
- The SPF `mx` and `a` descriptions were imprecise. Updated them to clarify that SPF authorizes IP addresses resolved from MX hosts and A or AAAA records.
- The RHEL install commands assumed `pypolicyd-spf`, `opendkim`, and `opendmarc` were available from default RHEL repositories. Added the EPEL enable command before package installation because OpenDKIM/OpenDMARC are provided through EPEL for RHEL 9, and pypolicyd-spf is available in Fedora EPEL 9.
- The OpenDKIM sample mixed `Domain`, `Selector`, and `KeyFile` with `KeyTable` and `SigningTable`. Removed the single-domain directives because OpenDKIM signing mode requires either the single-domain directive set or the table-based directive set, not both.
- The DMARC policy progression described `quarantine` and `reject` as guaranteed actions. Updated the wording to clarify that these are requested receiver actions, consistent with RFC 7489.

## Review Notes
The Postfix policy-service and milter snippets use documented Postfix mechanisms and the milter protocol version is appropriate for modern Postfix. The tutorial still uses EPEL packages that Red Hat does not ship or support directly in RHEL, so production users should account for third-party package support and update policy.
