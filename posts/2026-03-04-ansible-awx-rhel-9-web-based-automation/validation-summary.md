# Validation Summary: How to Set Up Ansible AWX on RHEL for Web-Based Automation

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux 9
- Ansible Core
- Ansible inventory files
- Ansible playbooks
- Ansible ad hoc commands
- DNF package management
- systemd service management

## Sources Consulted
- Red Hat documentation: Installing Ansible Core on RHEL 9, https://docs.redhat.com/en/documentation/red_hat_enterprise_linux_for_sap_solutions/9/html-single/installing_rhel_9_for_sap_solutions/installing_rhel_9_for_sap_solutions
- Red Hat documentation: Managing software with the DNF tool on RHEL 9, https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/managing_software_with_the_dnf_tool/assembly_installing-rhel-9-content_managing-software-with-the-dnf-tool
- Red Hat documentation: RHEL 9 Package Manifest, https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/pdf/package_manifest/Red_Hat_Enterprise_Linux-9-Package_manifest-en-US.pdf
- Ansible documentation: Building an inventory, https://docs.ansible.com/projects/ansible/latest/inventory_guide/intro_inventory.html
- Ansible documentation: ansible.builtin.ping module, https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/ping_module.html
- Ansible documentation: ansible-playbook CLI, https://docs.ansible.com/projects/ansible/latest/cli/ansible-playbook.html
- Ansible documentation: ansible.builtin.dnf module, https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/dnf_module.html
- Ansible documentation: ansible.builtin.systemd_service module, https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/systemd_service_module.html
- Ansible AWX Operator documentation: Basic install, https://docs.ansible.com/projects/awx-operator/en/latest/installation/basic-install.html

## Issues Found
- The post claimed to install and configure Ansible AWX for web-based automation, but the steps only install Ansible Core and run command-line Ansible inventory, ad hoc command, and playbook workflows. I changed the title, tags, description, overview, and summary to describe command-line Ansible instead of AWX or a web UI.
- The playbook used `ansible.builtin.systemd`. Current Ansible documentation identifies this as a redirect and says `ansible.builtin.systemd_service` is the renamed module for managing systemd units. I updated the playbook to use `ansible.builtin.systemd_service`.
- The package list installed `htop`, and the verification command checked `rpm -q htop`. `htop` is not shown in the RHEL 9 package manifest consulted for stock RHEL packages. I removed `htop`, changed `vim` to the RHEL package name `vim-minimal`, and updated the verification command to check `tmux`.

## Review Notes
The corrected article is an Ansible Core command-line tutorial, not an AWX setup guide. A future AWX article should use the AWX Operator on Kubernetes or another currently documented AWX deployment path.
