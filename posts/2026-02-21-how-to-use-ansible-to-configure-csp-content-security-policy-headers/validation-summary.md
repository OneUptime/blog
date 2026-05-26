# Validation Summary: How to Use Ansible to Configure CSP (Content Security Policy) Headers

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible playbooks and built-in modules
- Content Security Policy headers and directives
- Nginx header configuration
- Apache mod_headers configuration
- Node.js HTTP server
- systemd services

## Sources Consulted
- MDN Web Docs: Content-Security-Policy header: https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Content-Security-Policy
- MDN Web Docs: default-src directive: https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Content-Security-Policy/default-src
- MDN Web Docs: frame-ancestors directive: https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Content-Security-Policy/frame-ancestors
- W3C Content Security Policy Level 3: https://www.w3.org/TR/CSP/
- Nginx ngx_http_headers_module documentation: https://nginx.org/en/docs/http/ngx_http_headers_module.html
- Apache HTTP Server mod_headers documentation: https://httpd.apache.org/docs/2.4/mod/mod_headers.html
- Ansible ansible.builtin.uri documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/uri_module.html
- Ansible ansible.builtin.copy documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/copy_module.html
- Ansible ansible.builtin.file documentation: https://docs.ansible.com/projects/ansible-core/devel/collections/ansible/builtin/file_module.html
- Ansible ansible.builtin.systemd documentation: https://docs.ansible.com/projects/ansible-core/2.13/collections/ansible/builtin/systemd_module.html

## Issues Found
- The post described `default-src` as a fallback for all resource types. Updated it to say it is the fallback for fetch directives that are not set explicitly, because directives such as `frame-ancestors` do not fall back to `default-src`.
- The CSP report collector ran as `www-data` but wrote to `/var/log/csp-reports.json` without creating a writable log file. Added an Ansible task to create the log file with `www-data` ownership while preserving timestamps on existing files.
- The CSP report collector handler only started the service, so script or unit changes could leave the old process running. Changed the handler to restart the service and wired the script deployment to notify it.
- The Apache example ignored failures from `a2enmod` and `a2enconf`, always reported changes, and did not reload Apache when the CSP config file changed. Updated the tasks to use registered command output for change detection, removed the failure suppression, and added reload notifications where needed.
- The nonce example used a `{random}` placeholder inside the CSP nonce source. Replaced it with a valid-looking nonce source and clarified that nonces should be generated per response.

## Review Notes
- The examples use `report-uri`, which is still commonly included for browser compatibility even though newer CSP reporting uses `report-to` with `Reporting-Endpoints`.
- The Nginx snippets still need to be included from the appropriate `server` or `location` block in a real deployment; the snippets themselves use valid `add_header ... always` syntax.
