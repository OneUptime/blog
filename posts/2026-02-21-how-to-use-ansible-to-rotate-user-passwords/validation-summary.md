# Validation Summary: How to Use Ansible to Rotate User Passwords

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible playbooks
- Ansible Vault
- ansible.builtin.user module
- ansible.builtin.password lookup plugin
- ansible.builtin.password_hash filter
- Linux password aging with chage
- Cron scheduling

## Sources Consulted
- Ansible ansible.builtin.user module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/user_module.html
- Ansible ansible.builtin.password_hash filter documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/password_hash_filter.html
- Ansible password/hash filter guide: https://docs.ansible.com/projects/ansible-core/2.19/playbook_guide/playbooks_filters.html
- Ansible ansible.builtin.password lookup documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/password_lookup.html
- Ansible Vault documentation: https://docs.ansible.com/ansible/latest/vault_guide/vault.html
- Ansible encrypted content usage documentation: https://docs.ansible.com/ansible/latest/vault_guide/vault_using_encrypted_content.html
- Ansible logging and no_log documentation: https://docs.ansible.com/ansible/8/reference_appendices/logging.html
- Ansible 2.10 ansible.builtin collection documentation: https://docs.ansible.com/ansible/2.10/collections/ansible/builtin/index.html
- NIST SP 800-63B password guidance: https://pages.nist.gov/800-63-3/sp800-63b.html
- PCI Security Standards Council FAQ on password/passphrase changes: https://www.pcisecuritystandards.org/faqs/do-pci-dss-requirements-8-3-9-and-8-3-10-1-apply-to-all-system-components/
- Local chage(1) manual output from shadow-utils 4.13

## Issues Found
- The post said Ansible 2.9 or later was sufficient, but the examples use fully qualified collection names such as `ansible.builtin.user`, documented in the Ansible 2.10 `ansible.builtin` collection. Updated the prerequisite to Ansible 2.10 or later.
- The compliance statement said most frameworks, including SOC 2, PCI-DSS, and HIPAA, require regular password changes. That was too broad and conflicts with current password guidance in some contexts. Reworded it to refer to some compliance programs and internal policies requiring scheduled changes or changes after suspected compromise.
- The basic playbook used a placeholder SHA-512 hash that would not be a real password hash. Replaced it with a valid SHA-512 crypt hash and updated the generation comment to match the shown salt and rounds.
- Several examples used `password_hash('sha512')` without a stable salt. Ansible documentation notes this can generate a different hash on each run, causing repeated password updates even when the plaintext password has not changed. Added deterministic per-host/per-user salts using the documented seeded `random` pattern.
- The Vault example reused a single static salt for multiple users. Replaced it with per-host/per-user deterministic salts to avoid shared static salt reuse while preserving idempotent output.
- Password-setting tasks in the basic and Vault examples lacked `no_log: true`, despite the post later recommending it. Added `no_log: true` to those tasks.
- The random password example used the short lookup plugin name and older inline option style. Updated it to `ansible.builtin.password` with documented keyword arguments to match the rest of the post's FQCN style and current Ansible documentation.
- The explanation of `loop_control.label` implied it would show the username while hiding the password under `no_log`. Tightened the wording so it accurately says `no_log` protects sensitive output and `label` keeps loop output focused when task details are displayed.

## Review Notes
The post is technically relevant and the corrected examples align with current Ansible documentation. Ansible was not installed in the local environment, so playbook execution was not performed; validation was done against official Ansible documentation, authoritative password guidance, and local Linux command documentation for `chage`.
