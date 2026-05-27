# Validation Summary: How to Use Ansible to Deploy a Static Website

## Status
validated

## Post Type
Tutorial / deployment guide

## Technologies Covered
- Ansible playbooks, inventories, roles, handlers, and variables
- Ansible modules: apt, file, synchronize, template, uri, copy, systemd
- Nginx static site configuration
- rsync-based file synchronization
- npm build commands
- CI/CD artifact deployment

## Sources Consulted
- Ansible implicit localhost documentation: https://docs.ansible.com/projects/ansible/latest/inventory/implicit_localhost.html
- Ansible variables and vars_files documentation: https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_variables.html
- Ansible inventory host/group variables documentation: https://docs.ansible.com/projects/ansible/latest/inventory_guide/intro_inventory.html
- Ansible synchronize module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/posix/synchronize_module.html
- Ansible uri module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/uri_module.html
- Ansible handlers and meta: flush_handlers documentation: https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_handlers.html
- Ansible systemd module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/systemd_module.html
- Ansible retry behavior documentation: https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_loops.html
- Nginx HTTP headers module documentation: https://nginx.org/en/docs/http/ngx_http_headers_module.html
- Nginx try_files documentation: https://nginx.org/en/docs/http/ngx_http_core_module.html#try_files

## Issues Found
- The environment files were shown under group_vars/staging.yml and group_vars/production.yml, but the inventories did not define staging or production groups. Ansible only loads group_vars files automatically for matching inventory groups, so site_domain, site_dir, build_dir, and related variables would not be loaded as written. I added vars_files entries keyed by env_name to the local build play, deployment play, and CI deployment play.
- The Nginx template defined production security headers at server level, then used add_header again inside cache-specific location blocks. Per Nginx inheritance rules, add_header directives from an outer level are inherited only when the current level defines no add_header directives, so those locations would have dropped the security headers. I removed the location-level add_header Cache-Control lines and kept the expires directives for cache behavior.
- The role verified http://localhost before notified Nginx reload handlers would normally run. Ansible handlers run at the end of a play unless explicitly flushed, so the verification task could check stale configuration. I added a meta: flush_handlers task before the uri check.
- The role installed Nginx but did not explicitly ensure the service was started and enabled before verification. I added a systemd task with state: started and enabled: yes.

## Review Notes
- The synchronize module usage is broadly correct, but deployments that rely on become require passwordless sudo for rsync on the destination host.
- retries without until is supported in modern Ansible, but it requires Ansible 2.16 or newer for retry-until-success behavior.
- ansible-playbook and nginx were not installed in the local review environment, so command-level runtime validation could not be performed locally.
