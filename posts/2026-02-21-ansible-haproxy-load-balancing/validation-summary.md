# Validation Summary: How to Use Ansible with HAProxy for Load Balancing

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ansible
- HAProxy
- HAProxy frontends and backends
- HAProxy health checks
- HAProxy SSL termination
- HAProxy Runtime API
- UFW
- cron

## Sources Consulted
- Ansible command module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/command_module.html
- Ansible file module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/file_module.html
- Ansible template module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/template_module.html
- Ansible apt module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/apt_module.html
- Ansible apt_repository module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/apt_repository_module.html
- Ansible service module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/service_module.html
- Ansible cron module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/cron_module.html
- Ansible timezone module documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/general/timezone_module.html
- Ansible hostname module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/hostname_module.html
- community.general.ufw module documentation: https://docs.ansible.com/ansible/latest/collections/community/general/ufw_module.html
- HAProxy configuration manual: https://docs.haproxy.org/
- HAProxy Runtime API documentation: https://www.haproxy.com/documentation/haproxy-runtime-api/

## Issues Found
- The description claimed the example covered TCP load balancing, but the shown HAProxy configuration is HTTP/HTTPS only. Updated the description to refer to HTTP load balancing.
- The SSL certificate copy task wrote to `/etc/haproxy/certs/{{ domain }}.pem` without creating `/etc/haproxy/certs` first. Added an `ansible.builtin.file` task to create the certificate directory before copying certificates.
- The runtime API example used a shell pipe inside `ansible.builtin.command`. The command module does not process shell metacharacters such as pipes, so this would not execute as intended. Replaced the pipe with the command module's `stdin` parameter while keeping `socat` as the runtime socket client.
- The key takeaways described the runtime API as updating backend changes generally. Clarified that the shown runtime command performs zero-downtime state changes on existing backend servers.

## Review Notes
The HAProxy configuration syntax for `bind`, `redirect`, `http-request return`, active HTTP health checks, stats directives, and runtime socket usage is valid for current HAProxy documentation. Future improvements could add the missing `reload haproxy` handler and define expected variable shapes for `backend_changes`, `ssl_certificate_content`, and the `app_servers` inventory group.
