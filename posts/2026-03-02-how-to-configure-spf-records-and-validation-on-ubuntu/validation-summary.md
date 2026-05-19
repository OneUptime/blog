# Validation Summary: How to Configure SPF Records and Validation on Ubuntu

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ubuntu
- SPF
- DNS TXT records
- Postfix
- postfix-policyd-spf-python
- pyspf-milter
- spf-tools-perl
- Python dnspython

## Sources Consulted
- RFC 7208: Sender Policy Framework (SPF) for Authorizing Use of Domains in Email, Version 1 - https://www.rfc-editor.org/rfc/rfc7208
- Postfix SMTP Access Policy Delegation documentation - https://www.postfix.org/SMTPD_POLICY_README.html
- Ubuntu manpage: policyd-spf.conf(5) - https://manpages.ubuntu.com/manpages/noble/man5/policyd-spf.conf.5.html
- Ubuntu manpage: spfquery.mail-spf-perl(1p) - https://manpages.ubuntu.com/manpages/noble/en/man1/spfquery.mail-spf-perl.1p.html
- Ubuntu package information for postfix-policyd-spf-python - https://packages.ubuntu.com/noble/all/mail/postfix-policyd-spf-python
- Ubuntu package information for spf-tools-python and related SPF packages, checked with local Ubuntu 24.04 apt metadata
- Ubuntu package information for pyspf-milter, checked with local Ubuntu 24.04 apt metadata and packaged manpage

## Issues Found
- The post described SPF records as only being at the root of a domain. SPF is evaluated for the MAIL FROM or HELO identity domain, which may be a subdomain, so the wording was corrected.
- The verification section installed `libmail-spf-perl` but then used `spfquery`. On Ubuntu 24.04, `spfquery` from the Mail::SPF implementation is provided by `spf-tools-perl`, so the package name and command options were corrected.
- The Postfix SPF validation section referred to `pypolicyd-spf` as a current option. On current Ubuntu releases the relevant policy-service package is `postfix-policyd-spf-python`, so the text and heading were corrected.
- The `policyd-spf.conf` comments used invalid/ambiguous option names for `HELO_reject` and `Mail_From_reject`. They were updated to match the packaged manpage and commented sample configuration.
- The `skip_addresses` comment said it skipped authenticated senders. That setting skips listed IP ranges such as loopback addresses; authenticated senders are skipped by placing `permit_sasl_authenticated` before the policy check. The comment was corrected.
- The `Lookup_Time` comment incorrectly described the setting as the SPF 10-lookup limit. It is an elapsed-time limit in seconds, so the comment was corrected.
- The Postfix `policyd-spf_time_limit` comment incorrectly tied the 3600-second value to the SPF DNS lookup limit. It was corrected to match Postfix policy-service guidance about spawned policy service lifetime.
- The milter option used the obsolete/unavailable `spf-milter-python` package name and old config path. It was updated to `pyspf-milter`, `/etc/pyspf-milter/pyspf-milter.conf`, and the default Ubuntu socket.
- The testing section expected an `Authentication-Results` header even though the configuration set `Header_Type = SPF`, which produces `Received-SPF`. The expected header was corrected.
- The dnspython example did not install the required `python3-dnspython` package. The install command was added before the example.
- The SPF DNS lookup-limit explanation omitted `exists` and `redirect` and overstated flattening as a simple replacement. The text was corrected to align with RFC 7208 and to warn that flattened provider IP ranges must be documented and maintained.
- The post suggested installing a non-existent generic `spf-tools` package and referenced `spf-flatten`. The Ubuntu SPF packages do not ship a standard `spf-flatten` command, so that command was removed.

## Review Notes
The post is technically valid after the corrections. Future improvements could mention DMARC alignment explicitly, because SPF pass alone does not guarantee the visible From domain aligns for DMARC.
