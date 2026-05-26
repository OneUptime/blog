# Validation Summary: How to Use Ansible Playbook for Zero-Downtime Deployments

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible playbooks
- Ansible rolling updates with `serial`
- Ansible delegation
- Ansible health checks with `uri`
- HAProxy backend management
- Nginx upstream configuration
- Symlink-based application releases and rollback

## Sources Consulted
- Ansible playbook delegation and rolling updates documentation: https://docs.ansible.com/ansible/2.9/user_guide/playbooks_delegation.html
- Ansible error handling and `max_fail_percentage` documentation: https://docs.ansible.com/ansible/latest/playbook_guide/playbooks_error_handling.html
- Ansible `community.general.haproxy` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/general/haproxy_module.html
- Ansible `ansible.builtin.uri` module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/uri_module.html
- Ansible `ansible.builtin.wait_for` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/wait_for_module.html
- Ansible `ansible.builtin.get_url` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/get_url_module.html

## Issues Found
- The description of Ansible behavior without `serial` said Ansible runs against all hosts simultaneously. This was changed to say Ansible processes the whole host group in one batch, which is more accurate because concurrency is also affected by forks and strategy.
- The HAProxy examples used the short `haproxy` module name. This was changed to `community.general.haproxy`, matching the current Ansible collection documentation and avoiding ambiguity with ansible-core installations.
- The fixed wait step after disabling a HAProxy backend was labeled as waiting for connections to drain, but the `wait_for` task only sleeps when used with `timeout`. The wording was changed to clarify that the HAProxy module performs the drain and the later task is only a pause.
- The Nginx upstream example excluded only `inventory_hostname`, which is incorrect for multi-host serial batches because each host in the batch would render a different upstream file. This was changed to use `ansible_play_batch` and an `excluded_hosts` list so the full active batch is removed from rotation.

## Review Notes
The examples remain intentionally generic and assume inventory variables such as `ansible_host`, a configured HAProxy admin socket, a defined Nginx reload handler, and release package/checksum variables are supplied by the user's environment. The HAProxy module is part of `community.general`, not `ansible-core`, so users running only ansible-core must install that collection.
