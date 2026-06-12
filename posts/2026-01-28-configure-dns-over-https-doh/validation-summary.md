# Validation Summary: How to Configure DNS over HTTPS (DoH)

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- DNS over HTTPS (DoH) — RFC 8484
- DNS over TLS (DoT) — RFC 7858
- systemd-resolved
- cloudflared (Cloudflare's daemon)
- Node.js (https module)
- Python (requests library)
- CoreDNS (with `tls` and `forward` plugins)
- Cloudflare DNS JSON API
- Firefox enterprise policy (`policies.json`)
- Chrome/Edge DoH settings
- curl, dig, tcpdump

## Sources Consulted
- RFC 8484 — DNS Queries over HTTPS (DoH): https://datatracker.ietf.org/doc/html/rfc8484
- RFC 7858 — DNS over TLS: https://datatracker.ietf.org/doc/html/rfc7858
- systemd-resolved documentation: https://www.freedesktop.org/software/systemd/man/resolved.conf.html
- Cloudflare DoH JSON API: https://developers.cloudflare.com/1.1.1.1/encryption/dns-over-https/make-api-requests/dns-json/
- Cloudflare DoH wire format docs: https://developers.cloudflare.com/1.1.1.1/encryption/dns-over-https/make-api-requests/dns-wireformat/
- cloudflared proxy-dns docs: https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/configure-tunnels/proxy-dns/
- CoreDNS documentation: https://coredns.io/manual/toc/
- CoreDNS `tls` plugin: https://coredns.io/plugins/tls/
- CoreDNS `forward` plugin: https://coredns.io/plugins/forward/
- Firefox enterprise policies (`DNSOverHTTPS`): https://mozilla.github.io/policy-templates/

## Issues Found
- **CoreDNS Corefile syntax (invalid nested server blocks).** The original snippet wrapped a `https://.:443 { ... }` server block inside another `. { ... }` server block, which is not valid Corefile syntax. CoreDNS server blocks declare their scheme via the address (e.g. `https://. { ... }` for DoH) and cannot be nested. Rewrote the snippet so the DoH server is its own top-level block containing `tls`, `forward`, `cache`, and `log` directives. Verified against the CoreDNS docs for the `tls` and `forward` plugins.

## Review Notes
- The post correctly notes that `systemd-resolved` uses DoT (DNS over TLS), not DoH proper. The `resolved.conf` settings (`DNS=<ip>#<sni>`, `DNSOverTLS=yes`, `DNSSEC=yes`, `FallbackDNS=...`) are valid and consistent with the systemd-resolved man page.
- The base64-encoded wire-format query `q80BAAABAAAAAAAAB2V4YW1wbGUDY29tAAABAAE=` decodes to a valid RFC 1035 DNS query for `example.com` IN A (ID 0xABCD, flags 0x0100, QDCOUNT 1). Matches the format Cloudflare's wire-format docs expect when posted with `Content-Type: application/dns-message`.
- The Cloudflare JSON API usage (`Accept: application/dns-json`, `name`/`type` query params, response fields `Answer[].name/type/TTL/data`) matches Cloudflare's documented JSON API.
- The Firefox `policies.json` snippet uses the correct schema (`DNSOverHTTPS` with `Enabled`, `ProviderURL`, `Locked`). For Chrome/Edge, equivalent policies are `DnsOverHttpsMode` / `DnsOverHttpsTemplates` — the post only shows the Firefox shape, which is appropriate given the heading covers browser UIs separately, but readers deploying Chrome at scale will need the Chrome-specific keys.
- The Node.js example creates a `new URL(this.serverUrl)` from an existing URL object — this works because the URL constructor stringifies via `href`, but it's slightly redundant. Functionally correct.
- `cloudflared service install` installs the daemon as a systemd service that picks up `/etc/cloudflared/config.yml`. With `proxy-dns: true` set there, the service runs in proxy-DNS mode. Behavior is correct as described.
- Provider URLs in the "Common DoH Providers" table all match the providers' official DoH endpoints as of the review date.
