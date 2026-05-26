# Validation Summary: How to Use Ansible to Configure HSTS Headers

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ansible
- HTTP Strict Transport Security (HSTS)
- Nginx
- Apache HTTP Server
- HTTP security headers

## Sources Consulted
- RFC 6797: HTTP Strict Transport Security (HSTS): https://www.ietf.org/rfc/rfc6797
- Nginx ngx_http_headers_module documentation: https://nginx.org/en/docs/http/ngx_http_headers_module.html
- Apache mod_headers documentation: https://httpd.apache.org/docs/2.4/mod/mod_headers.html
- Apache expression parser documentation: https://httpd.apache.org/docs/2.4/expr.html
- Ansible ansible.builtin.uri module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/uri_module.html
- Ansible ansible.builtin.find module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/find_module.html
- Ansible ansible.builtin.fileglob lookup documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/fileglob_lookup.html
- HSTS preload submission requirements: https://hstspreload.org/
- MDN X-XSS-Protection header reference: https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/X-XSS-Protection
- Debian a2ensite manual page: https://manpages.debian.org/bookworm/apache2/a2ensite.8.en.html

## Issues Found
- The Nginx playbook used `with_fileglob` to find `/etc/nginx/sites-enabled/*`, but Ansible fileglob lookups run on the controller, not the remote web server. Replaced this with `ansible.builtin.find` on the managed host and looped over the returned file paths.
- The Nginx playbook claimed to ensure an HTTP-to-HTTPS redirect using an unstated `nginx_redirect.conf.j2` template. Replaced the missing template reference with an inline managed redirect snippet so the example is self-contained.
- The Nginx section overgeneralized `add_header` behavior. Added a caveat that nested locations with their own `add_header` directives change inheritance.
- The Apache HSTS configuration set the HSTS header from a global Apache config without restricting it to HTTPS requests. Added an Apache expression condition so the header is only set when `%{HTTPS}` is `on`.
- The Apache redirect VirtualHost was written to `sites-available` but never enabled. Added an `a2ensite 000-redirect` task.
- The testing playbook checked `https_response.headers`, but Ansible's `uri` module returns HTTP headers as lower-case result keys. Updated the HSTS checks to use `strict_transport_security`.
- The testing playbook only printed a message about HSTS not being sent over HTTP. Replaced the debug-only task with an assertion that fails if the HTTP redirect response includes the HSTS header.
- The preload readiness check disabled certificate validation even though a valid certificate is a preload requirement. Removed `validate_certs: false` from that check.
- The preload readiness check only checked that `max-age=` existed, not that it met the one-year minimum. Added parsing and an assertion that `max-age` is at least `31536000`.
- The security headers example recommended `X-XSS-Protection: 1; mode=block`, which is deprecated and no longer recommended for production use. Removed that header from the example list.

## Review Notes
- The HSTS concepts, max-age values, `includeSubDomains` behavior, HTTPS-only processing, Nginx `add_header ... always`, Apache `Header always set`, and preload requirements are consistent with the official references after the fixes.
- The Nginx examples use Debian/Ubuntu-style paths such as `/etc/nginx/sites-enabled` and `/etc/nginx/snippets`; users on other distributions may need path adjustments.
