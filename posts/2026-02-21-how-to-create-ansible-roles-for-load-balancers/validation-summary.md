# Validation Summary: How to Create Ansible Roles for Load Balancers

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ansible roles
- Ansible built-in modules: apt, apt_repository, file, template, copy, systemd, lineinfile, include_tasks
- HAProxy 2.8
- HAProxy ACLs, health checks, SSL termination, stick tables, rate limiting, stats page, session persistence
- YAML and Jinja2 templates

## Sources Consulted
- HAProxy 2.8 Configuration Manual: https://docs.haproxy.org/2.8/configuration.html
- HAProxy packages for Debian and Ubuntu: https://haproxy.debian.net/
- Ansible ansible.builtin.apt module documentation: https://docs.ansible.com/projects/ansible-core/devel/collections/ansible/builtin/apt_module.html
- Ansible ansible.builtin.apt_repository module documentation: https://docs.ansible.com/projects/ansible-core/2.17/collections/ansible/builtin/apt_repository_module.html
- Ansible ansible.builtin.template module documentation: https://docs.ansible.com/ansible/8/collections/ansible/builtin/template_module.html
- Ansible ansible.builtin.copy module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/copy_module.html

## Issues Found
- The rate-limiting stick table used `frontend rate_limiter` with `bind *:0`. HAProxy 2.8 rejects port `0` in a `bind` directive. Changed this section to `backend rate_limiter`, which HAProxy supports for shared stick tables referenced by `http-request track-sc0 ... table rate_limiter`.
- The SSL certificate copy task ran after configuration deployment. With a bind such as `ssl crt /etc/haproxy/certs/...`, `haproxy -c -f %s` fails if the certificate does not exist yet. Reordered `tasks/main.yml` so SSL certificates are copied before the validated configuration is deployed.
- The complete playbook enabled an HTTPS frontend but did not define any certificate content for the SSL task to deploy. Added a `haproxy_ssl_certificates` example and changed the bind path to the matching PEM file.
- The install task described the `vbernat` PPA as the official PPA for the latest stable version. Updated the wording to identify it as the Debian HAProxy packaging team PPA for the selected version, and pinned the package name to `{{ haproxy_version }}.*` to match the version-specific repository intent.
- The `haproxy_log_format` variable was defined but not used. Added a quoted `log-format` directive and made it replace `option httplog` when set, because HAProxy requires spaces in log formats to be quoted and warns when `log-format` overrides `option httplog`.

## Review Notes
The representative HAProxy 2.8 configuration produced by the corrected examples was validated with `haproxy -c -f` in the `haproxy:2.8` container. The role remains Ubuntu/PPA-oriented; future improvements could add OS-family conditionals for Debian backports or the HAProxy upstream package repository.
