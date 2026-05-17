# Validation Summary: How to Set Up a Captive Portal on Ubuntu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- hostapd (WiFi access point daemon)
- dnsmasq (DHCP and DNS server, used here for DNS hijacking)
- Nginx (reverse proxy)
- iptables / netfilter / iptables-persistent (firewall, NAT/DNAT, MASQUERADE)
- netplan / systemd-networkd (interface IP configuration)
- Flask (Python web framework, served behind Nginx)
- Werkzeug ProxyFix middleware
- systemd (service unit)
- sudoers / NOPASSWD privilege drop
- Ubuntu (apt, PEP 668 externally-managed environment)

## Sources Consulted
- dnsmasq man page (`address=/#/IP` wildcard DNS): https://thekelleys.org.uk/dnsmasq/docs/dnsmasq-man.html
- hostapd.conf reference (`auth_algs` bitfield): https://wireless.docs.kernel.org/en/latest/en/users/documentation/hostapd.html
- Flask "Tell Flask it is Behind a Proxy" (ProxyFix): https://flask.palletsprojects.com/en/stable/deploying/proxy_fix/
- Werkzeug ProxyFix middleware: https://werkzeug.palletsprojects.com/en/stable/middleware/proxy_fix/
- PEP 668 (externally-managed environments): https://peps.python.org/pep-0668/
- netplan YAML reference: https://netplan.readthedocs.io/en/stable/netplan-yaml/
- iptables-extensions / nat table semantics (`-j DNAT`, `-j RETURN`, conntrack only first-packet rule traversal): https://www.netfilter.org/documentation/

## Issues Found

1. **`pip3 install flask` fails on modern Ubuntu (PEP 668).** Since Ubuntu 23.04, system-wide `pip3 install` is blocked by an `EXTERNALLY-MANAGED` marker and exits with an `error: externally-managed-environment`. Replaced with `sudo apt install python3-flask -y`, which is the cleanest approach for a daemon-style service installed system-wide.

2. **Flask `request.remote_addr` returned `127.0.0.1` for every client.** Because Nginx proxies requests via `proxy_pass http://127.0.0.1:8080`, the WSGI server always sees the connection as coming from loopback. The original `allow_client(client_ip)` therefore would have only ever whitelisted `127.0.0.1`, not real wireless clients — the portal would never actually authenticate anyone. Added `werkzeug.middleware.proxy_fix.ProxyFix` so the `X-Forwarded-For` header that Nginx already sets is promoted into `request.remote_addr`. This is the fix the Flask docs recommend.

3. **DNAT in the `nat` PREROUTING chain still redirected already-authenticated clients to the portal.** The nat table runs on the first packet of every new conntrack flow, and the original `CAPTIVE_PORTAL` chain only lived in the `filter` table — so adding `-s <ip> -j ACCEPT` to the filter chain did nothing to stop DNAT. After "authenticating," users could pass the FORWARD chain but their HTTP/HTTPS traffic would still be DNAT'd back to `10.10.0.1:80/443` and they'd see the portal forever. Added a new nat-table chain `CAPTIVE_AUTH` that is jumped to *before* the DNAT rules, and updated `allow_client()` to also insert a `-j RETURN` for the client into `CAPTIVE_AUTH` so authenticated clients short-circuit out of PREROUTING. Updated the sudoers drop to permit the new command form.

4. **Misleading inline comment.** The comment `# Listen on all interfaces, port 80` above `app.run(... port=8080 ...)` contradicted the actual port. Corrected to clarify that Flask binds 8080 and Nginx proxies port 80 to it.

## Review Notes
- **netplan with `wlan0` under `ethernets:`** is technically the wrong YAML section (wifi interfaces belong under `wifis:`), but it is a widely used community workaround when hostapd owns the radio: putting it under `wifis:` would activate wpa_supplicant and conflict with hostapd. Left as-is — netplan accepts it and it produces the intended systemd-networkd file.
- **HTTPS DNAT (port 443)** is preserved because the post calls for it, but in practice intercepting TLS will produce certificate warnings in the client browser. Modern OS captive-portal detection probes (Apple `/hotspot-detect.html`, Android `/generate_204`, Microsoft NCSI) are all HTTP, so HTTPS interception is mostly cosmetic and may degrade UX. Worth a future note.
- **conntrack flushing on authentication** is not in the post. After `allow_client()` adds the RETURN rule, in-flight tracked connections will still follow their existing conntrack entries until they time out. Production setups typically run `conntrack -D -s <ip>` to force re-evaluation. Worth a future note.
- **Sudoers wildcard (`*`)** is permissive — `www-data` could pass arbitrary arguments after `-I CAPTIVE_PORTAL`. Acceptable for a tutorial; a hardened version would call iptables via a tightly scoped shell wrapper.
- **`network.target`** in the systemd unit is fine for a local service, but `network-online.target` (with `Wants=network-online.target`) is the more correct dependency for anything that needs the AP IP to be configured first.
- **Apple's `/hotspot-detect.html` probe** typically also checks the response body for the exact string `Success`; returning a 302 still triggers the captive-portal UI on iOS/macOS, so the redirect approach works in practice.
