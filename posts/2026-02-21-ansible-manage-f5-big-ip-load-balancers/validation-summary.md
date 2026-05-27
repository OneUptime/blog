# Validation Summary: How to Use Ansible to Manage F5 BIG-IP Load Balancers

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ansible
- F5 BIG-IP
- f5networks.f5_modules Ansible collection
- f5networks.f5_bigip Ansible collection
- BIG-IP LTM nodes, pools, pool members, monitors, virtual servers, SSL certificates, SSL profiles, iRules, and configuration saves
- YAML playbooks and inventory

## Sources Consulted
- F5 BIG-IP Ansible Collections overview: https://clouddocs.f5.com/products/orchestration/ansible/devel/
- F5 Imperative Collection install guide: https://clouddocs.f5.com/products/orchestration/ansible/devel/f5_modules/getting_started.html
- F5 HTTPAPI connection plugin guide: https://clouddocs.f5.com/products/orchestration/ansible/devel/f5_bigip/connecton-httpapi.html
- f5networks.f5_modules collection index: https://docs.ansible.com/projects/ansible/latest/collections/f5networks/f5_modules/index.html
- f5networks.f5_modules.bigip_node module docs: https://docs.ansible.com/projects/ansible/latest/collections/f5networks/f5_modules/bigip_node_module.html
- f5networks.f5_modules.bigip_monitor_https module docs: https://docs.ansible.com/projects/ansible/latest/collections/f5networks/f5_modules/bigip_monitor_https_module.html
- f5networks.f5_modules.bigip_pool module docs: https://docs.ansible.com/projects/ansible/latest/collections/f5networks/f5_modules/bigip_pool_module.html
- f5networks.f5_modules.bigip_pool_member module docs: https://docs.ansible.com/projects/ansible/latest/collections/f5networks/f5_modules/bigip_pool_member_module.html
- f5networks.f5_modules.bigip_virtual_server module docs: https://docs.ansible.com/projects/ansible/latest/collections/f5networks/f5_modules/bigip_virtual_server_module.html
- f5networks.f5_modules.bigip_ssl_certificate module docs: https://docs.ansible.com/projects/ansible/latest/collections/f5networks/f5_modules/bigip_ssl_certificate_module.html
- f5networks.f5_modules.bigip_profile_client_ssl module docs: https://docs.ansible.com/projects/ansible/latest/collections/f5networks/f5_modules/bigip_profile_client_ssl_module.html
- f5networks.f5_modules.bigip_config module docs: https://docs.ansible.com/projects/ansible/latest/collections/f5networks/f5_modules/bigip_config_module.html

## Issues Found
- The setup section listed `f5-sdk` and `bigsuds` as required Python SDK dependencies. Current official installation guidance for the imperative collection documents installing `f5networks.f5_modules` and does not list those old SDK installs as required for these examples, so the commands were removed.
- The inventory section said BIG-IP uses `httpapi` generally, but F5 documents `f5_modules` as the imperative collection using local/provider-style execution and `f5_bigip` as the declarative collection using `httpapi`. The wording was corrected and the `httpapi` inventory was labeled as `f5networks.f5_bigip` usage.
- The maintenance-mode pool-member examples identified the member by name and port only. Official `bigip_pool_member` examples include `host` when adding or changing a member, so `maintenance_address` and `host` were added.
- The re-enable task used `state: present`. Because the `bigip_pool_member` state choices include `enabled`, and the task is specifically re-enabling a forced-offline member, it was changed to `state: enabled`.
- The maintenance comment claimed the operation drains existing connections. The wording was adjusted to match BIG-IP's state semantics more closely: forced offline allows only active connections to continue.

## Review Notes
The post now consistently treats the playbook examples as `f5networks.f5_modules` provider-based automation while still mentioning `httpapi` correctly for teams using the newer `f5networks.f5_bigip` collection. The examples still assume an existing BIG-IP version supported by the modules, existing referenced pools/profiles/iRules where applicable, and a reachable BIG-IP management API.
