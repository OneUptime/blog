# Validation Summary: How to Use Ansible Delegation with Serial Execution

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ansible playbooks
- Ansible delegation with `delegate_to`
- Ansible serial execution and rolling updates
- Ansible error handling with `max_fail_percentage`
- Ansible `uri`, `copy`, `shell`, `pause`, and `systemd_service` modules
- HAProxy Runtime API via admin socket
- Prometheus Alertmanager silences API

## Sources Consulted
- Ansible documentation: Controlling where tasks run, delegation and local actions - https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_delegation.html
- Ansible Core documentation: Controlling playbook execution, strategies, `serial`, and `run_once` - https://docs.ansible.com/projects/ansible-core/devel/playbook_guide/playbooks_strategies.html
- Ansible documentation: `ansible.builtin.uri` module - https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/uri_module.html
- Ansible documentation: `ansible.builtin.copy` module - https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/copy_module.html
- Ansible documentation: `ansible.builtin.systemd_service` module - https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/systemd_service_module.html
- Ansible documentation: `now()` Jinja2 function - https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_templating_now.html
- Ansible Core documentation: `strftime` filter - https://docs.ansible.com/projects/ansible-core/devel/collections/ansible/builtin/strftime_filter.html
- Prometheus documentation: Alertmanager concepts and silences - https://prometheus.io/docs/alerting/latest/alertmanager/
- Prometheus Alertmanager OpenAPI specification - https://raw.githubusercontent.com/prometheus/alertmanager/main/api/v2/openapi.yaml
- HAProxy Runtime API documentation - https://www.haproxy.com/documentation/haproxy-configuration-manual/new/latest/management/

## Issues Found
- The monitoring silence example used `http://monitoring.internal:9090/api/v1/silence`, which is not the current Alertmanager silences endpoint. Updated it to `http://alertmanager.internal:9093/api/v2/silences`.
- The Alertmanager silence payload omitted fields required by the v2 OpenAPI schema. Added `isRegex: false` to the matcher and `createdBy: "ansible"` to the silence body.
- The silence `endsAt` expression used `timedelta`, which is not one of the documented arguments or helpers for Ansible's `now()` function. Replaced the `startsAt` and `endsAt` values with Ansible's documented `strftime` filter using `ansible_date_time.epoch`, adding 900 seconds for the 15-minute silence.
- The examples used `ansible.builtin.systemd`, which is kept as a backward-compatible alias. Updated examples to the current documented FQCN, `ansible.builtin.systemd_service`.

## Review Notes
- `ansible-playbook` is not installed in this environment, so I could not run a local syntax check. The playbook examples were reviewed manually against official documentation.
- The HAProxy examples assume that the HAProxy admin socket exists at `/var/run/haproxy/admin.sock`, that the socket is available on the delegated load balancer host, and that backend server names match `inventory_hostname`.
