# Validation Summary: How to Automate IPv6 Address Planning with Ansible

## Status
validated

## Post Type
Guide / Tutorial

## Technologies Covered
- Ansible playbooks and Jinja2 templating
- IPv6 addressing and subnet planning
- Ansible `ansible.utils.ipaddr` filter
- NetBox IPAM and the `netbox.netbox` Ansible collection

## Sources Consulted
- Ansible `ipaddr()` filter documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/utils/docsite/filters_ipaddr.html
- Ansible `ansible.netcommon.ipaddr` deprecation notice: https://docs.ansible.com/projects/ansible/11/collections/ansible/netcommon/ipaddr_filter.html
- Ansible `now()` Jinja function documentation: https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_templating_now.html
- Ansible facts and `ansible_date_time` documentation: https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_vars_facts.html
- Ansible `set_fact` documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/set_fact_module.html
- Ansible `import_playbook` documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/import_playbook_module.html
- NetBox Ansible `netbox_prefix` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/netbox/netbox/netbox_prefix_module.html
- NetBox Ansible `netbox_ip_address` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/netbox/netbox/netbox_ip_address_module.html
- NetBox Prefix model documentation: https://netbox.readthedocs.io/en/stable/models/ipam/prefix/
- RFC 3849, IPv6 Address Prefix Reserved for Documentation: https://www.rfc-editor.org/rfc/rfc3849.html

## Issues Found
1. **Deprecated Ansible filter name**: The post used `ansible.netcommon.ipaddr`, which Ansible documents as a deprecated redirect to `ansible.utils.ipaddr`. I updated the example to use `ansible.utils.ipaddr` directly and converted the numeric offset to a string to match the documented query form for indexed address selection.

2. **Invalid standalone playbooks**: The Step 3, Step 4, and Step 5 YAML snippets began at `tasks:` and were not valid playbooks as written. I added proper top-level play definitions so each example is syntactically correct.

3. **Broken cross-playbook variable flow**: The original workflow ran separate playbooks, but later examples referenced `server_ipv6_map`, which was only created with `set_fact` during the earlier playbook run and would not persist across separate `ansible-playbook` executions. I fixed this by making `update-inventory.yml` import the address-calculation playbook during the same run, adding the missing `ansible-playbook update-inventory.yml` command, and having later playbooks load the generated `group_vars/servers/ipv6-assignments.yml` file and reference `host_ipv6_addresses`.

4. **Template depended on unavailable facts**: The template used `ansible_date_time.iso8601`, but the surrounding examples use `gather_facts: false`. Because `ansible_date_time` is only available after fact gathering, I replaced it with `now(utc=true, fmt='%Y-%m-%dT%H:%M:%SZ')`.

5. **NetBox prefix example used outdated fields**: The prefix example used `site`, which NetBox documents as deprecated for prefixes in NetBox 4.2+ in favor of `scope` and `scope_type`. I updated the example accordingly.

6. **NetBox IP task description was inaccurate**: The original task name said it assigned an IPv6 address to a host, but the provided data only created an IP address record and did not attach it to an interface or assigned object. I renamed the task to reflect what the example actually does and updated it to read the persisted address from `host_ipv6_addresses`.

## Review Notes
- `2001:db8::/32` is correct for documentation examples and was retained, but the post now labels it accurately as the RFC 3849 documentation prefix rather than an actual organizational allocation.
- I made the control-node dependencies explicit in the snippets: `ansible.utils` plus `netaddr` for the IP filter example, and `netbox.netbox` plus `pynetbox` for the NetBox example.
- The local review environment did not have `ansible`, `ansible-playbook`, or `ansible-doc` installed, so validation was performed against official documentation rather than by executing the examples.
