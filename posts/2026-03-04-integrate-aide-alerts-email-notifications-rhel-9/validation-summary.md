# Validation Summary: How to Integrate AIDE Alerts with Email Notifications on RHEL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- AIDE
- s-nail / mail
- Postfix
- cron
- Bash
- curl webhooks

## Sources Consulted
- Red Hat Enterprise Linux 9 Considerations in adopting RHEL 9, package replacements: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/pdf/considerations_in_adopting_rhel_9/red_hat_enterprise_linux-9-considerations_in_adopting_rhel_9-en-us.pdf
- Red Hat Enterprise Linux 9 Security Technical Implementation Guide entry for `s-nail`: https://www.stigviewer.com/stigs/red_hat_enterprise_linux_9/2026-02-05/finding/V-257842
- Red Hat Enterprise Linux 9 Security hardening documentation for AIDE usage: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/security_hardening/security_hardening
- AIDE `aide(1)` manual for `--check` and exit status behavior: https://manpages.debian.org/testing/aide/aide.1.en.html
- Postfix configuration parameter documentation: https://www.postfix.com/postconf.5.html
- Postfix SASL README: https://www.postfix.org/SASL_README.html

## Issues Found
- The post instructed readers to install and verify the `mailx` package. On RHEL 9, Red Hat documents `mailx` as replaced by `s-nail`, and the STIG guidance identifies `s-nail` as the package that provides the `mail` command used by the scripts. I changed the prerequisite text and commands to install and verify `s-nail`.
- The Postfix relay example used `smtp_use_tls = yes`. Postfix's current documented TLS control is `smtp_tls_security_level`; for a port 587 submission relay, `encrypt` is the appropriate setting when TLS is required. I changed the command to `smtp_tls_security_level = encrypt`.
- The HTML email script embedded raw AIDE output inside a `<pre>` block. File names or report text containing `<`, `>`, or `&` could render incorrectly as HTML. I changed the command substitution to escape those characters before embedding the report.
- The webhook example built JSON by directly interpolating shell text. Messages containing quotes, backslashes, or newlines could produce invalid JSON. I changed the snippet to generate the JSON payload with Python's `json.dumps` and pipe it to `curl`.

## Review Notes
The main AIDE exit-code handling is consistent with documented AIDE behavior: `--check` reports file differences with the bitmask values `1`, `2`, and `4`, which combine into exit codes `1` through `7`; generic errors are documented separately starting at `14`. The cron entry format for `/etc/cron.d` is valid because it includes the user field. The HTML script intentionally sends only change alerts and suppresses clean runs; the basic script remains the more complete example because it also sends a distinct alert for AIDE errors.
