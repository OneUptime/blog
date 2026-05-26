# Validation Summary: How to Use Ansible to Manage /etc/hosts File

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ansible
- ansible.builtin.lineinfile
- ansible.builtin.template
- ansible.builtin.setup
- Jinja2 templates and filters
- Linux /etc/hosts
- Linux nsswitch.conf hostname resolution

## Sources Consulted
- Ansible `ansible.builtin.lineinfile` module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/lineinfile_module.html
- Ansible `ansible.builtin.template` module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/template_module.html
- Ansible inventory documentation: https://docs.ansible.com/ansible/latest/inventory_guide/intro_inventory.html
- Ansible `ansible.builtin.setup` module documentation: https://docs.ansible.com/projects/ansible-core/2.16/collections/ansible/builtin/setup_module.html
- Ansible facts and magic variables documentation: https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_vars_facts.html
- Linux `hosts(5)` manual page: https://man7.org/linux/man-pages/man5/hosts.5.html
- Linux `nsswitch.conf(5)` manual page: https://man7.org/linux/man-pages/man5/nsswitch.conf.5.html

## Issues Found
- Several `lineinfile` examples used regular expressions that did not match the line inserted by the task because the regexp expected the FQDN at the end of the line while the managed `/etc/hosts` line ended with the short hostname. Updated those regexes so repeat runs replace the existing line instead of adding duplicates.
- The inventory example used `hostvars[item].inventory_hostname` where the loop item already represents the inventory hostname. Changed the example to use `item`, which is simpler and aligns with Ansible inventory loop usage.
- The IPv4 and IPv6 examples matched the wrong field order, so they would not reliably update existing entries. Updated the regexes to match the generated `/etc/hosts` line format while keeping IPv4 and IPv6 entries distinct.
- The resolution-order diagram implied `/etc/hosts` is always checked before DNS. Updated it to show that the order depends on the `hosts:` sources in `nsswitch.conf`, where `files` maps to `/etc/hosts`.

## Review Notes
The examples assume the relevant inventory variables, groups, and gathered facts exist, such as `ansible_host`, `ansible_default_ipv4`, and groups like `databases`, `caches`, and `webservers`. That is reasonable for a tutorial, but production roles may want additional guards or defaults for missing groups and facts.
