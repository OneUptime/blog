# Validation Summary: How to Use Molecule Prepare for Test Prerequisites

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible
- Molecule
- Ansible Galaxy dependencies
- PostgreSQL Ansible modules
- Ansible built-in package, service, systemd, user, group, file, copy, and uri modules
- community.crypto certificate modules
- Mermaid diagrams

## Sources Consulted
- Ansible Molecule Workflow Reference: https://docs.ansible.com/projects/molecule/workflow/
- Ansible Molecule Command Line Reference: https://docs.ansible.com/projects/molecule/usage/
- Ansible Molecule Configuration Reference: https://docs.ansible.com/projects/molecule/configuration/
- Ansible Molecule Pre Ansible-Native Configuration Reference: https://docs.ansible.com/projects/molecule/pre-ansible-native/
- Ansible Molecule Ansible-Native Configuration Reference: https://docs.ansible.com/projects/molecule/ansible-native/
- ansible.builtin.apt module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/apt_module.html
- ansible.builtin.pip module documentation: https://docs.ansible.com/projects/ansible-core/2.19/collections/ansible/builtin/pip_module.html
- community.postgresql.postgresql_db module documentation: https://docs.ansible.com/ansible/latest/collections/community/postgresql/postgresql_db_module.html
- community.postgresql.postgresql_user module documentation: https://docs.ansible.com/ansible/latest/collections/community/postgresql/postgresql_user_module.html
- community.crypto.x509_certificate module documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/crypto/x509_certificate_module.html

## Issues Found
- The lifecycle diagram and wording placed `verify` only after `idempotence` and said prepare runs "exactly once." Current Molecule documentation shows prepare before converge, with verify commonly run before and after idempotence in the default flow, and `molecule prepare` can also be run directly. Updated the diagram and wording to describe the default test flow without overclaiming.
- The mock API example installed Flask with `ansible.builtin.pip` but did not install pip, use a virtual environment, or set `break_system_packages`, which can fail on modern externally managed Python installations. Changed the example to install `python3-flask` with `ansible.builtin.package`.
- The requirements example configured Molecule to use one requirements file for both roles and collections, but the file listed only roles while earlier examples used `community.postgresql` and `community.crypto` modules. Added those collections and updated the surrounding sentence.

## Review Notes
- The post uses classic `provisioner.playbooks` and `platforms` examples, which remain documented for pre ansible-native Molecule configurations. Current Molecule documentation also shows the newer `ansible.playbooks` form for ansible-native scenarios.
- The service and systemd examples assume test images with a working service manager, such as the geerlingguy Docker images shown later in the post.
