# Validation Summary: How to Set Up Ansible Execution Environments for RHEL Automation

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux
- Ansible Core
- Ansible inventory files
- Ansible ad hoc commands
- Ansible playbooks
- DNF package management
- systemd service management

## Sources Consulted
- Ansible Core installation guide: https://docs.ansible.com/projects/ansible-core/devel/installation_guide/intro_installation.html
- Ansible CLI documentation: https://docs.ansible.com/projects/ansible/latest/cli/ansible.html
- ansible-playbook CLI documentation: https://docs.ansible.com/projects/ansible/latest/cli/ansible-playbook.html
- Ansible INI inventory documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/ini_inventory.html
- ansible.builtin.dnf module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/dnf_module.html
- ansible.builtin.systemd_service module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/systemd_service_module.html
- Ansible check mode documentation: https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_checkmode.html
- Red Hat Enterprise Linux 9 package manifest: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/package_manifest/index
- Red Hat Ansible Automation Platform execution environment documentation: https://docs.redhat.com/en/documentation/red_hat_ansible_automation_platform/2.6/html/using_automation_execution/assembly-controller-execution-environments

## Issues Found
- The original title, tags, description, overview, and summary claimed the post set up Ansible execution environments. The content only installed and used Ansible Core directly, while official Red Hat documentation defines execution environments as container images built with Ansible Builder. Updated the metadata and summary language to describe Ansible Core automation instead.
- The inventory section said readers could create `/etc/ansible/hosts` or a local inventory file, but every command used `-i inventory.ini`. Updated the instruction to create `inventory.ini` so the commands match the described file.
- The package list installed `htop`, which is commonly provided through EPEL rather than the default RHEL 9 repositories. Replaced the example packages with `nano`, `tmux`, and `rsync`, which are listed in the RHEL 9 package manifest.
- The ad hoc commands used short module names. Updated them to use `ansible.builtin.ping` and `ansible.builtin.command` for consistency with Ansible's current FQCN recommendation.
- The playbook used `ansible.builtin.systemd`. This remains a backward-compatible alias, but current Ansible documentation recommends `ansible.builtin.systemd_service`. Updated the task to use the current FQCN.
- The verification command checked only `htop`. Updated it to verify the corrected example packages with `rpm -q nano tmux rsync`.

## Review Notes
The post is now a basic Ansible Core tutorial, not an execution environment tutorial. A future post about actual execution environments should include Ansible Builder, an `execution-environment.yml` definition, and a container runtime such as Podman.
