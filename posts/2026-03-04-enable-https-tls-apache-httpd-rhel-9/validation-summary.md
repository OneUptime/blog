# Validation Summary: How to Enable HTTPS with TLS on Apache httpd in RHEL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- Apache HTTP Server httpd
- mod_ssl
- TLS certificates
- firewalld
- Certbot / Let's Encrypt
- OpenSSL

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation: Deploying web servers and reverse proxies, Configuring TLS encryption on an Apache HTTP Server: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/deploying_web_servers_and_reverse_proxies/setting-apache-http-server_deploying-web-servers-and-reverse-proxies
- Red Hat Enterprise Linux 9 documentation: Securing networks, Configuring the Apache HTTP server to use TLS: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/securing_networks/planning-and-implementing-tls_securing-networks
- Apache HTTP Server 2.4 mod_ssl documentation: https://httpd.apache.org/docs/2.4/en/mod/mod_ssl.html
- Apache HTTP Server 2.4 mod_headers documentation: https://httpd.apache.org/docs/2.4/mod/mod_headers.html
- Certbot official Apache installation instructions: https://certbot.eff.org/instructions?os=snap&tab=standard&ws=apache
- Fedora/EPEL package metadata for certbot on EPEL 9: https://packages.fedoraproject.org/pkgs/certbot/certbot/epel-9.html

## Issues Found
- The prerequisites only mentioned opening port 443. Certbot's Apache HTTP-01 flow requires the site to be reachable on port 80, and the later HTTP-to-HTTPS redirect also depends on port 80. Updated the prerequisite to mention port 80 when using Certbot's Apache challenge or the redirect.
- The Certbot install command used `dnf install certbot python3-certbot-apache` without saying those are EPEL packages. On RHEL, those packages are commonly available through EPEL, while Certbot's official instructions currently recommend snap. Updated the command comment and added a fallback note to use Certbot's current snap-based instructions if the packages are unavailable.
- The manual TLS configuration suggested `SSLCertificateChainFile`. Apache httpd 2.4.8 and later mark that directive obsolete because `SSLCertificateFile` can include intermediate certificates. Updated the comment to recommend pointing `SSLCertificateFile` at the full chain file for CA-issued certificates.

## Review Notes
- The RHEL 9 TLS protocol guidance is accurate: Red Hat documents that the DEFAULT crypto policy enables TLS 1.2 and TLS 1.3, and the shown `SSLProtocol all -SSLv3 -TLSv1 -TLSv1.1` form is consistent with Red Hat's TLS hardening example.
- The self-signed certificate command is suitable for quick testing, especially with the later `curl -kI` example. For browser trust testing, a certificate with a Subject Alternative Name would be preferable.
