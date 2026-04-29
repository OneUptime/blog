# Validation Summary: How to Run Python Flask Apps on IPv6

## Status
validated

## Post Type
Guide

## Technologies Covered
- Python
- Flask
- Werkzeug
- Gunicorn
- Nginx
- IPv6
- HTTP/2

## Sources Consulted
- Flask API: https://flask.palletsprojects.com/en/stable/api/
- Flask deployment guidance: https://flask.palletsprojects.com/en/stable/deploying/
- Flask proxy guidance: https://flask.palletsprojects.com/en/stable/deploying/proxy_fix/
- Werkzeug serving docs: https://werkzeug.palletsprojects.com/en/stable/serving/
- Werkzeug ProxyFix docs: https://werkzeug.palletsprojects.com/en/stable/middleware/proxy_fix/
- Python `ipaddress` docs: https://docs.python.org/3/library/ipaddress.html
- Python `socket` docs: https://docs.python.org/3/library/socket.html
- Gunicorn settings: https://docs.gunicorn.org/en/stable/settings.html
- Gunicorn deployment docs: https://docs.gunicorn.org/en/latest/deploy.html
- Nginx core module docs: https://nginx.org/en/docs/http/ngx_http_core_module.html
- Nginx HTTP/2 module docs: https://nginx.org/en/docs/http/ngx_http_v2_module.html
- RFC 6883: https://datatracker.ietf.org/doc/rfc6883/
- RFC 8981: https://datatracker.ietf.org/doc/html/rfc8981.txt

## Issues Found
- The proxy-handling example trusted `X-Forwarded-For` directly. I changed it to use Werkzeug `ProxyFix` and then read `request.remote_addr`, because Flask and Werkzeug document forwarded headers as trusted only when proxy middleware is configured with the correct hop count.
- The Flask `app.run(host="::")` explanation overstated dual-stack behavior and included an incorrect "IPv6-only" example that duplicated the main call. I changed the wording to note that IPv4 acceptance is platform-dependent and kept `::1` as the loopback-only example.
- The Gunicorn example labeled `--bind "[::]:8000"` as "dual-stack binding", which is not what Gunicorn documents. I changed it to an accurate IPv6 bind example and updated the conclusion to note that Gunicorn supports multiple `--bind` options when separate IPv4 and IPv6 listeners are needed.
- The HTTPS Nginx example used deprecated `listen ... http2` syntax. I updated it to the current `http2 on;` form and added the forwarded headers that were missing from the TLS server block.
- The `/64` rate-limiting explanation overstated ownership semantics. I changed it to describe `/64` grouping as a common heuristic, which better matches current IPv6 guidance and temporary-address behavior.
- I added `or ""` fallbacks where `request.remote_addr` could otherwise be empty and cause fragile example behavior.
- I changed the validation example to store the normalized IPv6 value on `g`, which is Flask’s documented per-request storage object, instead of attaching ad-hoc state to `request`.

## Review Notes
- `http2 on;` is the current Nginx syntax, but it requires Nginx 1.25.1 or newer. Older Nginx versions still accept `listen ... http2`, though nginx documents that form as deprecated.
- Gunicorn’s documented bind examples show separate IPv4 and IPv6 listeners via multiple `--bind` values. Whether an IPv6 wildcard socket also accepts IPv4 remains platform-dependent.
- Runtime execution was not performed in this workspace because Flask and Werkzeug are not installed here; the review and corrections were documentation-based.
