# Validation Summary: How to Configure Email Relay Through Office 365 Using Postfix on RHEL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- Postfix
- Cyrus SASL
- Microsoft 365 / Exchange Online SMTP AUTH
- Microsoft Entra ID security defaults and MFA app passwords

## Sources Consulted
- Microsoft Learn: Enable or disable authenticated client SMTP submission (SMTP AUTH) in Exchange Online - https://learn.microsoft.com/en-us/Exchange/clients-and-mobile-in-exchange-online/authenticated-client-smtp-submission
- Microsoft Learn: Fix issues with printers, scanners, and LOB apps that send email using Microsoft 365 - https://learn.microsoft.com/en-gb/troubleshoot/exchange/email-delivery/fix-issues-with-printers-scanners-and-lob-applications-that-send-email-using-off
- Microsoft Learn: Exchange Online limits - https://learn.microsoft.com/en-us/office365/servicedescriptions/exchange-online-service-description/exchange-online-limits
- Microsoft Learn: Security defaults in Microsoft Entra ID - https://learn.microsoft.com/en-us/entra/fundamentals/security-defaults
- Microsoft Learn: Configure app passwords for Microsoft Entra multifactor authentication - https://learn.microsoft.com/en-us/entra/identity/authentication/howto-mfa-app-passwords
- Red Hat Documentation: Deploying mail servers on RHEL 9 - https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/deploying_mail_servers/deploying_mail_servers
- Red Hat Documentation: RHEL 9 considerations, mailx replaced by s-nail - https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/considerations_in_adopting_rhel_9/
- Postfix documentation: postconf(5) configuration parameters - https://www.postfix.org/postconf.5.html
- Postfix documentation: canonical(5) address rewriting tables - https://www.postfix.org/canonical.5.html

## Issues Found
- The post said tenants with security defaults enabled might need an app password or exception. Microsoft documents that SMTP AUTH is disabled when security defaults are enabled, so this username/password setup will not work until security defaults are disabled. Updated the text to reference Microsoft Entra ID and Conditional Access instead of an app-password workaround for security defaults.
- The package installation command did not install a RHEL 9 mail client even though the test command uses `mail`. RHEL 9 replaced `mailx` with `s-nail`, so `s-nail` was added to the install command.
- The sender rewriting explanation said Office 365 requires the sender to match the authenticated account or an alias. Microsoft also supports sending from another address when the authenticated account has Send As permission. Updated the relevant comments and troubleshooting text.
- The MFA troubleshooting note implied that app passwords are the general fix. Updated it to clarify that app passwords only apply when per-user MFA and app passwords are allowed, and that security defaults or Conditional Access legacy-authentication blocks must be handled separately.
- The shared mailbox section implied a shared mailbox can replace a licensed authenticated user for relaying. Shared mailbox sign-in is disabled by default; the supported pattern is to authenticate as a licensed user and grant Send As permission for the shared mailbox. Updated that section.

## Review Notes
The core Postfix relay configuration, SASL password map format, STARTTLS relayhost setting, `postmap` usage, and sender canonical map examples are consistent with Postfix documentation. Microsoft has announced continuing changes around SMTP AUTH Basic Authentication retirement timelines, so this topic should be revisited before publication if the post is republished close to or after late 2026.
