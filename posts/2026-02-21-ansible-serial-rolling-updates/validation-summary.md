# Validation Summary: How to Use Ansible serial for Rolling Updates

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ansible playbooks
- Ansible `serial`, `max_fail_percentage`, and `any_errors_fatal`
- Ansible magic variables
- Ansible built-in modules: `uri`, `copy`, `unarchive`, `service`, `include_role`, `set_stats`, `pause`
- Ansible community collections: `community.docker`, `community.general`
- Docker container deployment
- HAProxy load balancer coordination

## Sources Consulted
- Ansible playbook strategy documentation, including `serial` batch sizing and percentage/list behavior: https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_strategies.html
- Ansible error handling documentation, including `any_errors_fatal` and `max_fail_percentage`: https://docs.ansible.com/projects/ansible-core/devel/playbook_guide/playbooks_error_handling.html
- Ansible special variables documentation for `ansible_play_batch` and `ansible_play_hosts`: https://docs.ansible.com/projects/ansible/latest/reference_appendices/special_variables.html
- Ansible `ansible.builtin.set_stats` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/set_stats_module.html
- Ansible `ansible.builtin.uri` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/uri_module.html
- Ansible `community.docker.docker_image` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/docker/docker_image_module.html
- Ansible `community.docker.docker_container` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/docker/docker_container_module.html
- Ansible `community.general.haproxy` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/general/haproxy_module.html

## Issues Found
- The Docker example used short module names `docker_image` and `docker_container`. Updated them to current fully qualified collection names, `community.docker.docker_image` and `community.docker.docker_container`, matching current Ansible collection documentation.
- The image pull task said it pulled the latest application but used `source: pull` without forcing a pull when the image already exists locally. Added `force_source: true` so the task actually pulls the current registry image for `myapp:latest`.
- The post stated that any failed host in a serial batch stops later batches by default. Current Ansible behavior is that failed hosts are removed from active hosts, while the play continues for remaining active hosts unless `any_errors_fatal` or `max_fail_percentage` stops it. Updated the explanation.
- The progressive `serial` example described `"25%"` as 25% of the remaining hosts. Ansible calculates percentage batch sizes from the total play host count, with at least one host per pass. Updated the comment and 20-host batch breakdown from `1, 5, 4, 10` to `1, 5, 5, 9`.
- The monitoring example labeled `ansible_play_hosts | length` as `hosts_in_batch`, but `ansible_play_hosts` is not limited by `serial`. Changed it to `ansible_play_batch | length`.

## Review Notes
Local Ansible Core 2.21.0 checks were used to confirm the default serial failure behavior and progressive percentage batching. The example snippets are illustrative and still assume the relevant collections and services are installed and configured on the target systems.
