# Validation Summary: How to Use the human_readable Filter in Ansible

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ansible
- Ansible filter plugins
- Jinja2 templating
- Ansible facts
- Docker CLI
- JMESPath/json_query

## Sources Consulted
- Ansible `ansible.builtin.human_readable` filter documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/human_readable_filter.html
- Ansible `ansible.builtin.human_to_bytes` filter documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/human_to_bytes_filter.html
- Ansible `ansible.builtin.setup` module documentation: https://docs.ansible.com/projects/ansible-core/2.16/collections/ansible/builtin/setup_module.html
- Ansible facts documentation: https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_vars_facts.html
- Ansible `community.general.json_query` filter documentation: https://docs.ansible.com/ansible/latest/collections/community/general/json_query_filter.html
- Docker `docker stats` CLI documentation: https://docs.docker.com/reference/cli/docker/container/stats/
- Jinja template documentation: https://jinja.palletsprojects.com/en/stable/templates/

## Issues Found
- The post said `unit` specifies the input unit. Ansible documentation says `unit` forces the output unit, so the unit examples and summary were corrected.
- The post described `isbits=true` as decimal mode. Ansible uses `isbits=true` to interpret the input as bits instead of bytes, so the section was corrected to "Bytes vs Bits."
- Several expected output strings used one decimal place, but Ansible's `human_readable` output uses two decimal places in these examples. The affected outputs were corrected.
- Some examples applied `human_readable` after unparenthesized arithmetic. Jinja filter precedence can apply the filter to only the last operand, so the arithmetic expressions were parenthesized.
- The low-disk alert example used `json_query` with division in a JMESPath expression. JMESPath does not support that arithmetic expression, so the example was changed to loop over `ansible_mounts` and use Ansible `when` conditions.

## Review Notes
The local `ansible` and `ansible-doc` commands were not available, but the installed Ansible Python package was available and used to verify representative `human_readable` outputs. The Docker `stats --no-stream --format` syntax and the Ansible fact names used by the post are consistent with the consulted documentation.
