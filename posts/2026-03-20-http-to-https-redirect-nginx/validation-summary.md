# Validation Summary: How to Set Up HTTP to HTTPS Redirection on Nginx

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Nginx
- HTTPS / TLS
- HTTP redirects
- HTTP Strict Transport Security (HSTS)
- ACME HTTP-01 / Let's Encrypt
- curl

## Sources Consulted
- Nginx request processing documentation: https://nginx.org/en/docs/http/request_processing.html
- Nginx server names documentation: https://nginx.org/en/docs/http/server_names.html
- Nginx core module embedded variables documentation: https://nginx.org/en/docs/http/ngx_http_core_module.html#variables
- Nginx headers module documentation (`add_header`): https://nginx.org/en/docs/http/ngx_http_headers_module.html#add_header
- Nginx command-line parameters: https://nginx.org/en/docs/switches.html
- Nginx Beginner’s Guide: https://nginx.org/en/docs/beginners_guide.html
- RFC 8555, Automatic Certificate Management Environment (ACME): https://www.rfc-editor.org/rfc/rfc8555.html
- RFC 6797, HTTP Strict Transport Security (HSTS): https://www.rfc-editor.org/rfc/rfc6797.html
- curl CLI help output: `curl --help all`

## Issues Found
- The catch-all section said the block had to be placed before HTTPS server blocks so Nginx would apply it first. I changed this to explain that `default_server`, not declaration order, controls default server selection for a given listen address and port.
- The inline comment above `server_name _;` said it "matches any server name." I changed it to explain that `_` is only a placeholder name and that `default_server` is what handles unmatched hosts.
- The HSTS section and conclusion overstated browser behavior by implying HSTS guarantees browsers will never use HTTP. I changed the wording to clarify that HSTS takes effect after a browser has received the header over HTTPS.

## Review Notes
- The redirect examples are syntactically valid for current Nginx configuration syntax.
- `curl -I -L http://example.com` is a valid way to inspect the redirect chain using headers only and followed redirects.
- The ACME exclusion example is consistent with HTTP-01 validation using `/.well-known/acme-challenge/`.
- The HSTS example includes `includeSubDomains`; this should only be enabled if every subdomain is intended to be HTTPS-only.
