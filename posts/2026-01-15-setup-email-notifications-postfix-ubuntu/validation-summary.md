# Validation Summary: How to Set Up Email Notifications with Postfix on Ubuntu

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ubuntu 20.04, 22.04, and 24.04
- Postfix
- SMTP and SMTP relay configuration
- SASL authentication
- TLS for SMTP
- SPF and PTR DNS records
- Cron email notifications
- Shell scripting
- Python smtplib
- GNU Mailutils
- pflogsumm

## Sources Consulted
- Ubuntu Server documentation: Install and configure Postfix - https://ubuntu.com/server/docs/how-to/mail-services/install-postfix/
- Ubuntu manpages: crontab(5) for Ubuntu 20.04, 22.04, and 24.04 - https://manpages.ubuntu.com/
- Postfix official documentation: postconf(5) - https://www.postfix.org/postconf.5.html
- Postfix official documentation: SASL_README - https://www.postfix.org/SASL_README.html
- Postfix official documentation: TLS_README - https://www.postfix.org/TLS_README.html
- Postfix official documentation: ADDRESS_REWRITING_README - https://www.postfix.org/ADDRESS_REWRITING_README.html
- Postfix official documentation: generic(5) - https://www.postfix.org/generic.5.html
- Postfix official documentation: postmap(1) - https://www.postfix.org/postmap.1.html
- AWS documentation: Configuring Postfix to send email through Amazon SES - https://docs.aws.amazon.com/ses/latest/dg/postfix.html
- Google Account Help: Sign in with app passwords - https://support.google.com/accounts/answer/185833
- Ubuntu package metadata for postfix and mailutils, checked locally with apt-cache

## Issues Found
- The external SMTP relay section configured `smtp_sasl_auth_enable` and `smtp_sasl_password_maps` but did not install SASL mechanism support. On Ubuntu, the Postfix package depends on `libsasl2-2` but only suggests `libsasl2-modules`; authenticated relays can fail without the mechanism package. Added `sudo apt install libsasl2-modules -y` before the relay examples.
- The Amazon SES example configured `smtp_sasl_password_maps` but did not show the corresponding `/etc/postfix/sasl_passwd` entry. Added the SES password-file line using the same endpoint and port as the `relayhost`.
- The cron example used `MAILFROM`, but this is not documented in the Ubuntu 20.04 default crontab(5) manpage even though the post lists Ubuntu 20.04 as supported. Removed the `MAILFROM` line so the example works across the stated Ubuntu versions.
- The security hardening TLS snippet used `smtp_tls_security_level = encrypt` as general outgoing TLS guidance. Postfix documents this as mandatory TLS, which can defer direct delivery to destinations that do not offer STARTTLS. Changed the general hardening snippet to opportunistic TLS with `smtp_tls_security_level = may`, while keeping `encrypt` in the authenticated relay examples where port 587 submission relays are expected to support STARTTLS.

## Review Notes
The core Postfix parameters, map formats, `postmap` usage, queue commands, sender rewriting examples, aliases, `mail -s`, sendmail, Python `smtplib.SMTP('localhost')`, SPF examples, PTR guidance, and log monitoring commands are technically plausible for the stated tutorial scope. Future improvements could clarify that Gmail relay with a custom domain usually means Google Workspace or an approved sender identity, and that DKIM setup depends on the chosen relay/provider.
