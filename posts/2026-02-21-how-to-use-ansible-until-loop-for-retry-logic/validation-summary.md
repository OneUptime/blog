# Validation Summary: How to Use Ansible until Loop for Retry Logic

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ansible playbooks
- Ansible `until`, `retries`, and `delay`
- Ansible error handling with `failed_when`
- Ansible built-in modules: `uri`, `command`, `stat`, `get_url`, `fail`, `systemd_service`
- Ansible collections: `amazon.aws`, `community.docker`, `community.postgresql`
- Kubernetes `kubectl`
- PostgreSQL readiness checks
- Elasticsearch health API

## Sources Consulted
- Ansible Core loops documentation: https://docs.ansible.com/projects/ansible-core/devel/playbook_guide/playbooks_loops.html
- Ansible error handling documentation: https://docs.ansible.com/ansible/latest/playbook_guide/playbooks_error_handling.html
- `ansible.builtin.uri` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/uri_module.html
- `ansible.builtin.command` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/command_module.html
- `ansible.builtin.stat` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/stat_module.html
- `ansible.builtin.get_url` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/get_url_module.html
- `ansible.builtin.systemd_service` module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/systemd_service_module.html
- `amazon.aws.ec2_instance` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/amazon/aws/ec2_instance_module.html
- `amazon.aws.ec2_instance_info` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/amazon/aws/ec2_instance_info_module.html
- `community.docker.docker_image` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/docker/docker_image_module.html
- `community.postgresql.postgresql_query` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/postgresql/postgresql_query_module.html

## Issues Found
- The post stated that `register` must be used with `until`. Ansible can use `until` without `register` when the condition does not depend on the task result, so this was changed to say the result should be registered if the condition needs task output.
- The PostgreSQL service example used `ansible.builtin.systemd`. The alias is still supported, but the current module name is `ansible.builtin.systemd_service`, so the example was updated.
- The EC2 status-check example checked `instance_info.instances[0].instance_status`, but `instance_status` is not documented as a return field for `amazon.aws.ec2_instance_info`. The example now uses `amazon.aws.ec2_instance` with `state: started`, `wait: true`, and `wait_timeout`, which is the documented way to wait for EC2 status checks.
- The PostgreSQL query example used the `db` alias for `community.postgresql.postgresql_query`. The official documentation marks `db` as deprecated in favor of `login_db`, so the example was updated to `login_db`.

## Review Notes
The remaining examples are technically consistent with current Ansible documentation. Local `ansible-playbook` was not installed in the review environment, so validation was performed against official documentation rather than by running playbook syntax checks.
