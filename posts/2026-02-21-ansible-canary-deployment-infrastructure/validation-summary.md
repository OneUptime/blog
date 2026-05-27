# Validation Summary: How to Use Ansible to Set Up Canary Deployment Infrastructure

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible playbooks, roles, handlers, loops, and modules
- Nginx upstream load balancing
- Prometheus HTTP API and PromQL
- UFW firewall management
- Cron scheduling
- Linux host provisioning

## Sources Consulted
- Ansible `ansible.builtin.uri` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/uri_module.html
- Ansible loops documentation: https://docs.ansible.com/ansible/latest/playbook_guide/playbooks_loops.html
- Ansible handlers and `meta: flush_handlers` documentation: https://docs.ansible.com/ansible/latest/playbook_guide/playbooks_handlers.html
- Ansible `ansible-playbook` CLI documentation: https://docs.ansible.com/projects/ansible/latest/cli/ansible-playbook.html
- Ansible extra variables documentation: https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_variables.html
- Ansible `community.general.timezone` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/general/timezone_module.html
- Ansible `community.general.ufw` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/general/ufw_module.html
- Ansible `ansible.builtin.cron` module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/cron_module.html
- NGINX HTTP load balancing documentation: https://docs.nginx.com/nginx/admin-guide/load-balancer/http-load-balancer/
- Prometheus HTTP API documentation: https://prometheus.io/docs/prometheus/3.5/querying/api/
- Prometheus query functions documentation: https://prometheus.io/docs/prometheus/2.55/querying/functions/

## Issues Found
- Nginx handler notifications were not flushed before each pause and metrics check. Since Ansible handlers normally run at the end of a play, the canary traffic weight could have been measured before Nginx reloaded the new upstream configuration. Added `ansible.builtin.meta: flush_handlers` after the initial and per-step template updates.
- The PromQL error-rate query divided unsummed vectors, which could return per-series values instead of one overall canary error percentage. Changed it to divide `sum(rate(...))` values.
- The rollback condition assumed a successful non-empty Prometheus vector. Added status and result-length checks before reading `result[0].value[1]`.
- The Nginx upstream template assigned the full production or canary pool weight to every server in that pool, which gives incorrect percentages when pool sizes differ. Updated the template to divide pool weight across servers and omit zero-weight pools.
- The "Force immediate promotion to 100%" command overrode `canary_weight`, but the shown tasks use `canary_promotion_steps`. Replaced it with a JSON `--extra-vars` override for `canary_promotion_steps`.
- The provisioning example used `ansible.builtin.timezone`, but the current documented module is `community.general.timezone`. Updated the module name.

## Review Notes
Ansible is not installed in the local environment, so no local `ansible-playbook --syntax-check` run was possible. The examples were reviewed against current official documentation and inspected for YAML, Ansible task, Nginx, PromQL, and CLI correctness.
