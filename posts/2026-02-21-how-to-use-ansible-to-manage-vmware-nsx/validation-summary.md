# Validation Summary: How to Use Ansible to Manage VMware NSX

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible
- VMware NSX / NSX-T
- VMware `ansible-for-nsxt` collection
- NSX Policy API objects
- NSX transport zones
- NSX segments
- NSX Tier-1 gateways
- NSX distributed firewall policies
- NSX VM tags
- VMware Avi Load Balancer

## Sources Consulted
- VMware `ansible-for-nsxt` GitHub README: https://github.com/vmware/ansible-for-nsxt
- `nsxt_transport_zones` module documentation: https://ansible-for-nsxt-docs.readthedocs.io/en/latest/nsxt/nsxt_transport_zones_module.html
- `nsxt_policy_segment` module documentation: https://ansible-for-nsxt-docs.readthedocs.io/en/latest/nsxt/nsxt_policy_segment_module.html
- `nsxt_policy_tier1` module documentation: https://ansible-for-nsxt-docs.readthedocs.io/en/latest/nsxt/nsxt_policy_tier1_module.html
- `nsxt_policy_group` module documentation: https://ansible-for-nsxt-docs.readthedocs.io/en/latest/nsxt/nsxt_policy_group_module.html
- `nsxt_policy_security_policy` module documentation: https://ansible-for-nsxt-docs.readthedocs.io/en/latest/nsxt/nsxt_policy_security_policy_module.html
- `nsxt_vm_tags` module documentation: https://ansible-for-nsxt-docs.readthedocs.io/en/latest/nsxt/nsxt_vm_tags_module.html
- Ansible `community.vmware.vmware_tag_manager` documentation: https://docs.ansible.com/ansible/latest/collections/community/vmware/vmware_tag_manager_module.html
- Broadcom KB on NSX load balancer entitlement and Avi recommendation: https://knowledge.broadcom.com/external/article/401492/vmware-nsx-load-balancer-entitlement-cha.html

## Issues Found
- The installation command used `ansible-galaxy collection install vmware.ansible_for_nsxt`, but VMware's official README installs this collection from the GitHub repository. Changed the command to `ansible-galaxy collection install git+https://github.com/vmware/ansible-for-nsxt`.
- The prerequisites implied that `community.vmware` could be used as an alternative for the NSX tasks. The NSX examples use `vmware.ansible_for_nsxt`; `community.vmware` is for vSphere tasks such as tag management. Updated the prerequisite to require the VMware NSX collection.
- The firewall policy referenced `grp-app-servers` but did not create it. Added an app server group with a tag condition matching `app|tier`.
- The firewall rules were missing the required `id` field. Added stable rule IDs matching each rule name.
- The default deny firewall rule omitted required `source_groups`, `destination_groups`, and `services` fields. Added `ANY` for all three fields, matching the module documentation.
- The load balancer example used `nsxt_policy_lb_pool` and `nsxt_policy_lb_virtual_server`, but those modules are not provided by the VMware `ansible-for-nsxt` collection. Replaced the unsupported module example with guidance to use VMware Avi Load Balancer automation or direct NSX Policy API calls through `ansible.builtin.uri`.
- The VM tagging example used vCenter tags through `community.vmware.vmware_tag_manager`, which did not match the NSX group expressions used earlier in the post. Replaced it with the official `vmware.ansible_for_nsxt.nsxt_vm_tags` module and matching `scope: tier`, `tag: web` values.
- Removed load balancer automation from the description and introductory scope because the unsupported Ansible module example was removed.

## Review Notes
- The remaining NSX examples are illustrative and still require environment-specific object names, paths, credentials, and existing Tier-0 / transport-zone configuration.
- Ansible was not installed in the local environment, so CLI-based `ansible-doc` or playbook syntax validation could not be run locally. The review was performed against official module documentation and the published VMware collection README.
