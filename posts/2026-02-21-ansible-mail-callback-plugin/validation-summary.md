# Validation Summary: How to Use the Ansible mail Callback Plugin

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible callback plugins
- `community.general.mail` callback
- `ansible.cfg`
- SMTP relays
- Ansible Vault

## Sources Consulted
- Ansible Community Documentation: `community.general.mail` callback - https://docs.ansible.com/projects/ansible/latest/collections/community/general/mail_callback.html
- Ansible Core Documentation: Callback plugins - https://docs.ansible.com/projects/ansible-core/devel/plugins/callback.html
- Ansible Core Documentation: Configuration settings (`callbacks_enabled`, `ANSIBLE_CALLBACKS_ENABLED`) - https://docs.ansible.com/projects/ansible-core/devel/reference_appendices/config.html
- Ansible `community.general.mail` callback source - https://raw.githubusercontent.com/ansible-collections/community.general/main/plugins/callback/mail.py
- GitHub author profile - https://github.com/nawazdhandala

## Issues Found
- The post described success/completion notifications and a configurable `send_on` option. The official callback only reports failures, unreachable hosts, and async failures, so the text and examples were corrected.
- The post used deprecated/currently incorrect callback enablement examples with `callback_whitelist` and `ANSIBLE_CALLBACK_WHITELIST`. These were changed to `callbacks_enabled` and `ANSIBLE_CALLBACKS_ENABLED`.
- The post used unsupported callback options including `from`, `smtpuser`, and `smtppass`. These were replaced or removed. The correct sender option is `sender`.
- The Gmail and direct Amazon SES examples required SMTP authentication/TLS options that the callback does not expose. These examples were replaced with relay-based examples.
- The environment variable section claimed non-existent `ANSIBLE_CALLBACK_MAIL_*` variables. It now only documents `SMTPHOST` for the callback's SMTP host plus Ansible's callback enablement variable.
- The email content section claimed inventory, per-host recap, and play recap content. It now reflects the callback's failure-focused body: playbook, task/module, host, error details, and result dump.
- The Vault section implied the callback can read vaulted SMTP credentials. It now explains that credentials belong in the MTA/relay configuration because the callback has no SMTP auth options.

## Review Notes
Ansible was not installed in the local environment, so `ansible-doc` could not be run locally. The review was performed against current official Ansible documentation and the upstream callback source.
