# Validation Summary: How to Use the Ansible inventory_hostnames Lookup Plugin

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible
- Ansible lookup plugins
- Ansible inventory host patterns
- Jinja2 templating in Ansible
- HAProxy configuration
- etcd configuration
- Prometheus file-based service discovery
- Linux iptables
- OpenSSH ssh-keyscan

## Sources Consulted
- Ansible `ansible.builtin.inventory_hostnames` lookup documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/inventory_hostnames_lookup.html
- Ansible host pattern documentation: https://docs.ansible.com/projects/ansible/latest/inventory_guide/intro_patterns.html
- Ansible `ansible.builtin.iptables` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/iptables_module.html
- Ansible inventory documentation: https://docs.ansible.com/projects/ansible/latest/inventory_guide/intro_inventory.html

## Issues Found
- The firewall examples passed raw inventory hostnames directly to the `ansible.builtin.iptables` `source` parameter. Ansible inventory names can be aliases and are not always routable addresses. I changed both firewall loops to use `hostvars[item].ansible_host | default(item)` so the rule source uses the configured connection address when available, while still falling back to the inventory hostname.

## Review Notes
- The post's explanation of `inventory_hostnames` matches Ansible's current documentation: it accepts host patterns like those used by the `hosts:` play keyword and returns matching inventory hostnames.
- The host pattern examples for unions, intersections, exclusions, wildcards, and regexes match Ansible's documented pattern syntax.
- The HAProxy, etcd, Prometheus, and SSH known hosts examples are plausible illustrative snippets, but production deployments may need environment-specific details such as handlers, privileges, service reload tasks, certificate settings, persistent firewall configuration, and SSH key verification policy.
