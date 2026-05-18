# Validation Summary: How to Set Up Varnish Cache in Front of Nginx on Ubuntu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Varnish Cache 7.5
- Nginx (reverse proxy + SSL termination)
- VCL 4.1 (Varnish Configuration Language)
- Ubuntu 22.04 / 24.04
- systemd (service overrides)
- PHP-FPM (fastcgi backend example)
- Let's Encrypt (SSL certificates)
- PROXY protocol

## Sources Consulted
- Official Varnish Cache builtin.vcl on GitHub: https://github.com/varnishcache/varnish-cache/blob/master/bin/varnishd/builtin.vcl (confirmed `+` operator usage for string/type concatenation in VCL 4.1)
- Packagecloud Varnish 7.5 repository: https://packagecloud.io/varnishcache/varnish75 (confirmed repository exists with the documented URL structure)
- Varnish Cache documentation site: https://varnish-cache.org/docs/
- General knowledge of VCL 4.1 syntax, varnishd CLI flags, varnishstat/varnishadm/varnishlog usage, and Nginx configuration directives

## Issues Found
No technical issues found.

The VCL syntax (backend probe, `vcl_recv`, `vcl_backend_response`, `vcl_deliver`), the `varnishd` CLI flags (`-a`, `-f`, `-s malloc,256m`, `-T`, PROXY listener), systemd `ExecStart=` override pattern, Nginx server blocks (backend on `127.0.0.1:8080`, SSL frontend proxying to `127.0.0.1:6081`), and the `varnishstat -1 -f` monitoring pipeline are all valid and consistent with current Varnish 7.x behavior.

The packagecloud install pattern (`gpgkey` endpoint, `deb [signed-by=...]` repository line, `$(lsb_release -cs)` for the distribution codename) matches the standard documented installation flow.

The `+` operator for string concatenation in VCL (including auto-conversion of `INT` / `IP` types to strings, as in `req.http.X-Forwarded-For + ", " + client.ip` and `obj.hits`) is officially supported — the upstream `builtin.vcl` itself uses the same pattern (`resp.status + " " + resp.reason`).

## Review Notes
- **Varnish version**: The post pins to the `varnish75` repository. Varnish 7.5 was released in March 2024; by mid-2026 newer minor releases (7.7+) exist. The installation steps and VCL 4.1 syntax remain compatible, so this is not an error — just a note that readers may prefer pinning to a newer LTS-style release if available.
- **`import std;`**: Imported but not actually used in the sample VCL. Harmless, just unnecessary.
- **X-Forwarded-For pollution**: When Nginx terminates SSL and proxies to Varnish over `127.0.0.1:6081`, `client.ip` inside Varnish is the loopback address. Appending it to the existing `X-Forwarded-For` will leave `<real-client>, 127.0.0.1` reaching the backend. This is the standard upstream pattern and works for backends that take the leftmost address, but readers running stricter backends may prefer to skip the append when the request already has a trusted XFF header.
- **PROXY protocol listener unused**: The `varnishd` startup defines `-a localhost:8443,PROXY`, but the Nginx SSL frontend `proxy_pass`es to the plain HTTP listener on `:6081`. The PROXY listener is harmless but not wired into the documented flow; readers wanting true client IPs end-to-end could switch to it (and to Nginx's `proxy_protocol on;` semantics) in a future iteration.
- **`apt-transport-https`**: Transitional package on Ubuntu 22.04+ (apt already speaks HTTPS), but installing it is still supported and does no harm.
- **`listen 443 ssl http2;`**: Older one-line form. Still valid; Nginx 1.25+ recommends the separate `http2 on;` directive, but the legacy form is not deprecated in a breaking way.
