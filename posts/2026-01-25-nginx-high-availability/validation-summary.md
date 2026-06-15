# Validation Summary: How to Configure High Availability with Nginx

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Nginx
- Keepalived
- VRRP
- Linux systemd services
- Bash scripting
- rsync
- Git
- Ansible

## Sources Consulted
- Keepalived configuration manual: https://www.keepalived.org/manpage.html
- Nginx HTTP upstream module documentation: https://nginx.org/en/docs/http/ngx_http_upstream_module.html
- Nginx HTTP load balancing documentation: https://nginx.org/en/docs/http/load_balancing.html
- Nginx HTTP headers module documentation: https://nginx.org/en/docs/http/ngx_http_headers_module.html
- Nginx HTTP core module documentation: https://nginx.org/en/docs/http/ngx_http_core_module.html
- Ansible service module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/service_module.html
- Ansible template module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/template_module.html
- Local rsync help output for rsync command syntax.
- Local git version output for git command availability.

## Issues Found
- The notification scripts were configured in Keepalived but the post only made the health check script executable. Added a chmod command for the notification scripts so Keepalived can execute them.
- The monitoring script read `/var/run/keepalived.state`, but the post did not create that file. Updated the notification scripts to write the current state to `/run/keepalived.state` and updated the monitoring script to read the same path.
- The Nginx health endpoint used `add_header Content-Type text/plain;` to set the response type. Replaced it with `default_type text/plain;`, which is the appropriate Nginx directive for the generated `return` response body and avoids duplicate Content-Type headers.
- The split-brain section described `nopreempt` as "on backup only." Updated the comment to note that `nopreempt` should be used with initial `state BACKUP`, matching Keepalived's documented behavior for preventing failback.

## Review Notes
- The example uses `user nginx;`, which is valid on many Nginx package installs, but Debian/Ubuntu distributions often use `www-data`. Operators should match the user to their installed package and operating system.
- The Keepalived examples use `interface eth0`; modern distributions may name interfaces differently, such as `ens160` or `enp0s3`.
- The webhook URLs are placeholders and were treated as illustrative examples.
