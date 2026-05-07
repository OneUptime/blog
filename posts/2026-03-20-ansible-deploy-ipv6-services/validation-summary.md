# Validation Summary: How to Deploy IPv6 Services with Ansible

## Status
validated

## Post Type
Guide

## Technologies Covered
- Ansible
- IPv6
- nginx
- Apache HTTP Server
- OpenSSH
- Linux networking (`ss`)
- systemd

## Sources Consulted
- Ansible `package` module docs: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/package_module.html
- Ansible `command` module docs: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/command_module.html
- Ansible `lineinfile` module docs: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/lineinfile_module.html
- Ansible `uri` module docs: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/uri_module.html
- Ansible `systemd_service` module docs: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/systemd_service_module.html
- nginx `listen` directive docs: https://nginx.org/en/docs/http/ngx_http_core_module.html#listen
- Apache HTTP Server binding docs: https://httpd.apache.org/docs/current/bind.html
- OpenSSH `sshd_config` reference: https://man.openbsd.org/sshd_config
- Local `ss --help` output from the installed iproute2 `ss` command

## Issues Found
- The post described the examples as working on generic Linux servers, but the nginx and Apache paths (`/etc/nginx/sites-available`, `/etc/apache2/...`) and the SSH service naming are Debian/Ubuntu-specific. I scoped the description and conclusion to Debian/Ubuntu so the operational assumptions match the snippets.
- The nginx example served `/var/www/{{ server_name }}` but never created that directory or an `index.html`, so the later `uri` check could fail even when nginx was correctly bound to IPv6. I added tasks to create the document root and a sample index page.
- The Apache playbook edited `/etc/apache2/...` files before ensuring Apache was installed, which would fail on a fresh host. I added package installation and an explicit `started`/`enabled` service task so the playbook now matches the "deploy" framing.
- The Apache example added `Listen [::]:80` after `Listen 80`. Apache's official binding docs warn that overlapping `Listen` directives can cause a fatal startup error, and on Linux IPv4/IPv6 dual-stack handling uses IPv4-mapped IPv6 addresses by default. I changed the snippet to remove `Listen 80` and ensure a single `Listen [::]:80` entry instead.
- The Apache virtual host comment said `<VirtualHost *:80>` itself "listens" on all IPv4 and IPv6 addresses. Apache's docs distinguish `Listen` from `<VirtualHost>`, so I corrected that comment to reflect that the virtual host handles requests only on addresses Apache is already listening on.
- The SSH example set `ListenAddress ::` while claiming to allow both IPv4 and IPv6. OpenSSH documents that when `ListenAddress` is unset, `sshd` listens on all local addresses, and that multiple `ListenAddress` directives are needed when binding specific addresses. I changed the playbook to remove explicit `ListenAddress` directives and keep `AddressFamily any`, and I corrected the Debian/Ubuntu service name to `ssh`.
- The verification playbook used `ansible.builtin.command` with a pipe (`ss -6 -tlnp | grep nginx`), but Ansible's `command` module does not process shell metacharacters like `|`. I rewrote the task to use `argv` with `ss`'s native filter syntax and updated the assertion accordingly.
- The IPv6 HTTP verification requested `http://[::1]/` without setting the `Host` header, even though the deployed nginx server block is keyed by `server_name`. I added a `Host: example.com` header so the request targets the configured virtual host.

## Review Notes
- `ansible.builtin.systemd` is still valid. Current Ansible docs note that `ansible.builtin.systemd_service` is the renamed module and `ansible.builtin.systemd` remains an alias, so no change was required for correctness.
- Apache dual-stack behavior in this post relies on the default Linux `--enable-v4-mapped` behavior described in the Apache docs; BSD builds behave differently and would need separate-socket guidance.
- A live playbook run was not performed in this environment because Ansible CLI tools are not installed.
