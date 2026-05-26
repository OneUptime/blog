# Validation Summary: How to Use Ansible to Set Up Security Headers

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ansible
- Nginx
- HTTP security headers
- Content-Security-Policy
- Strict-Transport-Security
- Permissions-Policy
- Referrer-Policy

## Sources Consulted
- Nginx ngx_http_headers_module documentation: https://nginx.org/en/docs/http/ngx_http_headers_module.html
- Nginx ngx_http_v2_module documentation: https://nginx.org/en/docs/http/ngx_http_v2_module.html
- Ansible handlers documentation: https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_handlers.html
- MDN Content-Security-Policy header reference: https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Content-Security-Policy
- MDN Strict-Transport-Security header reference: https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Strict-Transport-Security
- MDN Permissions-Policy header reference: https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Permissions-Policy
- MDN X-Frame-Options header reference: https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/X-Frame-Options
- MDN X-XSS-Protection header reference: https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/X-XSS-Protection

## Issues Found
- The Nginx site template used `listen 443 ssl http2;`. Current Nginx documentation shows HTTP/2 enabled with `http2 on;`, with TLS configured separately via `listen 443 ssl;`. Updated the template to use the current syntax.
- The Ansible handler named `Validate and reload nginx` ran `nginx -t` with `changed_when: false` and then notified `Reload nginx`. Because the validation handler never reported a change, the reload handler would not run. Updated changed tasks to notify both `Validate nginx` and `Reload nginx` directly; handlers run in their defined order, so validation occurs before reload and a failed validation stops the reload.
- The post described `X-XSS-Protection` as useful legacy protection and configured `1; mode=block`. MDN marks the header deprecated and warns it can create vulnerabilities in some cases. Updated the default and comments to disable the legacy filter with `X-XSS-Protection: 0`.

## Review Notes
The CSP examples are syntactically valid, but production CSP values usually need application-specific testing. The `report-uri` directive is deprecated in CSP Level 3 but remains included in examples as a compatibility fallback; a future enhancement could add `report-to` support alongside it.
