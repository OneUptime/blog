# Validation Summary: How to Use Ansible to Set Up a Mail Server (Postfix + Dovecot)

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ansible
- Postfix
- Dovecot
- Certbot / Let's Encrypt
- OpenDKIM
- DNS mail records including MX, PTR, and SPF
- TLS for SMTP and IMAP

## Sources Consulted
- Ansible `ansible.builtin.apt` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/apt_module.html
- Ansible environment keyword documentation: https://docs.ansible.com/projects/ansible-core/2.18/playbook_guide/playbooks_environment.html
- Certbot documentation and glossary for standalone HTTP-01 requirements: https://certbot.eff.org/
- Postfix Virtual Domain Hosting Howto: https://www.postfix.org/VIRTUAL_README.html
- Postfix Lookup Table Overview: https://www.postfix.org/DATABASE_README.html
- Postfix `postmap(1)` manual: https://www.postfix.org/postmap.1.html
- Postfix Milter README: https://www.postfix.org/MILTER_README.html
- Dovecot SSL configuration documentation: https://doc.dovecot.org/2.3/configuration_manual/ssl_configuration/
- Dovecot Postfix LMTP documentation: https://doc.dovecot.org/2.3/configuration_manual/howto/postfix_dovecot_lmtp/
- Dovecot Pigeonhole Sieve and ManageSieve documentation: https://doc.dovecot.org/2.3/configuration_manual/sieve/configuration/ and https://doc.dovecot.org/2.3/configuration_manual/sieve/managesieve/configuration/

## Issues Found
- The Ansible package installation task placed `env` under the `apt` module parameters. `env` is not an `apt` module parameter; Ansible environment variables are set with the task-level `environment` keyword. Moved `DEBIAN_FRONTEND: noninteractive` to `environment`.
- The post claimed the role included spam filtering and included SpamAssassin-related defaults and packages, but no Postfix/Dovecot integration for SpamAssassin was shown. Removed the unsupported spam-filtering claim and unused SpamAssassin variables/packages.
- The Dovecot configuration enabled `sieve` as a protocol, but the example did not install or configure the ManageSieve service required for that protocol. Removed `dovecot-sieve` from the package list and changed `protocols` to `imap lmtp`.
- The Certbot standalone command requires inbound HTTP port 80 to be reachable for the HTTP-01 challenge. Added that prerequisite.

## Review Notes
The snippets still assume omitted templates such as `postfix_master.cf.j2`, `virtual_mailboxes.j2`, `dovecot_auth.conf.j2`, `dovecot_users.j2`, and `dkim.yml` are implemented correctly elsewhere in the role. The visible Postfix lookup-table, Dovecot SSL, LMTP socket, DKIM milter, and test-command examples are consistent with the consulted documentation.
