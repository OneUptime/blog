# Validation Summary: How to Use Ansible Best Practices for Large Projects

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Ansible playbooks and roles
- Ansible Galaxy roles and collections
- Ansible variable precedence
- Ansible tags and playbook imports
- ansible-lint
- Ansible configuration and fact caching
- Molecule role testing
- AWS EC2 dynamic inventory
- GitHub Actions CI

## Sources Consulted
- Ansible variable precedence documentation: https://docs.ansible.com/ansible/latest/playbook_guide/playbooks_variables.html
- Ansible Galaxy user guide for role and collection requirements files: https://docs.ansible.com/ansible/latest/galaxy/user_guide.html
- Ansible configuration settings reference: https://docs.ansible.com/ansible/latest/reference_appendices/config.html
- Ansible setup module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/setup_module.html
- Ansible service_facts module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/service_facts_module.html
- Ansible systemd_service module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/systemd_service_module.html
- Ansible aws_ec2 inventory plugin documentation: https://docs.ansible.com/ansible/latest/collections/amazon/aws/aws_ec2_inventory.html
- Ansible release and maintenance documentation: https://docs.ansible.com/ansible/latest/reference_appendices/release_and_maintenance.html
- ansible-lint usage documentation: https://ansible.readthedocs.io/projects/lint/usage/
- Molecule installation documentation: https://docs.ansible.com/projects/molecule/installation/
- Molecule configuration documentation: https://docs.ansible.com/projects/molecule/configuration/
- Molecule CI documentation: https://docs.ansible.com/projects/molecule/ci/
- Ansible collection documentation for community.general, ansible.posix, community.crypto, and amazon.aws.

## Issues Found
- The pinned `ansible-core==2.16.2` version was end-of-life by the validation date. Updated the tooling pins to supported/current package versions: `ansible-core==2.20.6`, `ansible-lint==26.4.0`, and `molecule==26.4.0`.
- The Molecule example uses `driver: docker`, but the pinned Python dependencies did not install the external Docker driver package required by modern Molecule. Added `molecule-plugins[docker]==25.8.12`.
- The dynamic AWS inventory example uses `amazon.aws.aws_ec2`, but `amazon.aws` was not included in the pinned collection requirements. Added `amazon.aws` and updated the listed collection pins to current documented versions.
- The fact-gathering example said it gathered only network and hardware facts, but the `setup` module includes the minimum fact subset unless `!all,!min` is specified. Added those exclusions.
- The Molecule verification example referenced `services` directly after `service_facts`. Updated it to use the documented `ansible_facts['services']` access pattern.

## Review Notes
The remaining examples are structurally correct for the documented Ansible concepts. The Mitogen lines remain commented and should be treated as an optional third-party optimization rather than a core Ansible feature.
