# Validation Summary: How to Use Ansible to Manage OpenStack Infrastructure

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible
- Ansible `openstack.cloud` collection
- OpenStack
- OpenStackSDK
- Keystone identity projects, users, and role assignments
- Nova compute flavors and quotas
- Glance images
- Neutron security groups
- YAML configuration

## Sources Consulted
- Ansible `openstack.cloud` collection index: https://docs.ansible.com/projects/ansible/latest/collections/openstack/cloud/index.html
- Ansible `openstack.cloud.project` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/openstack/cloud/project_module.html
- Ansible `openstack.cloud.project_info` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/openstack/cloud/project_info_module.html
- Ansible `openstack.cloud.identity_user` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/openstack/cloud/identity_user_module.html
- Ansible `openstack.cloud.role_assignment` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/openstack/cloud/role_assignment_module.html
- Ansible `openstack.cloud.quota` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/openstack/cloud/quota_module.html
- Ansible `openstack.cloud.compute_flavor` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/openstack/cloud/compute_flavor_module.html
- Ansible `openstack.cloud.compute_flavor_info` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/openstack/cloud/compute_flavor_info_module.html
- Ansible `openstack.cloud.image` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/openstack/cloud/image_module.html
- Ansible `openstack.cloud.image_info` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/openstack/cloud/image_info_module.html
- Ansible `openstack.cloud.security_group` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/openstack/cloud/security_group_module.html
- Ansible `openstack.cloud.security_group_rule` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/openstack/cloud/security_group_rule_module.html
- OpenStackSDK configuration documentation: https://docs.openstack.org/openstacksdk/latest/user/config/configuration.html

## Issues Found
- The `clouds.yaml` example used Ansible variable expressions for passwords. `clouds.yaml` is read by OpenStackSDK as YAML configuration, so those values are not rendered as Ansible variables. Replaced them with explicit secure-password placeholders and updated the operational tip to recommend keeping the file out of version control, restricting permissions, or generating it from an Ansible Vault-protected template.
- The role assignment example did not specify Keystone v3 user and project domains. Added `user_domain` and `project_domain` to match the Default-domain users and projects created earlier and avoid ambiguous resource lookup.
- The second `compute_flavor` task set `extra_specs` without `ram`, `vcpus`, and `disk`, but the module requires those parameters when `state: present`. Added the required fields, `is_public`, and an explicit `state: present`.
- The image upload example used `is_public`, while current module documentation uses `visibility` for image visibility. Replaced it with `visibility: public`.
- The audit playbook referenced `ansible_date_time.date` while `gather_facts` was disabled. Enabled facts for that play so the variable is defined.

## Review Notes
- The post uses fully qualified OpenStack collection module names, which is current practice.
- The OpenStack modules require `openstacksdk` on the host executing the module; the prerequisite and install command are consistent with the collection documentation.
- The `openstack.cloud` collection documentation currently lists version 2.5.0 and supports ansible-core 2.8 or newer, so the post's Ansible 2.12+ prerequisite is conservative rather than incorrect.
