# Validation Summary: How to Use Ansible to Configure Reverse Proxy with Apache

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ansible
- Apache HTTP Server 2.4
- mod_proxy
- mod_proxy_http
- mod_proxy_wstunnel
- mod_proxy_balancer
- mod_headers
- Ubuntu 22.04 Apache packaging conventions

## Sources Consulted
- Apache HTTP Server 2.4 mod_proxy documentation: https://httpd.apache.org/docs/current/mod/mod_proxy.html
- Apache HTTP Server 2.4 mod_proxy_wstunnel documentation: https://httpd.apache.org/docs/2.4/en/mod/mod_proxy_wstunnel.html
- Apache HTTP Server 2.4 mod_proxy_balancer documentation: https://httpd.apache.org/docs/2.4/en/mod/mod_proxy_balancer.html
- Apache HTTP Server 2.4 mod_headers documentation: https://httpd.apache.org/docs/current/en/mod/mod_headers.html
- Apache HTTP Server 2.4 mod_proxy_ftp documentation: https://httpd.apache.org/docs/current/mod/mod_proxy_ftp.html
- Ansible community.general.apache2_module documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/general/apache2_module_module.html
- Ansible 2.9 uri module documentation: https://docs.ansible.com/projects/ansible/2.9/modules/uri_module.html
- Ansible command module documentation: https://docs.ansible.com/ansible/6/collections/ansible/builtin/command_module.html

## Issues Found
- The description claimed the guide covered SSL termination, but the post only enabled `mod_ssl` and did not configure certificates, `SSLEngine`, HTTPS virtual hosts, or backend TLS proxying. Updated the description to say "proxy security" instead.
- The playbook used the short `apache2_module` name without mentioning the `community.general` collection. Modern `ansible-core` does not include this module, so the prerequisite list now mentions `community.general` and the task uses `community.general.apache2_module`.
- The global proxy comment said the `<Proxy *>` block denied forward proxying while the block actually grants access to configured proxy workers. Clarified the comment and kept `ProxyRequests Off` as the forward-proxy prevention setting.
- The virtual host template set `X-Forwarded-For` manually and used `%{REMOTE_ADDR}s`, which is an SSL-variable format lookup rather than the normal client address expression. Updated the template to rely on Apache's `ProxyAddHeaders On` behavior for `X-Forwarded-*` headers and set `X-Real-IP` with `expr=%{REMOTE_ADDR}`.
- The `proxy_max_connections` variable was defined but never applied. Added `ProxySet max={{ proxy_max_connections }}` to the worker configuration.
- The verification task accepted 200, 301, and 302 responses but reported anything other than 200 as `FAILED`. Updated the report expression to treat all accepted status codes as `OK`.

## Review Notes
The WebSocket examples are technically valid for Apache 2.4, but Apache 2.4.47 and later can also handle protocol upgrades through `mod_proxy_http` with the `upgrade` parameter. The existing rewrite-based example remains compatible with the documented `mod_proxy_wstunnel` approach.
