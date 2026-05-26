# Validation Summary: How to Use Molecule with Delegated Driver

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible
- Ansible Molecule
- Molecule delegated/default driver
- AWS EC2 with the amazon.aws collection
- Vagrant
- SSH-based Ansible inventory

## Sources Consulted
- Ansible Molecule configuration documentation: https://docs.ansible.com/projects/molecule/configuration/
- Ansible Molecule pre Ansible-native configuration documentation: https://docs.ansible.com/projects/molecule/pre-ansible-native/
- Ansible Molecule Ansible-native configuration documentation: https://docs.ansible.com/projects/molecule/ansible-native/
- amazon.aws.ec2_instance module documentation: https://docs.ansible.com/projects/ansible/latest/collections/amazon/aws/ec2_instance_module.html
- Ansible built-in copy module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/copy_module.html
- Ansible now() templating function documentation: https://docs.ansible.com/ansible/latest/playbook_guide/playbooks_templating_now.html

## Issues Found
- The examples set `managed: false` and `managed: true` under individual `platforms` entries. Molecule documents `managed` as a delegated/default driver option, so the examples were updated to use `driver.options.managed`.
- The managed AWS and Vagrant examples relied on static or file-based inventory values instead of writing Molecule instance-config data from the create playbooks. The examples were updated so create playbooks write the documented instance configuration to `MOLECULE_INSTANCE_CONFIG`, and destroy playbooks reset it.
- Several playbook snippets used `molecule_ephemeral_directory` directly for paths. The examples were updated to use the documented `MOLECULE_EPHEMERAL_DIRECTORY` environment variable lookup.
- The Vagrant private key path was relative to `.vagrant` even though the Vagrantfile is created in Molecule's ephemeral directory. The example now records the private key path under `MOLECULE_EPHEMERAL_DIRECTORY`.
- The stale EC2 cleanup example used `ansible_date_time.epoch`, which depends on gathered facts. The expression now uses Ansible's `now()` function so it also works in local destroy playbooks that do not gather facts.

## Review Notes
- The post uses Molecule's pre Ansible-native configuration style. This remains documented, but newer Molecule documentation also describes an Ansible-native configuration approach that teams may prefer for new projects.
- The AWS AMI ID and subnet/security group values are examples and remain region/account-specific placeholders.
