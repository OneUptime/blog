# Validation Summary: How to Use Ansible to Configure Apache Virtual Hosts

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ansible playbooks, handlers, templates, filters, and modules
- Apache HTTP Server 2.4 virtual hosts
- Apache reverse proxy configuration with mod_proxy
- Apache SSL virtual hosts
- Apache response headers with mod_headers
- Apache CORS handling with mod_setenvif and mod_headers
- Apache basic authentication with htpasswd files
- Apache output bandwidth limiting with mod_ratelimit

## Sources Consulted
- Apache HTTP Server 2.4 Virtual Host documentation: https://httpd.apache.org/docs/2.4/vhosts/
- Apache HTTP Server 2.4 name-based virtual host documentation: https://httpd.apache.org/docs/2.4/vhosts/name-based.html
- Apache mod_proxy documentation: https://httpd.apache.org/docs/current/mod/mod_proxy.html
- Apache mod_headers documentation: https://httpd.apache.org/docs/2.4/mod/mod_headers.html
- Apache mod_setenvif documentation: https://httpd.apache.org/docs/2.4/mod/mod_setenvif.html
- Apache mod_ratelimit documentation: https://httpd.apache.org/docs/current/mod/mod_ratelimit.html
- MDN Access-Control-Allow-Origin reference: https://developer.mozilla.org/docs/Web/HTTP/Reference/Headers/Access-Control-Allow-Origin
- Ansible handlers documentation: https://docs.ansible.com/ansible/latest/playbook_guide/playbooks_handlers.html
- Ansible ansible.builtin.command module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/command_module.html
- Ansible ansible.builtin.uri module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/uri_module.html
- Ansible ansible.builtin.regex_escape filter documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/regex_escape_filter.html
- Ansible community.general.htpasswd module documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/general/htpasswd_module.html

## Issues Found
- The custom header example used `Cache-Control: public, max-age=3600`, which would render incorrectly because the header value contains a space and needs quoting. Changed `custom_headers` to structured `name` and `value` fields and updated the template to render `Header always set Header-Name "value"`.
- The CORS example put multiple origins into one `Access-Control-Allow-Origin` value. Browsers expect either a wildcard or the single allowed origin for the current request. Changed `cors_origins` to a list and updated the template to use `SetEnvIf Origin` plus an environment-backed `Header` directive, with `Vary: Origin`.
- `ProxyTimeout` was placed inside a `<Location>` block, but Apache documents it for server config and virtual host context. Moved it to the virtual host proxy block outside `<Location>`.
- The post described `mod_ratelimit` as rate limiting, but Apache documents it as client bandwidth limiting for response output. Renamed the option to `bandwidth_limiting` and changed the template comment accordingly.
- The playbook enabled and changed sites without notifying the Apache reload flow. Added `notify: Test and reload Apache` to the `a2ensite`, `a2dissite`, default-site copy, and default-site enable tasks.
- The original handler chain used `changed_when: false` on the config-test handler while also relying on it to notify the reload handler, which would prevent the reload from being triggered. Changed the handlers to share a `listen: Test and reload Apache` topic so the config test runs before the reload.
- The catch-all default virtual host used `ServerName _default_`, which is commonly confused with Apache's `_default_` virtual host address syntax. Changed it to `ServerName default.invalid`; the catch-all behavior comes from the first/default vhost for the address and port, not from that `ServerName` value.

## Review Notes
The local review environment did not have `apache2ctl`, `a2ensite`, or `ansible` installed, so commands could not be executed locally. The review was performed against the post content and official documentation. In a future expansion, the tutorial could mention enabling required Apache modules such as `ssl`, `rewrite`, `headers`, `proxy`, `proxy_http`, `setenvif`, and optionally `ratelimit` or WebSocket proxy support.
