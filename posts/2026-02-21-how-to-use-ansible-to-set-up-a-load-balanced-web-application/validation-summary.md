# Validation Summary: How to Use Ansible to Set Up a Load-Balanced Web Application

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ansible playbooks, roles, inventory, handlers, and modules
- Nginx HTTP load balancing and reverse proxy configuration
- Jinja2 templates
- systemd services
- UFW firewall configuration
- Cron scheduling

## Sources Consulted
- Ansible template module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/template_module.html
- Ansible uri module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/uri_module.html
- Ansible playbook retry and until documentation: https://docs.ansible.com/projects/ansible-core/devel/playbook_guide/playbooks_loops.html#retrying-a-task-until-a-condition-is-met
- Ansible systemd_service module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/systemd_service_module.html
- Nginx HTTP load balancing documentation: https://nginx.org/en/docs/http/load_balancing.html
- Nginx HTTP health checks documentation: https://docs.nginx.com/nginx/admin-guide/load-balancer/http-health-check/
- Nginx ngx_http_stub_status_module documentation: https://nginx.org/en/docs/http/ngx_http_stub_status_module.html

## Issues Found
- The load balancer site template used `validate: nginx -t -c /dev/stdin < %s`. Ansible's template validation command is not executed through a shell, so shell redirection such as `< %s` will not work. I removed that invalid validation line and added an explicit `nginx -t` task after the Nginx configuration files are deployed and enabled.
- The rolling deployment pre-task was named "Disable server in load balancer", but it only queried `/nginx-status` and did not drain or disable the backend. I renamed the task and adjusted the surrounding wording so the example accurately describes status checking and per-backend health verification, not dynamic load balancer draining.
- The summary claimed "Built-in health checks remove failed backends automatically." For Nginx Open Source, the shown `max_fails` and `fail_timeout` settings are passive health checks that temporarily mark upstreams unavailable after failures; active health checks are an Nginx Plus feature. I changed the explanation to describe passive health checks accurately.

## Review Notes
The examples are illustrative and omit some role files, such as handlers and the `app.service.j2` and `nginx.conf.j2` templates. The post is still technically valid as a guide, but a production version should include explicit handler definitions, TLS configuration, backend draining, and application-specific service details.
