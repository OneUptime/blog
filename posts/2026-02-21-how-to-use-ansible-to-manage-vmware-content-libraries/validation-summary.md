# Validation Summary: How to Use Ansible to Manage VMware Content Libraries

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ansible
- VMware vSphere
- VMware content libraries
- VMware VM templates
- OVF/OVA deployment
- YAML playbooks

## Sources Consulted
- Ansible `vmware.vmware.local_content_library` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/vmware/vmware/local_content_library_module.html
- Ansible `vmware.vmware.subscribed_content_library` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/vmware/vmware/subscribed_content_library_module.html
- Ansible `vmware.vmware.deploy_content_library_template` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/vmware/vmware/deploy_content_library_template_module.html
- Ansible `vmware.vmware.deploy_content_library_ovf` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/vmware/vmware/deploy_content_library_ovf_module.html
- Ansible `vmware.vmware.content_template` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/vmware/vmware/content_template_module.html
- Ansible `vmware.vmware.content_library_item_info` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/vmware/vmware/content_library_item_info_module.html
- Ansible deprecated `community.vmware.vmware_content_library_manager` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/vmware/vmware_content_library_manager_module.html
- Ansible deprecated `community.vmware.vmware_content_deploy_template` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/vmware/vmware_content_deploy_template_module.html

## Issues Found
- The post used deprecated `community.vmware.vmware_content_library_manager`, `community.vmware.vmware_content_deploy_template`, and `community.vmware.vmware_content_deploy_ovf_template` modules. Replaced them with the supported `vmware.vmware` collection modules: `local_content_library`, `subscribed_content_library`, `deploy_content_library_template`, and `deploy_content_library_ovf`.
- The published library example used unsupported `publish_info` structure for the replacement module. Changed it to `publish: true` and `authentication_method: "NONE"`.
- The subscribed library example used the old generic manager module with `library_type: subscribed`. Changed it to `vmware.vmware.subscribed_content_library` and updated the publish URL example to include the `lib.json` endpoint format returned by the local content library module.
- The content library information example used `library_name` with `community.vmware.vmware_content_library_info`, but that module accepts `library_id` for a specific library. Reworked the example to use `vmware.vmware.content_library_item_info` for auditing items in a named library.
- The VM and OVF deployment examples used old parameter names such as `template`, `content_library`, `name`, `ovf_template`, and `state: poweredon`. Updated them to current parameters such as `library_item_name`, `library_name`, `vm_name`, and `power_on_after_deploy`.
- The deployment examples specified both `cluster` and `resource_pool`, which are mutually exclusive in the replacement `vmware.vmware` deploy modules. Removed `cluster` from those examples and kept `resource_pool`.
- The deployment result examples referenced `vm_deploy_info.name`, but the replacement modules return VM details under `vm`. Updated the debug messages to use `deploy_result.vm.name`.
- The template update workflow implied that updating a VM automatically pushed changes into the existing library item and referenced an IP field that the deployment module does not return. Updated the workflow to create a new content library template item from the updated VM with `vmware.vmware.content_template`.
- The template publication example used `ansible_date_time.date` while `gather_facts: false` was set. Replaced it with a date lookup that works without fact gathering.

## Review Notes
The YAML snippets parse successfully. The template update workflow still assumes the temporary VM name resolves for SSH after it is added to inventory; in a production playbook, teams should usually collect the guest IP through VMware Tools or maintain DNS/inventory records for the build VM.
