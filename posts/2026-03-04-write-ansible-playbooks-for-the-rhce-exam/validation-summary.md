# Validation Summary: How to Write Ansible Playbooks for the RHCE Exam

## Status
validated

## Post Type
Tutorial / certification preparation guide

## Technologies Covered
- Red Hat Enterprise Linux
- Red Hat Certified Engineer / EX294 exam preparation
- Ansible playbooks
- Ansible inventory
- Ansible roles
- Ansible handlers, variables, facts, conditionals, loops, and templates
- ansible-navigator
- ansible-galaxy
- firewalld

## Sources Consulted
- Red Hat EX294 exam page: https://www.redhat.com/en/services/training/ex294-red-hat-certified-engineer-rhce-exam-red-hat-enterprise-linux
- Ansible inventory documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/ini_inventory.html
- Ansible dnf module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/dnf_module.html
- Ansible template module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/template_module.html
- Ansible service module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/service_module.html
- Ansible firewalld module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/posix/firewalld_module.html
- Ansible conditionals documentation: https://docs.ansible.com/projects/ansible-core/2.13/user_guide/playbooks_conditionals.html
- Ansible Galaxy CLI documentation: https://docs.ansible.com/ansible/latest/cli/ansible-galaxy.html
- Ansible Navigator FAQ and settings documentation: https://docs.ansible.com/projects/navigator/faq/ and https://docs.ansible.com/projects/navigator/settings/

## Issues Found
No technical issues found.

## Review Notes
The examples use valid Ansible playbook syntax and current fully qualified collection names. The `ansible.posix.firewalld` example depends on the `ansible.posix` collection and firewalld Python bindings being available on managed nodes, which is consistent with the official module requirements. The current Red Hat EX294 page uses updated naming around the Ansible-focused credential while still associating EX294 with RHCE preparation; the post's wording is broad enough to remain accurate.
