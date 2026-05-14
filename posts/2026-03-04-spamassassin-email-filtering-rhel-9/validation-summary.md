# Validation Summary: How to Set Up SpamAssassin for Email Filtering on RHEL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux 9
- Apache SpamAssassin
- Postfix
- spamass-milter
- systemd timers and services
- SpamAssassin Bayes training and rule updates

## Sources Consulted
- Red Hat Enterprise Linux 9 package manifest: https://access.redhat.com/documentation/en-us/red_hat_enterprise_linux/9/pdf/package_manifest/Red_Hat_Enterprise_Linux-9-Package_manifest-en-US.pdf
- Red Hat Enterprise Linux 9.4 deprecated functionality notes: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/9.4_release_notes/deprecated-functionality
- Red Hat Enterprise Linux 9 Deploying mail servers documentation: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/deploying_mail_servers/deploying_mail_servers
- Apache SpamAssassin configuration documentation: https://spamassassin.apache.org/full/3.4.x/doc/Mail_SpamAssassin_Conf.html
- Apache SpamAssassin spamc documentation: https://spamassassin.apache.org/full/4.0.x/doc/spamc.html
- Postfix after-queue content filter documentation: https://www.postfix.org/FILTER_README.html
- Postfix milter documentation: https://www.postfix.org/MILTER_README.html
- Fedora EPEL 9 spamass-milter package metadata: https://packages.fedoraproject.org/pkgs/spamass-milter/spamass-milter/epel-9.html
- Fedora EPEL 9 spamass-milter-postfix package metadata: https://packages.fedoraproject.org/pkgs/spamass-milter/spamass-milter-postfix/epel-9.html
- spamass-milter manual page: https://manpages.debian.org/testing/spamass-milter/spamass-milter.1

## Issues Found
- Added a RHEL 9.4 deprecation note for the `spamassassin` package because Red Hat lists it as deprecated and not planned for later major RHEL releases.
- Corrected the `trusted_networks` explanation. It marks relays as trusted for message path analysis; it does not skip scanning internal mail.
- Updated the milter installation command to include `spamass-milter-postfix`, which provides the Postfix-specific socket path used later in the article.
- Corrected the `spamass-milter -m` explanation. The flag disables subject/body modification; it does not enable message modification.
- Added `milter_connect_macros = j {daemon_name} v _` to match the Postfix guidance for spamass-milter.
- Changed the Postfix content filter value to `spamassassin:` because Postfix documents `content_filter` values as `transport:destination`.
- Added `flags=Rq` and `--` to the content filter pipe command to match Postfix pipe delivery guidance and protect recipient argument handling.
- Corrected the automatic update timer from `spamassassin-update.timer` to `sa-update.timer`.

## Review Notes
The article remains technically relevant and usable for RHEL 9, but readers should be aware that SpamAssassin is deprecated in RHEL 9.4 and later within the RHEL 9 lifecycle. Future updates could mention supported alternatives if the blog expands beyond the requested setup steps.
