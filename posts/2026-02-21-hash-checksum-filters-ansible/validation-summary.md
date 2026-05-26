# Validation Summary: How to Use the hash and checksum Filters in Ansible

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible
- Jinja2 filters
- Python hashlib-backed hashing algorithms
- Ansible modules: get_url, stat, slurp, copy, set_fact, assert, debug, unarchive
- YAML playbooks

## Sources Consulted
- Ansible ansible.builtin.hash filter documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/hash_filter.html
- Ansible ansible.builtin.checksum filter documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/checksum_filter.html
- Ansible playbook filter guide, hashing section: https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_filters.html#hashing-and-encrypting-strings-and-passwords
- Ansible ansible.builtin.get_url module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/get_url_module.html
- Ansible ansible.builtin.stat module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/stat_module.html
- Ansible ansible.builtin.slurp module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/slurp_module.html
- Ansible ansible.builtin.to_json filter documentation: https://docs.ansible.com/projects/ansible-core/2.16/collections/ansible/builtin/to_json_filter.html
- Ansible ansible.builtin.truncate filter documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/truncate_filter.html
- Python hashlib documentation: https://docs.python.org/3/library/hashlib.html

## Issues Found
- The SHA-1 output for `"Hello, World!"` was incorrect. Updated it from `943a702d06f34599aee1f8da8ef9f7296031d699` to `0a0a9f2a6772942557ab5355d76af442f8f65e01`, matching Ansible's `hash('sha1')` behavior and Python `hashlib`.
- The `checksum` output for `"Hello, World!"` repeated the same incorrect SHA-1 value. Updated it to `0a0a9f2a6772942557ab5355d76af442f8f65e01`, matching Ansible's documented SHA-1 checksum filter.
- The algorithm comparison section implied a fixed set of available algorithms. Updated the wording to describe these as common algorithms and clarified that `hash` supports algorithms available from Python's `hashlib` on the Ansible control node.
- The SHA-512 table use case said "High-security applications", which overstated algorithm choice by digest length alone. Updated it to "Longer SHA-2 digest requirements."

## Review Notes
The examples use plain hashes for deterministic identifiers, cache keys, checksums, and change detection, which is appropriate. For password storage or dedicated password hashing, Ansible's `password_hash` filter is the more appropriate filter; for message authentication or key derivation, an HMAC or KDF would usually be preferable to a plain hash.
