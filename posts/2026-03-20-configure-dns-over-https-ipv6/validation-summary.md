# Validation Summary: How to Configure DNS over HTTPS with IPv6

## Status
validated

## Post Type
Guide

## Technologies Covered
- DNS over HTTPS (DoH)
- IPv6
- Unbound
- NGINX
- CoreDNS
- dnsdist
- Firefox
- Certbot
- acme.sh
- kdig
- dog

## Sources Consulted
- RFC 8484: https://www.rfc-editor.org/rfc/rfc8484.html
- Unbound DoH docs: https://unbound.docs.nlnetlabs.nl/en/latest/topics/privacy/dns-over-https.html
- Unbound configuration reference: https://unbound.docs.nlnetlabs.nl/en/latest/manpages/unbound.conf.html
- Unbound upstream example config and changelog:
  https://github.com/NLnetLabs/unbound/blob/master/doc/example.conf.in
  https://github.com/NLnetLabs/unbound/blob/master/doc/Changelog
- NGINX HTTP/2 module docs: https://nginx.org/en/docs/http/ngx_http_v2_module.html
- NGINX proxy module docs: https://nginx.org/en/docs/http/ngx_http_proxy_module.html
- NGINX upstream docs: https://nginx.org/en/docs/http/ngx_http_upstream_module.html
- Certbot docs: https://eff-certbot.readthedocs.io/en/latest/man/certbot.html
- acme.sh project/help output reference: https://github.com/acmesh-official/acme.sh
- CoreDNS manual and plugins:
  https://coredns.io/manual/toc/
  https://coredns.io/plugins/tls/
  https://coredns.io/plugins/forward/
- dnsdist DoH docs:
  https://github.com/PowerDNS/pdns/blob/master/pdns/dnsdistdist/docs/reference/config.rst
  https://github.com/PowerDNS/pdns/blob/master/pdns/dnsdistdist/docs/guides/dns-over-https.rst
- Knot `kdig` docs: https://www.knot-dns.cz/docs/3.5/latex/KnotDNS.pdf
- dog docs: https://github.com/ogham/dog
- Firefox DoH source docs: https://firefox-source-docs.mozilla.org/networking/dns/dns-over-https-trr.html
- Firefox support docs: https://support.mozilla.org/en-US/kb/dns-over-https

## Issues Found
- The NGINX example proxied to Unbound with `proxy_http_version 1.1`, but current Unbound DoH support is HTTP/2-only. I changed the proxy to use upstream HTTP/2 and updated the frontend HTTP/2 syntax to the current `http2 on;` form used by NGINX.
- The Unbound example configured plain DNS on `127.0.0.1@5353`, which did not match the NGINX DoH proxy target and would not serve DoH. I changed it to a valid local DoH backend on `127.0.0.1:5380` with `https-port`, `http-endpoint`, `http-notls-downstream`, and the required TLS settings.
- The CoreDNS example was not a DoH listener at all; it was a plain DNS listener on port 5380. I replaced it with a valid native CoreDNS DoH server example using the `https://` server scheme and `tls` plugin.
- The dnsdist `addDOHLocal()` example used an outdated/incorrect argument shape for the URL path list. I updated it to the documented current form and made the IPv6 upstream address explicit with brackets and port 53.
- The `curl` test generated an invalid DNS wire message and used `echo -n` in a way that would not produce the required binary bytes. I replaced it with a valid RFC 8484-style base64url query and kept the IPv6-specific `--resolve` test.
- The `kdig` example mixed `+tls` and `+https`, which targets different encrypted DNS protocols. I corrected it to a DoH-only invocation.
- The `dog` example passed a full HTTPS URL to `--nameserver`, while the documented interface uses `--https` plus a nameserver address/name. I updated it accordingly.
- The Firefox section implied `network.trr.bootstrapAddress` was required. I marked it as optional when the DoH hostname already resolves, which matches current Mozilla guidance.
- The architecture and conclusion used the literal IPv6 URL while the certificate issuance step obtained a certificate for `dns.example.com`. I changed those references to the hostname-based DoH endpoint.

## Review Notes
- The updated NGINX upstream HTTP/2 configuration depends on a current NGINX build that supports `proxy_http_version 2` and includes `ngx_http_v2_module`.
- Let’s Encrypt now supports IP address certificates, but this post’s certificate examples still request a hostname certificate for `dns.example.com`, so the hostname form remains the correct default endpoint for this tutorial.
