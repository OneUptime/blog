# Validation Summary: How to Use Ansible to Set Up Load Balancing with Nginx

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible
- Nginx
- HTTP load balancing
- Nginx upstream configuration
- Passive health checks
- Systemd service management

## Sources Consulted
- NGINX HTTP Load Balancing documentation: https://docs.nginx.com/nginx/admin-guide/load-balancer/http-load-balancer/
- NGINX HTTP Health Checks documentation: https://docs.nginx.com/nginx/admin-guide/load-balancer/http-health-check/
- NGINX upstream module reference: https://nginx.org/en/docs/http/ngx_http_upstream_module.html
- NGINX proxy module reference: https://nginx.org/en/docs/http/ngx_http_proxy_module.html
- NGINX stub status module reference: https://nginx.org/en/docs/http/ngx_http_stub_status_module.html
- NGINX process control documentation: https://nginx.org/en/docs/control.html
- Ansible apt module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/apt_module.html
- Ansible file module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/file_module.html
- Ansible systemd_service module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/systemd_service_module.html
- Ansible uri module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/uri_module.html

## Issues Found
- The description and introduction claimed generic health checks, sticky sessions, connection draining, and SSL termination, but the provided open source Nginx configuration only implements passive failure handling, IP-hash session affinity, and no SSL listener or certificates. I changed those claims to passive health checks/session affinity and removed the SSL termination claim.
- The variables `enable_ssl` and `health_check_interval` were unused by the provided templates and tasks. I removed them from the variable example so the configuration matches the implementation.
- The "Active Health Checks" section described an Ansible `uri` task as active health checking. NGINX active health checks use the `health_check` directive and require NGINX Plus, while the Ansible task is a pre-check. I renamed and reworded the section to "Backend Health Verification."
- The connection draining example said to set an upstream server weight to `0`, and the task passed `drain_server` without the template using it. I updated the upstream template to honor `drain_server` by appending the Nginx `down` parameter and changed the prose/task name to describe taking a server out of rotation for maintenance.

## Review Notes
The examples use short Ansible module names rather than fully qualified collection names. This is still valid, though future revisions could use `ansible.builtin.*` names for clearer documentation links and reduced ambiguity.
