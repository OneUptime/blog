# Validation Summary: How to Use Ansible to Set Up Application Health Checks

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible playbooks and built-in modules
- Cron scheduling
- Bash health check scripts
- curl and netcat
- Nginx location, return, header, and proxy configuration
- Application health check patterns

## Sources Consulted
- Ansible `wait_for` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/wait_for_module.html
- Ansible `uri` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/uri_module.html
- Ansible `cron` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/cron_module.html
- Ansible `file` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/file_module.html
- Ansible playbook loop and retry documentation: https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_loops.html
- Linux `crontab(5)` manual: https://man7.org/linux/man-pages/man5/crontab.5.html
- Nginx `return` directive documentation: https://nginx.org/en/docs/http/ngx_http_rewrite_module.html
- Nginx `add_header` directive documentation: https://nginx.org/en/docs/http/ngx_http_headers_module.html
- Nginx `proxy_pass` directive documentation: https://nginx.org/en/docs/http/ngx_http_proxy_module.html
- OpenBSD `nc(1)` manual: https://man.openbsd.org/nc.1

## Issues Found
- The cron interval variable was documented in seconds and converted with `(health_check_interval / 60) | int`, which made the example value `30` produce the invalid cron expression `*/0`. Changed the variable to minutes and used it directly in the cron `minute` field because cron evaluates entries at minute granularity.
- The Ansible task wrote a script to `/opt/scripts` and redirected output to `/var/log/{{ app_name }}/health-check.log`, but the example did not create those directories. Added a `file` task to create `/opt/scripts` and `/var/log/{{ app_name }}` before templating and scheduling the script.
- The project structure referenced tasks used by the post but omitted `check_dependency.yml`. Added it to the tree.
- The health check taxonomy labeled the deep check as `Deep/Startup`, which conflated deep dependency checks with startup checks. Changed the label to `Deep`.

## Review Notes
The Ansible module parameters and examples otherwise match the current official documentation. The serial deployment retry example relies on Ansible 2.16 or newer behavior for `retries` without `until`; adding an explicit `until` condition would improve compatibility with older Ansible releases.
