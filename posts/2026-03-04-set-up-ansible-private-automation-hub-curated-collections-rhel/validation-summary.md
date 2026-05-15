# Validation Summary: How to Set Up Ansible Private Automation Hub for Curated Collections on RHEL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux
- Red Hat Ansible Automation Platform 2.4
- Private Automation Hub
- ansible-galaxy
- Ansible collection repositories and remotes
- subscription-manager and dnf

## Sources Consulted
- Red Hat Ansible Automation Platform 2.4 Installation Guide: https://docs.redhat.com/en/documentation/red_hat_ansible_automation_platform/2.4/html-single/red_hat_ansible_automation_platform_installation_guide/index
- Red Hat Ansible Automation Platform 2.4 Planning Guide, installer package instructions: https://docs.redhat.com/en/documentation/red_hat_ansible_automation_platform/2.4/html-single/red_hat_ansible_automation_platform_planning_guide/index
- Red Hat Ansible Automation Platform 2.4 Inventory File Variables: https://docs.redhat.com/en/documentation/red_hat_ansible_automation_platform/2.4/html/red_hat_ansible_automation_platform_installation_guide/appendix-inventory-files-vars
- Red Hat Ansible Automation Platform 2.4 Managing Content in Automation Hub: https://docs.redhat.com/en/documentation/red_hat_ansible_automation_platform/2.4/html-single/managing_content_in_automation_hub/managing_content_in_automation_hub
- Red Hat Ansible Automation Platform 2.4 Getting Started with Automation Hub: https://docs.redhat.com/en/documentation/red_hat_ansible_automation_platform/2.4/html/getting_started_with_automation_hub/index
- Ansible ansible-galaxy CLI documentation: https://docs.ansible.com/ansible/latest/cli/ansible-galaxy.html

## Issues Found
- The install command used `sudo dnf install automation-hub -y`, but Red Hat documents installing the `ansible-automation-platform-installer` package for the RPM installer workflow. Updated the command to install `ansible-automation-platform-installer`.
- The standalone hub inventory example used `automationhub_pg_host='localhost'` and omitted `automationhub_pg_port` and `automationhub_pg_sslmode`. Updated the example to use installer-managed database values and include the documented port and SSL mode fields.
- The remote synchronization navigation said `Collections > Repository Management > Remote` and instructed adding a certified remote. Updated it to the documented `Collections > Remotes` workflow and clarified that the built-in `rh-certified` remote is edited.
- The collection publish example targeted `/api/galaxy/content/inbound-custom/`, which is not the documented private automation hub CLI publish endpoint. Updated it to use `https://hub.example.com/api/galaxy/`.
- The approval section included an undocumented `move/staging/published` API call. Red Hat's documented approval flow for imported collections is through the `Collections > Approval` UI, so the unsupported API example was removed.

## Review Notes
- The post is version-specific to Ansible Automation Platform 2.4 on RHEL 9. For newer AAP releases, repository names, supported RHEL minor versions, and automation hub UI labels should be checked again before reuse.
