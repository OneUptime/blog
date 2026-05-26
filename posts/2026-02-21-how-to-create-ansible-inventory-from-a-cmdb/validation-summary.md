# Validation Summary: How to Create Ansible Inventory from a CMDB

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ansible dynamic inventory scripts
- Ansible inventory cache plugins
- Ansible `ansible.builtin.uri` module
- NetBox `netbox.netbox.nb_inventory` inventory plugin
- ServiceNow Table API
- Python `requests`
- Python `ipaddress`
- REST API authentication and pagination patterns

## Sources Consulted
- Ansible dynamic inventory development docs: https://docs.ansible.com/projects/ansible/latest/dev_guide/developing_inventory.html
- Ansible working with dynamic inventory docs: https://docs.ansible.com/projects/ansible/latest/inventory_guide/intro_dynamic_inventory.html
- Ansible cache plugin docs: https://docs.ansible.com/projects/ansible/latest/plugins/cache.html
- Ansible `ansible.builtin.jsonfile` cache plugin docs: https://docs.ansible.com/projects/ansible-core/devel/collections/ansible/builtin/jsonfile_cache.html
- Ansible `ansible.builtin.uri` module docs: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/uri_module.html
- NetBox `netbox.netbox.nb_inventory` inventory plugin docs: https://docs.ansible.com/projects/ansible/latest/collections/netbox/netbox/nb_inventory_inventory.html
- ServiceNow REST API docs: https://www.servicenow.com/docs/r/api-reference/rest-api-explorer/c_RESTAPI.html
- Python `ipaddress` module docs: https://docs.python.org/3/library/ipaddress.html
- Requests authentication docs: https://requests.readthedocs.io/en/latest/user/authentication/

## Issues Found
- The generic CMDB script introduction said it "works with any REST-based CMDB", which overstated the portability of a sample that assumes specific endpoint, pagination, and field names. Reworded it to say the script can be adapted for REST-based CMDBs.
- The generic inventory script accessed `sys.argv[2]` whenever `--host` was the first argument, which would raise `IndexError` if run manually as `./cmdb_inventory.py --host`. Added a length check before reading the hostname argument.
- The caching snippet imported `hashlib` but did not use it. Removed the unused import.

## Review Notes
The remaining examples are technically sound as illustrative patterns. ServiceNow fields such as `u_role` and `u_environment` are custom fields, so readers need to adjust them for their instance schema. Local `ansible-galaxy` and `ansible-doc` commands were not available in this environment, so CLI validation was performed against official Ansible documentation instead.
