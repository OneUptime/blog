# Validation Summary: How to Create Ansible Roles for Web Servers

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ansible
- Nginx
- Ubuntu APT repositories
- Jinja2 templates
- TLS/SSL configuration
- HTTP/2
- HTTP security headers

## Sources Consulted
- Ansible `ansible.builtin.apt_key` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/apt_key_module.html
- Ansible `ansible.builtin.deb822_repository` module documentation: https://docs.ansible.com/projects/ansible-core/devel/collections/ansible/builtin/deb822_repository_module.html
- Nginx official Linux package repository instructions: https://nginx.org/en/linux_packages.html
- Nginx HTTP/2 module documentation: https://nginx.org/en/docs/http/ngx_http_v2_module.html
- Nginx SSL module documentation: https://nginx.org/en/docs/http/ngx_http_ssl_module.html
- Nginx headers module documentation: https://nginx.org/en/docs/http/ngx_http_headers_module.html

## Issues Found
- The installation snippet used `ansible.builtin.apt_key`, which relies on the deprecated `apt-key` mechanism. Replaced it with `ansible.builtin.deb822_repository` using `signed_by`, and added `python3-debian` plus `ubuntu-keyring` to prerequisites.
- The role structure listed `ssl.yml`, `ssl_params.conf.j2`, and `dhparam.pem`, but the post did not define or use them. Removed those unused entries so the shown role structure matches the implementation.
- The Nginx virtual host template used `listen 443 ssl http2`, which is deprecated in current Nginx. Updated it to `listen 443 ssl` plus `http2 on`.
- OCSP stapling verification was enabled without a trusted certificate bundle. Added `nginx_ssl_trusted_certificate` and rendered `ssl_trusted_certificate` in the main Nginx config.
- The static-assets location defined its own `add_header Cache-Control`, which prevents inherited security headers from applying in that location under Nginx header inheritance rules. Re-included the security headers in the static-assets location and used `always` for the cache header.
- HSTS was in the shared security header include, which could apply to non-HTTPS vhosts. Moved HSTS into the SSL-enabled server block and its static-assets location.

## Review Notes
The resulting role is still Ubuntu-oriented because the repository setup uses the official Nginx Ubuntu repository. Future improvements could add Debian/RHEL branching, explicit certificate deployment, or validation on virtual host template changes before reload.
