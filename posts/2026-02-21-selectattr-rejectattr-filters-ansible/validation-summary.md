# Validation Summary: How to Use the selectattr and rejectattr Filters in Ansible

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible
- Jinja2 filters and tests
- YAML playbooks
- HAProxy configuration templating
- SSH authorized keys with ansible.posix
- Envoy cluster configuration

## Sources Consulted
- Ansible `ansible.builtin.selectattr` filter documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/selectattr_filter.html
- Ansible `ansible.builtin.rejectattr` filter documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/rejectattr_filter.html
- Jinja template designer documentation for `selectattr`, `rejectattr`, built-in tests, `map`, `join`, `list`, and `length`: https://jinja.palletsprojects.com/en/stable/templates/
- Ansible tests documentation for `match`, `search`, and `regex`: https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_tests.html
- Ansible handlers documentation for `notify` and handler definitions: https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_handlers.html
- Ansible `ansible.builtin.template` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/template_module.html
- Ansible `ansible.posix.authorized_key` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/posix/authorized_key_module.html
- Ansible `ansible.builtin.uri` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/uri_module.html
- Envoy circuit breaker API documentation: https://www.envoyproxy.io/docs/envoy/latest/api-v3/config/cluster/v3/circuit_breaker.proto

## Issues Found
- The HAProxy playbook task used `notify: Reload HAProxy` but did not define a matching handler in the snippet. Added a `handlers` section with a `Reload HAProxy` handler using `ansible.builtin.service` so the example is complete and consistent with Ansible handler semantics.
- The note for the `in` test said it is available in Ansible 2.10+. The official version marker is Jinja 2.10, so the note was updated to refer to Jinja 2.10+ and older Jinja environments.

## Review Notes
The filter examples are technically consistent with Ansible's documented use of Jinja built-in filters. The `ansible.posix.authorized_key` module is in the `ansible.posix` collection rather than `ansible-core`, so users running only `ansible-core` would need to install that collection. The examples are tutorial snippets and may still need environment-specific additions such as privilege escalation, package installation, or service availability in a production playbook.
