# Validation Summary: How to Use Ansible with ServiceNow for ITSM

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Ansible
- Ansible Galaxy collections
- ServiceNow ITSM
- ServiceNow change requests
- ServiceNow CMDB configuration items
- Ansible built-in modules
- community.general.ufw

## Sources Consulted
- Ansible documentation: Installing collections - https://docs.ansible.com/projects/ansible/latest/collections_guide/collections_installing.html
- Ansible Galaxy: servicenow.itsm collection overview - https://galaxy.ansible.com/servicenow/itsm
- Ansible Galaxy: servicenow.itsm.change_request module - https://galaxy.ansible.com/ui/repo/published/servicenow/itsm/content/module/change_request/
- Ansible Galaxy: servicenow.itsm.change_request_info module - https://galaxy.ansible.com/ui/repo/published/servicenow/itsm/content/module/change_request_info/
- Ansible Galaxy: servicenow.itsm.configuration_item module - https://galaxy.ansible.com/ui/repo/published/servicenow/itsm/content/module/configuration_item/
- Ansible collection source: servicenow.itsm change_request.py - https://github.com/ansible-collections/servicenow.itsm/blob/main/plugins/modules/change_request.py
- Ansible collection source: servicenow.itsm configuration_item.py - https://github.com/ansible-collections/servicenow.itsm/blob/main/plugins/modules/configuration_item.py
- Ansible collection source: servicenow.itsm change_request_info.py - https://github.com/ansible-collections/servicenow.itsm/blob/main/plugins/modules/change_request_info.py
- Ansible collection source: servicenow.itsm incident.py - https://github.com/ansible-collections/servicenow.itsm/blob/main/plugins/modules/incident.py
- Ansible collection source: ServiceNow change request field mappings - https://github.com/ansible-collections/servicenow.itsm/blob/main/plugins/module_utils/change_request.py

## Issues Found
- The change request example used `category: Software`. The servicenow.itsm default change request mapping documents lower-case category values such as `software`, so this was changed to `category: software`.
- The close change request example moved a request to `state: closed` without including `assignment_group`. The module documentation states that `assignment_group` is required for several workflow states including `closed`, so `assignment_group: "{{ snow_assignment_group }}"` was added.

## Review Notes
The YAML examples are syntactically valid. The local environment does not have Ansible installed, so module behavior was validated against the official Ansible Galaxy documentation and the upstream `ansible-collections/servicenow.itsm` source rather than by running `ansible-playbook` or `ansible-doc` locally.
