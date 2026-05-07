# Validation Summary: How to Configure Apache mod_ssl for HTTPS on a Specific IPv4 Address

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Apache HTTP Server
- Apache `mod_ssl`
- Apache `mod_headers`
- TLS / HTTPS
- OpenSSL
- Nmap
- Debian/Ubuntu Apache helper commands (`a2enmod`, `a2ensite`, `apache2ctl`)

## Sources Consulted
- Apache HTTP Server: Binding to Addresses and Ports - https://httpd.apache.org/docs/current/bind.html
- Apache HTTP Server: IP-based Virtual Host Support - https://httpd.apache.org/docs/current/vhosts/ip-based.html
- Apache HTTP Server: `mod_ssl` reference - https://httpd.apache.org/docs/2.4/en/mod/mod_ssl.html
- Apache HTTP Server: `mod_headers` reference - https://httpd.apache.org/docs/2.4/mod/mod_headers.html
- Apache HTTP Server: `apachectl` program docs - https://httpd.apache.org/docs/current/en/programs/apachectl.html
- Debian Manpages: `a2ensite(8)` - https://manpages.debian.org/bookworm/apache2/a2ensite.8.en.html
- Debian Manpages: `apache2ctl(8)` - https://manpages.debian.org/testing/apache2/apache2ctl.8.en.html
- OpenSSL `req` documentation - https://docs.openssl.org/3.6/man1/openssl-req/
- RFC 6125: Service Identity in TLS - https://www.rfc-editor.org/rfc/rfc6125
- Nmap NSE script docs: `ssl-enum-ciphers` - https://nmap.org/nsedoc/scripts/ssl-enum-ciphers.html

## Issues Found
- The post originally implied that `<VirtualHost 192.168.1.10:443>` by itself restricts HTTPS to that IPv4 address. Apache uses `Listen` directives to decide which addresses and ports to bind, so I added the required `ports.conf` `Listen 192.168.1.10:80` and `Listen 192.168.1.10:443` entries and clarified that wildcard `Listen` lines must be replaced.
- The prerequisites enabled Debian's `default-ssl` site, which is unnecessary for this setup and works against the article's goal of restricting HTTPS to one address. I removed that step.
- The OpenSSL example used `-nodes`, which is deprecated in OpenSSL 3.x. I replaced it with `-noenc`.
- The self-signed certificate example only set the Common Name. I added `subjectAltName = DNS:mysite.example.com` so the certificate matches the hostname correctly in modern TLS clients.
- The article used `apachectl configtest` while the rest of the post used Debian/Ubuntu-specific tooling. I changed this to `apache2ctl configtest` for consistency with the documented platform and updated the takeaway accordingly.
- The article enabled two sites with one `a2ensite` command. I split that into separate `a2ensite` commands to match the documented Debian helper usage more clearly.
- The `SSLHonorCipherOrder` comment was too broad for a TLS 1.2/1.3 configuration. I clarified that it applies to TLS 1.2 and earlier.
- The `openssl s_client` note said it checks supported TLS versions. A single `s_client` invocation verifies the negotiated connection details, not the full server version matrix, so I corrected that wording.

## Review Notes
- TLS 1.3 availability depends on the Apache/OpenSSL build in use; the `SSLProtocol -all +TLSv1.2 +TLSv1.3` directive assumes TLS 1.3 support is present.
- `Header always set Strict-Transport-Security "max-age=31536000; includeSubDomains"` is technically correct here, but `includeSubDomains` should only be used if every subdomain is intended to be HTTPS-only.
- `nmap --script ssl-enum-ciphers` is appropriate for cipher and protocol auditing, but exact output can vary by Nmap version and script support.
