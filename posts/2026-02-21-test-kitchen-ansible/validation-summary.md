# Validation Summary: How to Use Test Kitchen with Ansible

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Test Kitchen
- kitchen-ansible
- kitchen-vagrant
- Chef InSpec
- Ansible
- ansible-core
- ansible-lint
- yamllint
- GitHub Actions
- GitLab CI

## Sources Consulted
- Test Kitchen kitchen.yml documentation: https://test-kitchen.chef.io/docs/getting-started/kitchen-yml/
- Chef Workstation Test Kitchen configuration reference: https://docs.chef.io/workstation/config_yml_kitchen/
- Chef Workstation kitchen CLI documentation: https://docs.chef.io/workstation/ctl_kitchen/
- Test Kitchen drivers documentation: https://test-kitchen.chef.io/docs/drivers/
- kitchen-ansible README and provisioner options: https://github.com/neillturner/kitchen-ansible and https://github.com/neillturner/kitchen-ansible/blob/master/provisioner_options.md
- Chef InSpec service resource documentation: https://docs.chef.io/inspec/7.0/resources/core/service/
- Chef InSpec port resource documentation: https://docs.chef.io/inspec/resources/core/port/
- Ansible community.general.timezone documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/general/timezone_module.html
- Ansible ansible.builtin.service_facts documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/service_facts_module.html

## Issues Found
- The post was titled and described as a Test Kitchen guide but used Molecule project structure, configuration, commands, CI examples, idempotency behavior, and Testinfra examples. Replaced those examples with Test Kitchen `kitchen.yml`, `kitchen` CLI commands, kitchen-ansible provisioner configuration, and InSpec verification tests.
- The setup command installed Python/Molecule tools instead of Test Kitchen and its Ruby plugins. Updated setup to install `test-kitchen`, `kitchen-ansible`, `kitchen-vagrant`, `kitchen-inspec`, Ansible linting tools, and the `community.general` collection.
- The CI snippets used Molecule commands and variables. Updated them to run `kitchen test` against Test Kitchen instance names on runners intended for Vagrant-based testing.
- The idempotency section claimed Molecule behavior. Updated it to kitchen-ansible's `idempotency_test` option.
- The later Ansible examples used `ansible.builtin.timezone`, but the current timezone module is provided by `community.general`. Updated the FQCN and added collection installation.
- The SSH restart handler used `sshd` unconditionally, which is not the service name on Debian/Ubuntu. Added a service-name variable that uses `ssh` on Debian-family systems and `sshd` elsewhere.
- The UFW tasks were not portable to the Rocky Linux platform shown earlier. Restricted those tasks to Debian-family systems.

## Review Notes
The examples now match Test Kitchen terminology and plugin behavior. The CI examples assume runners with Vagrant and a working provider installed; container-only hosted runners generally need a different driver configuration.
