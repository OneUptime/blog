# Validation Summary: How to Generate Password Hashes for Ansible user Module

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ansible `ansible.builtin.user` module
- Ansible `password_hash` filter
- Ansible `ansible.builtin.password` lookup plugin
- Python `crypt` module
- Passlib `sha512_crypt`
- Debian/Ubuntu `mkpasswd` from `whois`
- OpenSSL `passwd`
- Linux `/etc/shadow` password hash formats

## Sources Consulted
- Ansible `ansible.builtin.user` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/user_module.html
- Ansible filter documentation for `password_hash`: https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_filters.html
- Ansible `ansible.builtin.password` lookup documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/password_lookup.html
- Python `crypt` module documentation: https://docs.python.org/3/library/crypt.html
- Passlib `sha512_crypt` documentation: https://passlib.readthedocs.io/en/stable/lib/passlib.hash.sha512_crypt.html
- Debian `mkpasswd(1)` manpage for the `whois` package: https://manpages.debian.org/testing/whois/mkpasswd.1.en.html
- OpenSSL `openssl-passwd` documentation: https://docs.openssl.org/3.6/man1/openssl-passwd/
- Local command checks: `python3 --version`, `openssl passwd -help`

## Issues Found
- The post described Python's `crypt` module as the most portable option and said it works on any system with Python installed. This is no longer accurate because `crypt` was deprecated in Python 3.11, removed in Python 3.13, and is only available on supported Unix-like builds. Updated the wording to limit the method to Python 3.12 and older where available, and pointed newer or more portable use cases to Passlib.
- The Ansible `password_hash` idempotency examples used a fixed salt but did not set `rounds`. Official Ansible documentation notes that output can differ depending on whether Passlib is installed, and recommends specifying rounds for idempotency. Updated the fixed-salt examples and decision tree to include explicit `rounds`.
- The rounds discussion blurred the defaults across implementations. Updated it to distinguish the traditional `crypt` default of 5000 rounds from Passlib's `sha512_crypt` default of 656000 rounds, and noted why explicit rounds matter for repeatable Ansible output.
- The hash verification snippet used Python `crypt` without a version caveat. Updated the lead-in to make clear that the snippet applies to Python 3.12 and older.
- The salt guidance said longer SHA-512 salts are silently truncated. Passlib documents invalid salt handling as a `ValueError` by default, with truncation only in relaxed mode, so the guidance now says to keep salts at 16 characters or fewer and notes implementation differences.

## Review Notes
The command examples for Debian `mkpasswd`, OpenSSL `passwd -6`, Passlib `sha512_crypt`, Ansible `ansible.builtin.user`, and the Ansible password lookup syntax were consistent with the referenced documentation. Passlib and Ansible were not installed locally, so those examples were verified against official documentation rather than executed in this workspace.
