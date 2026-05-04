# Validation Summary: How to Configure LiteSpeed Web Server with IPv6

## Status
validated

## Post Type
Tutorial / Configuration guide

## Technologies Covered
- OpenLiteSpeed (open source LiteSpeed Web Server)
- LiteSpeed WebAdmin Console
- IPv6 networking
- TLS / Let's Encrypt
- HTTP/2, HTTP/3 (QUIC)
- LSAPI / LSPHP
- systemd

## Sources Consulted
- OpenLiteSpeed default config template — [httpd_config.conf.in on GitHub](https://github.com/litespeedtech/openlitespeed/blob/master/dist/conf/httpd_config.conf.in) (canonical syntax for `listener`, `virtualHost`, `extProcessor` blocks)
- OpenLiteSpeed test/sample config — [httpd.conf on GitHub](https://github.com/litespeedtech/openlitespeed/blob/master/test/serverroot/conf/httpd.conf)
- OpenLiteSpeed docs — [docs.openlitespeed.org/config](https://docs.openlitespeed.org/config/)
- LiteSpeed Technologies general config reference — [litespeedtech.com/docs/webserver/config/general](https://www.litespeedtech.com/docs/webserver/config/general)
- DigitalOcean install guide — [How To Install OpenLiteSpeed on Ubuntu 22.04](https://www.digitalocean.com/community/tutorials/how-to-install-the-openlitespeed-web-server-on-ubuntu-22-04) (confirms `lsws.service` on Debian/Ubuntu packaging)
- Vultr Debian 12 guide — [How to Install OpenLiteSpeed Webserver on Debian 12](https://docs.vultr.com/how-to-install-openlitespeed-webserver-on-debian-12)

## Issues Found

1. **Wrong config-file syntax (XML instead of curly braces).**
   The post wrote every config block as XML (`<listener>...</listener>`, `<extprocessor>...</extprocessor>`, `<virtualHost>...</virtualHost>`). OpenLiteSpeed's `httpd_config.conf` and per-vhost `vhconf.conf` use a curly-brace, nginx-like format (`listener Name { ... }`), confirmed against the upstream `dist/conf/httpd_config.conf.in` template. Pasting the XML form would not parse and the server would fail to start. Fixed every config block to use the correct curly-brace syntax.

2. **Bogus `<listenerVhost>` / `<vhostMap>` block.**
   The original showed a separate `<listenerVhost><vhostMap><vhost>...</vhost><domains>...</domains></vhostMap></listenerVhost>` block to bind the vhost to the listener. There is no such directive in OpenLiteSpeed. The actual mechanism is a single-line `map <vhostName> <domainList>` directive *inside* the `listener { }` block. Replaced with the correct `map yourVirtualHost yourdomain.com`.

3. **Self-referencing / impossible vhconf.conf example.**
   The "Virtual Host Configuration" section claimed the contents of `/usr/local/lsws/conf/vhosts/yourdomain/vhconf.conf` were a `<virtualHost>...</virtualHost>` block containing a `configFile` directive that pointed back to itself, plus a stray `<vhTemplate>` element. In OpenLiteSpeed, the `virtualHost name { ... configFile ... }` block lives in **`httpd_config.conf`**, and `vhconf.conf` contains the per-vhost directives directly with no outer wrapper. `vhTemplate` is a separate server-level construct, not something that goes inside a vhost file. Restructured the section to show both files correctly.

4. **Wrong systemd service name.**
   The post used `sudo systemctl enable --now lshttpd`. On the Debian/Ubuntu `openlitespeed` package the systemd unit is **`lsws.service`** (it manages a process named `lshttpd`, which is why the `ss | grep lshttpd` line further down is correct). Changed `systemctl enable --now lshttpd` to `systemctl enable --now lsws`. Left the `ss -tlnp | grep lshttpd` line unchanged because the *process* name is `lshttpd`.

5. **Made-up monitoring endpoints.**
   The "Monitoring" section curl'd `https://[2001:db8::1]:7080/ExtApp/PHP_LSAPI_CHILDREN` and `http://[::1]:7080/server-status`. Neither is a real OpenLiteSpeed endpoint — `/server-status` is an Apache concept, and `/ExtApp/PHP_LSAPI_CHILDREN` is not a URL the WebAdmin or the public server exposes. Replaced with the real real-time-report file (`/tmp/lshttpd/.rtreport`) and a pointer to the WebAdmin GUI dashboard.

6. **Missing required directives in extprocessor example.**
   The `extprocessor` block was missing `autoStart` and `path`, which are required for OpenLiteSpeed to actually launch LSPHP. Added both with the standard `path fcgi-bin/lsphp` value used by the upstream default config.

## Review Notes

- `enableSpdy 15` (SPDY 2/3 + HTTP/2 + HTTP/3) and `sslProtocol 24` (TLS 1.2 + 1.3) bitmasks are correct against current OpenLiteSpeed.
- Default WebAdmin port `7080` and the historical default credentials `admin/123456` are accurate; on recent OpenLiteSpeed installs the post-install step runs `admpass.sh` and may print/require a different password — the post's "(change immediately)" caveat covers this adequately.
- The package-add URL `https://rpms.litespeedtech.com/debian/enable_lst_debian_repo.sh` is the official LiteSpeed Debian repo enabler and is correct.
- IPv6 URL bracket syntax (`https://[2001:db8::1]:7080/`) is per RFC 3986 and correct.
- `[::]:443` listening on Linux gives dual-stack (IPv4-mapped IPv6) by default unless `IPV6_V6ONLY` is set; the post's "IPv6 Only: No (dual-stack) or Yes (IPv6-only)" WebAdmin guidance is consistent with this, even though OpenLiteSpeed exposes the option as a binding/IPv6-only checkbox rather than literally that label.
- `quicEnable` and `quicShmDir` are shown as commented hints, not active config — left as-is since the post directs users to the WebAdmin for QUIC and the directive names are plausible.
