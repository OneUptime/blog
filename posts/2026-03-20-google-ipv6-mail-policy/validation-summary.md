# Validation Summary: How to Meet Google IPv6 Mail Policy Requirements

## Status
validated

## Post Type
Guide

## Technologies Covered
- Gmail sender guidelines
- IPv6 DNS
- PTR / forward DNS
- SPF
- DKIM
- DMARC
- OpenDKIM
- `swaks`
- `dig`
- Python / `pyspf`

## Sources Consulted
- Google Workspace Admin Help, Email sender guidelines: https://support.google.com/a/answer/81126?hl=en
- Google Workspace Admin Help, Email sender guidelines FAQ: https://support.google.com/a/answer/14229414?hl=en
- Google Workspace Admin Help, Gmail SMTP errors and codes: https://support.google.com/a/answer/3726730
- Google Workspace Admin Help, Set up DKIM: https://support.google.com/a/answer/174124
- RFC 7208, Sender Policy Framework (SPF): https://www.rfc-editor.org/rfc/rfc7208
- RFC 6376, DomainKeys Identified Mail (DKIM) Signatures: https://www.rfc-editor.org/rfc/rfc6376
- RFC 7489, Domain-based Message Authentication, Reporting, and Conformance (DMARC): https://www.rfc-editor.org/rfc/rfc7489
- `pyspf` project documentation: https://pypi.org/project/pyspf/
- `swaks` Debian man page: https://manpages.debian.org/unstable/swaks/swaks.1
- `opendkim-genkey` Debian man page: https://manpages.debian.org/testing/opendkim-tools/opendkim-genkey.8.en.html

## Issues Found
- The post stated SPF, DKIM, and DMARC were required for all IPv6 senders. I corrected this to match Google's current sender rules: all senders must use SPF or DKIM, while bulk senders must use SPF, DKIM, and DMARC.
- The post claimed to cover every Google IPv6 requirement but omitted Google's TLS sender requirement and treated IP warm-up as if it were a hard Gmail mandate. I reworded the introduction and requirements list, added TLS, and kept warm-up as reputation guidance.
- The SPF section implied `ip6:` is the only valid way to authorize an IPv6 sender. I corrected it to say `ip6:` is one common mechanism.
- The `pyspf` example was incorrect because `spf.check2()` was unpacked into three values. The project documentation shows that `check2()` returns two values, so I changed it to `result, msg = spf.check2(...)`.
- The `pyspf` install command was incomplete. In local validation on Python 3.12, `pip install pyspf` alone failed because required dependencies were missing, so I updated it to install `dnspython` and `authres` too.
- The DKIM section implied the snippet fully configured Postfix with OpenDKIM when it only installed tools and generated keys. I reworded that section to describe the commands accurately and updated key generation to `-b 2048` to match Google's current recommendation for Gmail.
- The Gmail delivery test used `swaks` without TLS even though Google's sender guidelines require TLS for transmitting email. I updated the sample to use `--tls`.
- The `550-5.7.1` troubleshooting section attributed the error only to PTR/FCrDNS issues. I corrected it to reflect Google's wording that the IPv6 guideline error can involve PTR/forward-DNS problems and authentication failures.

## Review Notes
- Google's sender rules are broader than IPv6-specific DNS and authentication checks. RFC 5322 formatting, spam rate, and bulk-sender alignment and unsubscribe requirements can still affect Gmail delivery even when the IPv6 setup is correct.
- The `pyspf` package is still usable, but its PyPI page reflects an older release cadence. The corrected example was validated locally only after adding the package's documented dependencies.
