# Validation Summary: How to Use the password_hash Filter in Ansible

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible
- ansible.builtin.password_hash filter
- ansible.builtin.user module
- ansible.builtin.random filter
- Ansible Vault
- Jinja2 templates
- Linux password hashes
- community.general.htpasswd
- community.postgresql.postgresql_user

## Sources Consulted
- Ansible password_hash filter documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/password_hash_filter.html
- Ansible user module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/user_module.html
- Ansible random filter documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/random_filter.html
- Ansible playbook filter guide: https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_filters.html
- Ansible logging and no_log documentation: https://docs.ansible.com/projects/ansible/latest/reference_appendices/logging.html
- Ansible Vault documentation: https://docs.ansible.com/projects/ansible/latest/vault_guide/vault.html
- ansible-vault CLI documentation: https://docs.ansible.com/projects/ansible-core/devel/cli/ansible-vault.html
- community.general.htpasswd module documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/general/htpasswd_module.html
- community.postgresql.postgresql_user module documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/postgresql/postgresql_user_module.html
- Apache htpasswd documentation: https://httpd.apache.org/docs/current/en/programs/htpasswd.html
- Ubuntu password hashing documentation: https://documentation.ubuntu.com/security/security-features/cryptography/password-hashing/
- Fedora yescrypt change documentation: https://fedoraproject.org/wiki/Changes/yescrypt_as_default_hashing_method_for_shadow

## Issues Found
- The post originally overstated SHA-512 as the current default for most Linux `/etc/shadow` hashes. Current Ansible documentation confirms SHA-512 is the default for the `password_hash` filter, while Ubuntu 22.04+ and Fedora 35+ document yescrypt as their local password-hashing default. Updated the wording to describe SHA-512 as a portable Ansible choice and to note the distribution-policy caveat.
- The post described hash generation as using the standard crypt function. Current Ansible filter documentation states that `password_hash` depends on passlib and uses Python/system `crypt` as a fallback. Updated the wording to avoid implying a single backend.
- Several idempotent examples used a fixed salt but omitted `rounds`. Ansible's filter guide notes passlib and crypt can use different defaults, so the same playbook can produce different hashes on different control nodes. Added explicit `rounds=5001` to deterministic examples and adjusted the prose to mention explicit rounds.
- The post said `random(seed=item.name)` gives each user a unique salt. The seeded random expression is deterministic and stable, but uniqueness is not guaranteed. Updated the wording to "stable per-user salt."
- The template example originally generated a random-salt password hash on every render, which would make the templated file change repeatedly. Updated the Jinja2 example to use a deterministic per-user salt and explicit rounds.
- The PostgreSQL example could be read as implying `password_hash` should be used for PostgreSQL role passwords. Current `community.postgresql.postgresql_user` documentation says PostgreSQL can hash unhashed passwords itself when `encrypted=true`; clarified the comment to keep `password_hash` scoped to system-level password management.
- The rounds section said the SHA-512 default is typically 5000 rounds. Current Ansible documentation states the default varies by backend and algorithm. Updated the wording accordingly.

## Review Notes
Ansible was not installed in the local workspace, so local `ansible-doc` verification was not available. The review was completed against current official Ansible documentation. The remaining examples use valid Ansible module names and parameters according to the consulted docs.
