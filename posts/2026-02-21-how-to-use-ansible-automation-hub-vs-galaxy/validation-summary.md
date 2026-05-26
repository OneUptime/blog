# Validation Summary: How to Use Ansible Automation Hub vs Galaxy

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Ansible
- Ansible Galaxy
- Red Hat Ansible Automation Hub
- Private Automation Hub
- Ansible Automation Platform
- ansible-galaxy
- ansible.cfg
- YAML requirements files

## Sources Consulted
- Ansible Community Documentation: Installing collections and configuring the ansible-galaxy client - https://docs.ansible.com/projects/ansible/latest/collections_guide/collections_installing.html
- Ansible Community Documentation: Ansible Automation Hub reference - https://docs.ansible.com/projects/ansible/latest/reference_appendices/automationhub.html
- Red Hat Ansible Automation Platform 2.4: Getting started with automation hub - https://docs.redhat.com/en/documentation/red_hat_ansible_automation_platform/2.4/html-single/getting_started_with_automation_hub/index
- Red Hat Ansible Automation Platform 2.6: Managing automation content - https://docs.redhat.com/en/documentation/red_hat_ansible_automation_platform/2.6/html-single/managing_automation_content/index
- Red Hat Customer Portal: Ansible Automation Platform Certified and Validated Content - https://access.redhat.com/articles/ansible-automation-platform-certified-content
- Ansible Core Documentation: Distributing collections - https://docs.ansible.com/projects/ansible-core/devel/dev_guide/developing_collections_distributing.html

## Issues Found
- Updated Automation Hub URLs from `cloud.redhat.com` to the current `console.redhat.com` host where used for user-facing Automation Hub links and current Galaxy server examples.
- Corrected Automation Hub content descriptions to include both certified and validated content, not only certified collections.
- Updated private automation hub example URLs to use repository-specific paths such as `/api/galaxy/content/rh-certified/`, matching Red Hat's documented examples.
- Replaced an incorrect direct Bearer-token collections API test with Red Hat's documented offline-token refresh check.
- Updated Private Automation Hub navigation from older "Repo Management" wording to current "Automation Content > Remotes" terminology.
- Removed an unnecessary `requests` import from the illustrative Python script because the script does not use it.
- Corrected the subscription contents wording from "AWX/Tower" to "Automation Controller (formerly Ansible Tower)".

## Review Notes
The post is technically valid after the corrections. Some examples use placeholder versions and hostnames; readers should verify exact collection versions and private hub repository names in their own Automation Hub instance.
