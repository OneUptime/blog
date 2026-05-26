# Validation Summary: How to Use Jinja2 Filters in Ansible Templates

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible templates
- Jinja2 filters and tests
- Ansible built-in filter plugins
- ansible.utils IP address filters
- Nginx configuration templating

## Sources Consulted
- Ansible Core documentation: Using filters to manipulate data - https://docs.ansible.com/projects/ansible-core/2.19/playbook_guide/playbooks_filters.html
- Jinja Template Designer Documentation: built-in filters and tests - https://jinja.palletsprojects.com/en/stable/templates/
- Ansible regex_replace filter documentation - https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/regex_replace_filter.html
- Ansible human_readable filter documentation - https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/human_readable_filter.html
- Ansible combine filter documentation - https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/combine_filter.html
- Ansible password_hash filter documentation - https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/password_hash_filter.html
- Ansible ansible.utils ipaddr filter documentation - https://docs.ansible.com/projects/ansible/latest/collections/ansible/utils/ipaddr_filter.html
- Ansible ansible.utils ipv4 filter documentation - https://docs.ansible.com/projects/ansible/latest/collections/ansible/utils/ipv4_filter.html
- NGINX HTTP Load Balancing documentation - https://docs.nginx.com/nginx/admin-guide/load-balancer/http-load-balancer/

## Issues Found
- The Nginx upstream example emitted `round_robin;` by default. NGINX uses round-robin as the default load balancing method and has no directive to enable it, so the generated config would be invalid. Changed the template to emit an upstream method directive only when `upstream.method` is defined and is not `round_robin`.
- The Nginx `root` default expression tested `vhost.server_name is iterable` without excluding strings. Because strings are iterable in Jinja, a single server name such as `example.com` produced `/var/www/e`. Changed the expression to also check `vhost.server_name is not string`, matching the earlier `server_name` logic.

## Review Notes
- The Ansible and Jinja filter examples are broadly accurate for current Ansible/Jinja usage.
- The `ansible.utils.ipaddr` and `ansible.utils.ipv4` filters require the `ansible.utils` collection, and `ipaddr` also requires `netaddr` on the controller. The post already notes the collection requirement; adding the `netaddr` dependency could improve future clarity.
