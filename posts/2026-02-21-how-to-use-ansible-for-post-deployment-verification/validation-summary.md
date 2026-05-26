# Validation Summary: How to Use Ansible for Post-Deployment Verification

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ansible playbooks
- Ansible built-in modules: `uri`, `wait_for`, `assert`, `service_facts`, `command`, `pause`, `include_role`, `include_tasks`
- systemd journal logs with `journalctl`
- Prometheus HTTP API and PromQL
- Mermaid diagrams

## Sources Consulted
- Ansible `ansible.builtin.uri` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/uri_module.html
- Ansible `ansible.builtin.wait_for` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/wait_for_module.html
- Ansible `ansible.builtin.assert` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/assert_module.html
- Ansible `ansible.builtin.service_facts` module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/service_facts_module.html
- Ansible conditionals documentation: https://docs.ansible.com/projects/ansible-core/devel/playbook_guide/playbooks_conditionals.html
- Ansible blocks and rescue documentation: https://docs.ansible.com/projects/ansible-core/devel/playbook_guide/playbooks_blocks.html
- Prometheus HTTP API documentation: https://prometheus.io/docs/prometheus/3.5/querying/api/
- Local `journalctl --help` output for `-u`, `--since`, and `--no-pager` flags.

## Issues Found
- The basic health check used `app_port | default(8080)` for `wait_for`, but the following health endpoint URL used `app_port` without the same default. Updated the URL to use `{{ app_port | default(8080) }}` so the snippet works when `app_port` is omitted.
- The `service_facts` assertion referenced a bare `services` variable. Official examples access service facts through `ansible_facts.services`, so the assertion now checks `ansible_facts.services`.
- The `service_facts` assertion embedded `{{ app_service_name }}` inside `assert.that` expressions. Since `assert.that` uses expressions like `when`, variables should be referenced directly rather than with nested template delimiters. Updated the expressions to use `app_service_name ~ '.service'`.
- The Prometheus query tasks sent `body_format: form-urlencoded` data without specifying `method: POST`. Prometheus accepts form-encoded request bodies for POST requests, so both query tasks now set `method: POST`.

## Review Notes
- The `retries` examples without `until` rely on Ansible behavior that changed in ansible-core 2.16. Adding explicit `until` conditions would improve compatibility with older Ansible versions, but the examples are valid on current Ansible.
- The PromQL metric names and labels are application-specific examples. The syntax is valid, but real deployments may need to adjust metric names or label selectors to match their instrumentation and scrape configuration.
