# Validation Summary: How to Configure Postfix with RHEL System Roles

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux
- RHEL System Roles / Linux System Roles
- Ansible playbooks
- Postfix MTA
- SMTP relay configuration
- SMTP SASL authentication
- Postfix TLS configuration

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation, "Automating system administration by using RHEL system roles": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/automating_system_administration_by_using_rhel_system_roles/automating_system_administration_by_using_rhel_system_roles
- RHEL System Roles postfix role variables documentation: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/7/html/automating_system_administration_by_using_rhel_system_roles_in_rhel_7.9/assembly_postfix-role-variables-in-system-roles_automating-system-administration-by-using-rhel-system-roles
- Linux System Roles postfix role README: https://raw.githubusercontent.com/linux-system-roles/postfix/main/README.md
- Postfix configuration parameters, postconf(5): https://www.postfix.org/postconf.5.html
- Postfix TLS support documentation: https://www.postfix.org/TLS_README.html
- Postfix replacements for deprecated features: https://www.postfix.org/DEPRECATION_README.html
- Postfix basic configuration documentation: https://www.postfix.org/BASIC_CONFIGURATION_README.html

## Issues Found
- The basic relay section said the configuration forwards all mail through the relay. With the shown settings, Postfix still treats local destinations as local, so I changed the wording to "non-local mail."
- The SMTP authentication example configured `smtp_use_tls`, which Postfix documents as obsolete in favor of `smtp_tls_security_level`. Because the example already used `smtp_tls_security_level: "encrypt"`, I removed `smtp_use_tls` and updated the comment to say TLS is required.
- The SMTP authentication example created `/etc/postfix/sasl_passwd` and ran `postmap` after including the postfix role. That can make the role's configuration check/restart run before the configured SASL map exists. I changed the example to use the role-supported `postfix_files` variable with `postmap: true`.
- The local-only example claimed "no external sending" but only set an empty `relayhost`; Postfix can still deliver non-local mail directly with the default `default_transport = smtp`. I added `default_transport: "error:Local delivery only"` so non-local delivery is rejected.

## Review Notes
- The examples use the legacy role name `rhel-system-roles.postfix`, which is still shown in some RHEL System Roles documentation and installed role paths. Current RHEL 9 and RHEL 10 documentation also commonly uses the collection FQCN `redhat.rhel_system_roles.postfix`.
- The verification command using `mail` assumes a mail user agent package such as `s-nail` or `mailx` is installed on the managed host.
