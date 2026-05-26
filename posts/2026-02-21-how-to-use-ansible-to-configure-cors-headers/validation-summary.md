# Validation Summary: How to Use Ansible to Configure CORS Headers

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ansible
- Nginx
- CORS
- HTTP response headers
- curl

## Sources Consulted
- Nginx `ngx_http_headers_module` documentation: https://nginx.org/en/docs/http/ngx_http_headers_module.html
- Ansible handler documentation: https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_handlers.html
- Ansible `apt` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/apt_module.html
- Ansible `template` module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/template_module.html
- Ansible `file` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/file_module.html
- Ansible `systemd_service` / `systemd` module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/systemd_service_module.html
- MDN CORS guide: https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/CORS
- MDN `Access-Control-Allow-Credentials` documentation: https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Access-Control-Allow-Credentials
- MDN `Access-Control-Allow-Origin` documentation: https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Access-Control-Allow-Origin
- curl man page: https://curl.se/docs/manpage.html

## Issues Found
- The CORS template emitted `Access-Control-Allow-Credentials: false` when `nginx_cors_allow_credentials` was disabled. That value is not a valid credential-enabling CORS response; the header should be omitted unless the value is `true`. Updated the template to render the credentials header only when credentials are enabled.
- The defaults said `nginx_cors_allowed_origins: ["*"]` could allow all origins, but the template only performed exact string comparisons against `$http_origin`, so normal Origin values would not match `*`. Added a wildcard branch that allows all origins, using `*` when credentials are disabled and reflecting `$http_origin` when credentials are enabled to avoid the invalid `Access-Control-Allow-Origin: *` plus credentials combination.
- The Ansible handler validated Nginx with `changed_when: false` and then notified `Reload nginx`, which means the reload handler would not run. Updated the handler example to use a shared `listen` topic so validation and reload are both triggered by `Validate and reload nginx`, with validation running first.
- The disallowed-origin curl test said it should return empty CORS headers. Updated the wording to say it should return no CORS headers, which more accurately describes the intended behavior.

## Review Notes
The Ansible CLI was not installed in the local environment, so module and handler behavior were verified against current official Ansible documentation rather than by executing the playbook. The Nginx `if` usage in the snippet is limited to `set`, `add_header`, and `return` style flow and is syntactically valid for the documented directive contexts, but a future hardening pass could use `map` directives at `http` scope for larger origin lists.
