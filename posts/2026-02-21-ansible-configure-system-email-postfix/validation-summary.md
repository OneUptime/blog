# Validation Summary: How to Use Ansible to Configure System Email (Postfix)

## Status
validated

## Post Type
Tutorial / configuration guide

## Technologies Covered
- Ansible playbooks and built-in modules
- Postfix MTA configuration
- SMTP relay authentication with SASL
- TLS configuration for outbound SMTP
- Postfix lookup maps with postmap
- OpenDKIM signing
- Linux mail utilities and service management

## Sources Consulted
- Ansible built-in collection documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/
- Ansible handler execution documentation: https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_handlers.html
- Ansible command module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/command_module.html
- Postfix configuration parameters: https://www.postfix.org/postconf.5.html
- Postfix deprecation notes: https://www.postfix.org/DEPRECATION_README.html
- Postfix SASL how-to: https://www.postfix.org/SASL_README.html
- Postfix generic map manual: https://www.postfix.org/generic.5.html
- Postfix postmap manual: https://www.postfix.org/postmap.1.html
- opendkim-genkey manual page: https://man.archlinux.org/man/opendkim-genkey.8.en

## Issues Found
- The `main.cf` template defined `postfix_origin` but hard-coded `myorigin = $mydomain`. Changed it to `myorigin = {{ postfix_origin }}` so the documented variable actually controls the Postfix setting.
- The `smtp_tls_CAfile` path used the RedHat CA bundle location for all systems. Added a Debian conditional so Debian hosts use `/etc/ssl/certs/ca-certificates.crt` and RedHat-family hosts keep `/etc/pki/tls/certs/ca-bundle.crt`.
- The relay configuration used `smtp_use_tls = yes`, which Postfix documents as obsolete. Replaced it with `smtp_tls_security_level = encrypt`, matching current Postfix SASL relay guidance.
- The relay playbook defined `restart postfix` before the `postmap` handlers. Ansible runs handlers in definition order, so Postfix could restart before the SASL or generic map databases were rebuilt. Reordered the handlers so `postmap` runs before the service restart.
- The production tip said `inet_interfaces = loopback-only` is the default for most servers. The upstream Postfix default is `all`, so the wording was corrected to say it should be set explicitly on hosts that should not accept remote SMTP connections.

## Review Notes
The examples are generally valid for current Ansible and Postfix. The DKIM example is RedHat-oriented because it installs OpenDKIM with `yum`; a future version could add Debian package handling if the article wants full cross-distribution coverage for that section too.
