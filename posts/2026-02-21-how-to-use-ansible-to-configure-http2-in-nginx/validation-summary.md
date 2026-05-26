# Validation Summary: How to Use Ansible to Configure HTTP/2 in Nginx

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ansible
- Nginx
- HTTP/2
- TLS/SSL
- Certbot and Let's Encrypt
- curl
- OpenSSL

## Sources Consulted
- Nginx ngx_http_v2_module documentation: https://nginx.org/en/docs/http/ngx_http_v2_module.html
- Nginx ngx_http_core_module documentation: https://nginx.org/en/docs/http/ngx_http_core_module.html
- RFC 9113, HTTP/2: https://www.rfc-editor.org/rfc/rfc9113.html
- Ansible ansible.builtin.apt module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/apt_module.html
- Ansible ansible.builtin.command module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/command_module.html
- Ansible handler documentation: https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_handlers.html
- Certbot documentation: https://certbot.eff.org/docs/
- curl documentation: https://curl.se/docs/manpage.html

## Issues Found
- The post used `listen 443 ssl http2;`, but Nginx marks the `http2` listen parameter as deprecated. Changed the example to `listen 443 ssl;` plus `http2 on;`.
- The post used `http2_max_field_size` and `http2_max_header_size`, which Nginx marks as obsolete since 1.19.7. Replaced those defaults and template directives with `large_client_header_buffers`.
- The certbot renewal cron used `--post-hook` to reload Nginx. Certbot documents `--deploy-hook` as the hook that runs after a successful renewal, so the cron job now uses `--deploy-hook`.
- The introduction listed server push as a current HTTP/2 performance improvement. Server push exists in HTTP/2 but is obsolete in current Nginx configuration and unsupported by major browsers, so the statement was narrowed to multiplexing and header compression.
- The performance section said HTTP/2 eliminates HTTP/1.1 head-of-line blocking. Updated this to say it reduces HTTP/1.1 request head-of-line blocking at the application layer, because TCP-level head-of-line blocking can still exist.
- The requirements section said HTTP/2 in Nginx requires SSL/TLS. Nginx can be configured for HTTP/2 without SSL, but browsers require HTTPS, so the requirement was clarified as applying to browser traffic and public sites.

## Review Notes
The Ansible snippets use Debian/Ubuntu-specific `apt` package names, which is technically valid for that target family but would need adaptation for RHEL-based distributions. Certbot package installation and renewal scheduling can also vary by OS package source because many installations include a systemd timer by default.
