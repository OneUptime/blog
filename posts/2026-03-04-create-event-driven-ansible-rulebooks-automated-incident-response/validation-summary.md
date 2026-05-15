# Validation Summary: How to Create Event-Driven Ansible Rulebooks for Automated Incident Response

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux
- Ansible
- Event-Driven Ansible
- ansible-rulebook
- Ansible rulebooks
- Ansible playbooks
- EDA webhook event sources
- EDA file watch event sources

## Sources Consulted
- Ansible Rulebook installation documentation: https://docs.ansible.com/projects/rulebook/en/v1.1.7/installation.html
- Ansible Rulebook getting started documentation: https://docs.ansible.com/projects/rulebook/en/latest/getting_started.html
- Ansible Rulebook rulebooks documentation: https://docs.ansible.com/projects/rulebook/en/v1.1.0/rulebooks.html
- Ansible Rulebook event sources documentation: https://docs.ansible.com/projects/rulebook/en/v1.3.0/sources.html
- Ansible Rulebook actions documentation: https://docs.ansible.com/projects/rulebook/en/v1.3.0/actions.html
- Ansible Rulebook events and facts documentation: https://docs.ansible.com/projects/rulebook/en/latest/events_and_facts.html
- Red Hat Ansible EDA collection catalog entry: https://catalog.redhat.com/en/software/collection/ansible/eda
- Ansible community announcement for community.eda: https://forum.ansible.com/t/new-community-eda-collection/45222

## Issues Found
- The installation command only installed `ansible-rulebook`. Current Ansible Rulebook installation documentation installs `ansible-rulebook`, `ansible`, and `ansible-runner`, and lists Java 17 and pip as prerequisites. Updated the install block to install Java, pip, `ansible-rulebook`, `ansible`, and `ansible-runner`.
- The file watch example used a collection source plugin but the install steps did not install a collection that provides it. Added `ansible-galaxy collection install community.eda`.
- The webhook example used `ansible.eda.webhook`. Current Ansible Rulebook documentation documents webhook as the built-in source `eda.builtin.webhook`. Updated the example to use `eda.builtin.webhook`.
- The file watch example used `ansible.eda.file_watch`. Current migration guidance and the community EDA announcement identify `community.eda.file_watch` as the newer namespace for file watch source content. Updated the example to use `community.eda.file_watch`.

## Review Notes
The cleanup playbook is syntactically valid, but production use should be more conservative when deleting logs under `/var/log`; teams commonly add excludes, archival steps, or service-specific retention rules before removing files.
