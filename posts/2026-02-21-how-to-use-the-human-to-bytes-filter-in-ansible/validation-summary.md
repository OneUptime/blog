# Validation Summary: How to Use the human_to_bytes Filter in Ansible

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible filters and Jinja2 templating
- `ansible.builtin.human_to_bytes`
- `ansible.builtin.human_readable`
- `ansible.builtin.debug`, `assert`, `fail`, and `template`
- `community.docker.docker_container`
- JVM memory options
- Nginx HTTP configuration directives
- PostgreSQL memory configuration parameters

## Sources Consulted
- Ansible documentation: `ansible.builtin.human_to_bytes` filter, https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/human_to_bytes_filter.html
- Ansible documentation: `ansible.builtin.human_readable` filter, https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/human_readable_filter.html
- Ansible source: `human_to_bytes` and `bytes_to_human` implementations, https://raw.githubusercontent.com/ansible/ansible/devel/lib/ansible/module_utils/common/text/formatters.py
- Ansible documentation: `community.docker.docker_container` module, https://docs.ansible.com/projects/ansible/latest/collections/community/docker/docker_container_module.html
- Nginx documentation: `ngx_http_core_module`, https://nginx.org/en/docs/http/ngx_http_core_module.html
- Nginx documentation: `ngx_http_proxy_module`, https://nginx.org/en/docs/http/ngx_http_proxy_module.html
- Oracle Java documentation: `java` command options, https://docs.oracle.com/en/java/javase/11/tools/java.html
- PostgreSQL documentation: configuration parameter units, https://www.postgresql.org/docs/17/config-setting.html
- PostgreSQL documentation: resource consumption settings, https://www.postgresql.org/docs/17/runtime-config-resource.html
- PostgreSQL documentation: WAL settings, https://www.postgresql.org/docs/15/runtime-config-wal.html

## Issues Found
- The bit-based example described the use case as network bandwidth measured in bits and labelled `1 Mb` as megabits. Ansible's `human_to_bytes` filter uses binary K/M/G multipliers for both byte and bit strings, so this could be confused with decimal network bandwidth units. Changed the wording, example comment, and task name to say "bit-based values" that use Ansible's binary K/M/G scale, and removed the parenthetical label.

## Review Notes
The post uses the short filter names `human_to_bytes` and `human_readable`, which are supported. The official Ansible documentation recommends the FQCN form, such as `ansible.builtin.human_to_bytes`, for documentation linking and to avoid collection name conflicts.
